from __future__ import annotations

import math
from datetime import datetime
from statistics import median
from typing import Iterable

import pandas as pd

from chatsense_ml.features.relationship_dynamics import relationship_dynamics
from chatsense_ml.forecasting.contract import (
    FORECASTING_CALIBRATION_BINS,
    FORECASTING_CONTRACT_VERSION,
    FORECASTING_DELAY_BUCKETS,
    FORECASTING_MIN_CONTEXT_SAMPLES,
    FORECASTING_MIN_PARTICIPANT_SAMPLES,
    FORECASTING_PROBABILITY_CLIP,
    FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS,
    FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT,
    FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES,
    FORECASTING_PROMOTION_REPLY_MAX_CALIBRATION_ERROR,
    FORECASTING_PROMOTION_REPLY_MIN_BRIER_IMPROVEMENT_PCT,
    FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT,
    FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
    FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE,
    FORECASTING_PROMOTION_REPLY_MIN_POSITIVE,
    FORECASTING_RECENT_WINDOW_SIZE,
    FORECASTING_SAFETY_WORDING,
    FORECASTING_SMOOTHING_ALPHA,
    FORECASTING_SMOOTHING_BETA,
    FORECASTING_WARM_UP_REPLY_OPPORTUNITIES,
    FORECASTING_WARM_UP_WINDOWS,
    REPLY_HORIZONS_MINUTES,
)


def evaluate_forecasting_research(df: pd.DataFrame) -> dict:
    clean = df.sort_values("timestamp", kind="stable").reset_index(drop=True)
    dynamics = relationship_dynamics(clean)
    participants = _participants(clean)
    opportunities = build_reply_opportunities(dynamics["turns"], participants)
    completed_windows = [window for window in dynamics["adaptive_windows"] if window["eligible"] and not window["partial"]]

    return {
        "contract_version": FORECASTING_CONTRACT_VERSION,
        "status": "not_validated",
        "summary": {
            "product_promotion": False,
            "reasons": [
                FORECASTING_SAFETY_WORDING["not_validated"],
                "Stage 5 validates backtesting mechanics and conservative gates; it does not establish general predictive validity.",
                FORECASTING_SAFETY_WORDING["no_motive"],
            ],
            "reply_opportunity_count": len(opportunities),
            "observed_reply_count": sum(1 for opportunity in opportunities if opportunity["delay_minutes"] is not None),
            "completed_activity_window_count": len(completed_windows),
        },
        "opportunities": {
            "reply": {
                "total": len(opportunities),
                "observed_responses": sum(1 for opportunity in opportunities if opportunity["delay_minutes"] is not None),
                "final_open_turns": sum(1 for opportunity in opportunities if opportunity["open_at_export_end"]),
                "group_approximation": len(participants) > 2,
            }
        },
        "tasks": {
            "reply_within_horizon": {
                str(horizon): evaluate_reply_within_horizon(opportunities, horizon)
                for horizon in REPLY_HORIZONS_MINUTES
            },
            "conditional_reply_delay_bucket": evaluate_conditional_reply_delay_bucket(opportunities),
            "next_window_activity": evaluate_next_window_activity(completed_windows),
            "initiation_reconnection": {
                "promoted": False,
                "state": "not_applicable",
                "method_gate_passed": False,
                "reasons": [
                    "Initiation and reconnection forecasting were audited but not implemented for Stage 5 promotion.",
                    "Sample sizes and independent observations are likely insufficient in single exports.",
                ],
            },
        },
        "safety": FORECASTING_SAFETY_WORDING,
    }


def build_reply_opportunities(turns: list[dict], participants: list[str]) -> list[dict]:
    if not turns:
        return []
    group_approximation = len(participants) > 2
    export_end = turns[-1]["end"]
    result = []

    for index, source in enumerate(turns):
        response = next((candidate for candidate in turns[index + 1 :] if candidate["sender"] != source["sender"]), None)
        expected = next((sender for sender in participants if sender != source["sender"]), None) if len(participants) == 2 else None
        prediction_time = source["end"]
        result.append(
            {
                "id": f"turn-{source['id']}",
                "source_turn_id": source["id"],
                "source_sender": source["sender"],
                "expected_responder": expected,
                "observed_responder": response["sender"] if response else None,
                "prediction_time": prediction_time,
                "observed_response_time": response["start"] if response else None,
                "delay_minutes": _round(_diff_minutes(prediction_time, response["start"]), 3) if response else None,
                "censor_time": response["start"] if response else export_end,
                "open_at_export_end": response is None,
                "group_approximation": group_approximation,
                "starts_thread": source["starts_thread"],
                "source_turn_message_count": source["message_count"],
                "source_turn_word_count": source["word_count"],
            }
        )
    return result


def outcome_for_horizon(opportunity: dict, horizon_minutes: int) -> dict:
    if opportunity["delay_minutes"] is not None:
        return {
            "eligible": True,
            "censored": False,
            "outcome": opportunity["delay_minutes"] <= horizon_minutes,
            "reason": None,
        }
    coverage = _diff_minutes(opportunity["prediction_time"], opportunity["censor_time"])
    if coverage < horizon_minutes:
        return {
            "eligible": False,
            "censored": True,
            "outcome": None,
            "reason": "export ended before the full horizon elapsed",
        }
    return {"eligible": True, "censored": False, "outcome": False, "reason": None}


def evaluate_reply_within_horizon(opportunities: list[dict], horizon_minutes: int) -> dict:
    prior: list[dict] = []
    predictions = {"global": [], "participant": [], "recent": [], "candidate": []}
    eligible_count = 0
    censored_count = 0

    for opportunity in opportunities:
        outcome = outcome_for_horizon(opportunity, horizon_minutes)
        if outcome["censored"]:
            censored_count += 1
            continue
        if not outcome["eligible"] or outcome["outcome"] is None:
            continue
        eligible_count += 1
        if len(prior) >= FORECASTING_WARM_UP_REPLY_OPPORTUNITIES:
            probabilities = _binary_probabilities(prior, opportunity)
            context = _participant_key(opportunity)
            for key, probability in probabilities.items():
                predictions[key].append(
                    {"outcome": outcome["outcome"], "probability": probability, "participant_context": context}
                )
        prior.append({"opportunity": opportunity, "outcome": outcome["outcome"]})

    metrics = {key: _binary_metrics(value) for key, value in predictions.items()}
    best_baseline = _min_defined(
        [metrics["global"]["brier_score"], metrics["participant"]["brier_score"], metrics["recent"]["brier_score"]]
    )
    improvement = (
        _round(((best_baseline - metrics["candidate"]["brier_score"]) / best_baseline) * 100, 1)
        if best_baseline and metrics["candidate"]["brier_score"] is not None
        else None
    )

    return {
        "horizon_minutes": horizon_minutes,
        "eligible_count": eligible_count,
        "censored_count": censored_count,
        "metrics": metrics,
        "candidate_improvement_over_best_baseline_pct": improvement,
        "promotion": assess_reply_horizon_promotion(
            {
                "evaluated_count": metrics["candidate"]["evaluated_count"],
                "positive_count": metrics["candidate"]["positive_count"],
                "negative_count": metrics["candidate"]["negative_count"],
                "candidate_brier": metrics["candidate"]["brier_score"],
                "best_baseline_brier": best_baseline,
                "calibration_error": metrics["candidate"]["calibration_error"],
                "participant_minimum_evaluated_count": _participant_minimum_evaluation_count(predictions["candidate"]),
                "general_validity_established": False,
            }
        ),
    }


def evaluate_conditional_reply_delay_bucket(opportunities: list[dict]) -> dict:
    observed = [opportunity for opportunity in opportunities if opportunity["delay_minutes"] is not None]
    prior: list[dict] = []
    predictions = {"global": [], "participant": [], "recent": [], "candidate": []}

    for opportunity in observed:
        bucket = _bucket_for_delay(opportunity["delay_minutes"])
        if len(prior) >= FORECASTING_WARM_UP_REPLY_OPPORTUNITIES:
            distributions = _delay_distributions(prior, opportunity)
            for key, distribution in distributions.items():
                predictions[key].append({"bucket": bucket, "distribution": distribution})
        prior.append({"opportunity": opportunity, "bucket": bucket})

    baselines = {key: _multiclass_metrics(value) for key, value in predictions.items()}
    support = _class_support([_bucket_for_delay(opportunity["delay_minutes"]) for opportunity in observed])
    meaningful_support = sum(1 for count in support.values() if count >= 3) >= 2
    candidate_beats = _candidate_beats_delay_baselines(baselines)
    method_gate_passed = (
        len(observed) >= FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES and meaningful_support and candidate_beats
    )
    reasons = []
    if len(observed) < FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES:
        reasons.append(
            f"Requires {FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES} observed responses; found {len(observed)}."
        )
    if not meaningful_support:
        reasons.append("Delay bucket support is too concentrated for product validation.")
    if not candidate_beats:
        reasons.append("The transparent candidate did not beat all delay-bucket baselines on both log loss and macro F1.")
    reasons.append(FORECASTING_SAFETY_WORDING["synthetic_limit"])
    return {
        "observed_response_count": len(observed),
        "evaluated_count": len(predictions["candidate"]),
        "class_support": support,
        "baselines": baselines,
        "promotion": {
            "promoted": False,
            "state": "passed_method_gate" if method_gate_passed else "failed_gate",
            "method_gate_passed": method_gate_passed,
            "reasons": reasons,
        },
    }


def evaluate_next_window_activity(windows: list[dict]) -> dict:
    values = [window["message_count"] / max(window["active_days"], 1) for window in windows]
    predictions = {"previous": [], "historical_mean": [], "rolling_mean": [], "candidate": []}

    for index in range(FORECASTING_WARM_UP_WINDOWS, len(values)):
        prior = values[:index]
        actual = values[index]
        previous = prior[-1]
        historical_mean = _average(prior)
        rolling_mean = _average(prior[-FORECASTING_WARM_UP_WINDOWS:])
        trend = prior[-1] - prior[-2] if len(prior) >= 2 else 0
        candidate = max(0, rolling_mean + trend * 0.5)
        predictions["previous"].append({"actual": actual, "predicted": previous})
        predictions["historical_mean"].append({"actual": actual, "predicted": historical_mean})
        predictions["rolling_mean"].append({"actual": actual, "predicted": rolling_mean})
        predictions["candidate"].append({"actual": actual, "predicted": candidate})

    baselines = {key: _regression_metrics(value) for key, value in predictions.items()}
    best_baseline = _min_defined(
        [baselines["previous"]["mae"], baselines["historical_mean"]["mae"], baselines["rolling_mean"]["mae"]]
    )
    improvement = (
        _round(((best_baseline - baselines["candidate"]["mae"]) / best_baseline) * 100, 1)
        if best_baseline and baselines["candidate"]["mae"] is not None
        else None
    )
    method_gate_passed = (
        len(predictions["candidate"]) >= FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS
        and improvement is not None
        and improvement >= FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT
    )
    reasons = []
    if len(predictions["candidate"]) < FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS:
        reasons.append(
            f"Requires {FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS} completed target windows; found {len(predictions['candidate'])}."
        )
    if improvement is None or improvement < FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT:
        reasons.append("The activity candidate did not clear the MAE improvement gate.")
    reasons.append(FORECASTING_SAFETY_WORDING["synthetic_limit"])
    return {
        "completed_window_count": len(windows),
        "evaluated_count": len(predictions["candidate"]),
        "baselines": baselines,
        "candidate_improvement_over_best_baseline_pct": improvement,
        "promotion": {
            "promoted": False,
            "state": "passed_method_gate" if method_gate_passed else "failed_gate",
            "method_gate_passed": method_gate_passed,
            "reasons": reasons,
        },
    }


def assess_reply_horizon_promotion(input_data: dict) -> dict:
    participant_minimum = input_data.get(
        "participant_minimum_evaluated_count", FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT
    )
    improvement = (
        ((input_data["best_baseline_brier"] - input_data["candidate_brier"]) / input_data["best_baseline_brier"]) * 100
        if input_data.get("best_baseline_brier") and input_data.get("candidate_brier") is not None
        else None
    )
    reasons = []
    if input_data["evaluated_count"] < FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL:
        reasons.append(
            f"Requires {FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL} evaluated opportunities; found {input_data['evaluated_count']}."
        )
    if participant_minimum < FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT:
        reasons.append(
            f"Requires {FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT} evaluated opportunities for displayed participant groups; found {participant_minimum}."
        )
    if input_data["positive_count"] < FORECASTING_PROMOTION_REPLY_MIN_POSITIVE:
        reasons.append(f"Requires {FORECASTING_PROMOTION_REPLY_MIN_POSITIVE} positive examples; found {input_data['positive_count']}.")
    if input_data["negative_count"] < FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE:
        reasons.append(f"Requires {FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE} negative examples; found {input_data['negative_count']}.")
    if improvement is None or improvement < FORECASTING_PROMOTION_REPLY_MIN_BRIER_IMPROVEMENT_PCT:
        reasons.append("The candidate did not clear the Brier improvement gate over the best baseline.")
    if input_data.get("calibration_error") is None or input_data["calibration_error"] > FORECASTING_PROMOTION_REPLY_MAX_CALIBRATION_ERROR:
        reasons.append("The candidate did not clear the calibration error gate.")

    method_gate_passed = not reasons
    if not input_data.get("general_validity_established", False):
        reasons.append(FORECASTING_SAFETY_WORDING["synthetic_limit"])
    return {
        "promoted": method_gate_passed and bool(input_data.get("general_validity_established", False)),
        "state": "passed_method_gate" if method_gate_passed else "failed_gate",
        "method_gate_passed": method_gate_passed,
        "reasons": reasons,
    }


def _binary_probabilities(prior: list[dict], opportunity: dict) -> dict:
    global_rate = _smoothed_binary_rate(prior)
    participant_examples = [
        example for example in prior if _participant_key(example["opportunity"]) == _participant_key(opportunity)
    ]
    recent_examples = prior[-FORECASTING_RECENT_WINDOW_SIZE:]
    context_examples = [
        example
        for example in prior
        if _participant_key(example["opportunity"]) == _participant_key(opportunity)
        and _time_bucket(example["opportunity"]["prediction_time"]) == _time_bucket(opportunity["prediction_time"])
    ]
    thread_examples = [
        example for example in prior if example["opportunity"]["starts_thread"] == opportunity["starts_thread"]
    ]
    participant = (
        _smoothed_binary_rate(participant_examples)
        if len(participant_examples) >= FORECASTING_MIN_PARTICIPANT_SAMPLES
        else global_rate
    )
    recent = _smoothed_binary_rate(recent_examples) if recent_examples else global_rate
    context = _smoothed_binary_rate(context_examples) if len(context_examples) >= FORECASTING_MIN_CONTEXT_SAMPLES else participant
    thread = _smoothed_binary_rate(thread_examples) if len(thread_examples) >= FORECASTING_MIN_CONTEXT_SAMPLES else global_rate
    candidate = _clamp_probability((global_rate + participant * 2 + recent + context * 2 + thread) / 7)
    return {
        "global": _clamp_probability(global_rate),
        "participant": _clamp_probability(participant),
        "recent": _clamp_probability(recent),
        "candidate": candidate,
    }


def _delay_distributions(prior: list[dict], opportunity: dict) -> dict:
    global_distribution = _smoothed_bucket_distribution(prior)
    participant_examples = [
        example for example in prior if _participant_key(example["opportunity"]) == _participant_key(opportunity)
    ]
    recent_examples = prior[-FORECASTING_RECENT_WINDOW_SIZE:]
    context_examples = [
        example
        for example in prior
        if _participant_key(example["opportunity"]) == _participant_key(opportunity)
        and _time_bucket(example["opportunity"]["prediction_time"]) == _time_bucket(opportunity["prediction_time"])
    ]
    participant = (
        _smoothed_bucket_distribution(participant_examples)
        if len(participant_examples) >= FORECASTING_MIN_PARTICIPANT_SAMPLES
        else global_distribution
    )
    recent = _smoothed_bucket_distribution(recent_examples) if recent_examples else global_distribution
    context = _smoothed_bucket_distribution(context_examples) if len(context_examples) >= FORECASTING_MIN_CONTEXT_SAMPLES else participant
    return {
        "global": global_distribution,
        "participant": participant,
        "recent": recent,
        "candidate": _average_distributions([global_distribution, participant, participant, recent, context, context]),
    }


def _binary_metrics(predictions: list[dict]) -> dict:
    if not predictions:
        return {
            "evaluated_count": 0,
            "positive_count": 0,
            "negative_count": 0,
            "brier_score": None,
            "log_loss": None,
            "calibration_error": None,
            "accuracy": None,
        }
    positives = sum(1 for prediction in predictions if prediction["outcome"])
    brier = _average([(prediction["probability"] - (1 if prediction["outcome"] else 0)) ** 2 for prediction in predictions])
    log_loss = _average(
        [
            -math.log(_clamp_probability(prediction["probability"]))
            if prediction["outcome"]
            else -math.log(1 - _clamp_probability(prediction["probability"]))
            for prediction in predictions
        ]
    )
    accuracy = _average([1 if (prediction["probability"] >= 0.5) == prediction["outcome"] else 0 for prediction in predictions])
    return {
        "evaluated_count": len(predictions),
        "positive_count": positives,
        "negative_count": len(predictions) - positives,
        "brier_score": _round(brier, 4),
        "log_loss": _round(log_loss, 4),
        "calibration_error": _round(_calibration_error(predictions), 4),
        "accuracy": _round(accuracy, 4),
    }


def _multiclass_metrics(predictions: list[dict]) -> dict:
    if not predictions:
        return {"accuracy": None, "macro_f1": None, "log_loss": None}
    labels = [bucket["label"] for bucket in FORECASTING_DELAY_BUCKETS]
    predicted = [_max_probability_label(prediction["distribution"]) for prediction in predictions]
    accuracy = _average([1 if predicted[index] == prediction["bucket"] else 0 for index, prediction in enumerate(predictions)])
    f1_scores = []
    for label in labels:
        tp = sum(1 for index, prediction in enumerate(predictions) if prediction["bucket"] == label and predicted[index] == label)
        fp = sum(1 for index, prediction in enumerate(predictions) if prediction["bucket"] != label and predicted[index] == label)
        fn = sum(1 for index, prediction in enumerate(predictions) if prediction["bucket"] == label and predicted[index] != label)
        if tp + fp + fn == 0:
            f1_scores.append(0)
            continue
        precision = 0 if tp + fp == 0 else tp / (tp + fp)
        recall = 0 if tp + fn == 0 else tp / (tp + fn)
        f1_scores.append(0 if precision + recall == 0 else (2 * precision * recall) / (precision + recall))
    log_loss = _average([-math.log(_clamp_probability(prediction["distribution"].get(prediction["bucket"], 0))) for prediction in predictions])
    return {"accuracy": _round(accuracy, 4), "macro_f1": _round(_average(f1_scores), 4), "log_loss": _round(log_loss, 4)}


def _regression_metrics(predictions: list[dict]) -> dict:
    if not predictions:
        return {"mae": None, "median_absolute_error": None, "rmse": None}
    errors = [abs(prediction["predicted"] - prediction["actual"]) for prediction in predictions]
    squared = [(prediction["predicted"] - prediction["actual"]) ** 2 for prediction in predictions]
    return {"mae": _round(_average(errors), 4), "median_absolute_error": _round(median(errors), 4), "rmse": _round(math.sqrt(_average(squared)), 4)}


def _candidate_beats_delay_baselines(baselines: dict) -> bool:
    candidate = baselines["candidate"]
    if candidate["log_loss"] is None or candidate["macro_f1"] is None:
        return False
    for key in ("global", "participant", "recent"):
        baseline = baselines[key]
        if baseline["log_loss"] is not None and candidate["log_loss"] >= baseline["log_loss"]:
            return False
        if baseline["macro_f1"] is not None and candidate["macro_f1"] <= baseline["macro_f1"]:
            return False
    return True


def _participant_minimum_evaluation_count(predictions: list[dict]) -> int:
    if not predictions:
        return 0
    counts: dict[str, int] = {}
    for prediction in predictions:
        context = prediction["participant_context"]
        counts[context] = counts.get(context, 0) + 1
    return min(counts.values())


def _calibration_error(predictions: list[dict]) -> float:
    bins = [[] for _ in range(FORECASTING_CALIBRATION_BINS)]
    for prediction in predictions:
        index = min(FORECASTING_CALIBRATION_BINS - 1, int(_clamp_probability(prediction["probability"]) * FORECASTING_CALIBRATION_BINS))
        bins[index].append(prediction)
    total = 0.0
    for bin_predictions in bins:
        if not bin_predictions:
            continue
        predicted = _average([prediction["probability"] for prediction in bin_predictions])
        observed = _average([1 if prediction["outcome"] else 0 for prediction in bin_predictions])
        total += (len(bin_predictions) / len(predictions)) * abs(predicted - observed)
    return total


def _smoothed_binary_rate(examples: list[dict]) -> float:
    positives = sum(1 for example in examples if example["outcome"])
    return (positives + FORECASTING_SMOOTHING_ALPHA) / (
        len(examples) + FORECASTING_SMOOTHING_ALPHA + FORECASTING_SMOOTHING_BETA
    )


def _smoothed_bucket_distribution(examples: list[dict]) -> dict:
    labels = [bucket["label"] for bucket in FORECASTING_DELAY_BUCKETS]
    denominator = len(examples) + len(labels) * FORECASTING_SMOOTHING_ALPHA
    return {
        label: (sum(1 for example in examples if example["bucket"] == label) + FORECASTING_SMOOTHING_ALPHA) / denominator
        for label in labels
    }


def _average_distributions(distributions: list[dict]) -> dict:
    labels = [bucket["label"] for bucket in FORECASTING_DELAY_BUCKETS]
    raw = {label: _average([distribution.get(label, 0) for distribution in distributions]) for label in labels}
    total = sum(raw.values())
    return {label: (1 / len(labels) if total == 0 else raw[label] / total) for label in labels}


def _bucket_for_delay(delay_minutes: float) -> str:
    for bucket in FORECASTING_DELAY_BUCKETS:
        if delay_minutes < bucket["min_minutes"]:
            continue
        if bucket["max_minutes"] is None:
            return bucket["label"]
        if bucket["max_inclusive"]:
            in_bucket = delay_minutes <= bucket["max_minutes"]
        else:
            in_bucket = delay_minutes < bucket["max_minutes"]
        if in_bucket:
            return bucket["label"]
    return "over_24h"


def _class_support(labels: Iterable[str]) -> dict:
    label_list = list(labels)
    return {bucket["label"]: label_list.count(bucket["label"]) for bucket in FORECASTING_DELAY_BUCKETS}


def _max_probability_label(distribution: dict) -> str:
    labels = [bucket["label"] for bucket in FORECASTING_DELAY_BUCKETS]
    return max(labels, key=lambda label: distribution.get(label, 0))


def _participant_key(opportunity: dict) -> str:
    return opportunity["expected_responder"] or opportunity["observed_responder"] or opportunity["source_sender"]


def _participants(df: pd.DataFrame) -> list[str]:
    seen = set()
    result = []
    for sender in df["sender"].astype(str):
        if sender not in seen:
            seen.add(sender)
            result.append(sender)
    return result


def _time_bucket(value: str) -> str:
    hour = datetime.fromisoformat(value).hour
    if hour < 6:
        return "night"
    if hour < 12:
        return "morning"
    if hour < 18:
        return "afternoon"
    return "evening"


def _diff_minutes(start_iso: str, end_iso: str) -> float:
    return max(0.0, (datetime.fromisoformat(end_iso) - datetime.fromisoformat(start_iso)).total_seconds() / 60)


def _clamp_probability(value: float) -> float:
    return min(1 - FORECASTING_PROBABILITY_CLIP, max(FORECASTING_PROBABILITY_CLIP, value))


def _average(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0


def _min_defined(values: list[float | None]) -> float | None:
    defined = [value for value in values if value is not None]
    return min(defined) if defined else None


def _round(value: float, digits: int = 0):
    return round(value, digits)
