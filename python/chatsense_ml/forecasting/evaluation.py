from __future__ import annotations

import math
from datetime import datetime
from statistics import median
from typing import Iterable

import pandas as pd

from chatsense_ml.features.relationship_dynamics import relationship_dynamics
from chatsense_ml.forecasting.contract import (
    FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL,
    FORECASTING_BOOTSTRAP_RESAMPLE_COUNT,
    FORECASTING_BOOTSTRAP_SEED,
    FORECASTING_BOOTSTRAP_STRONGLY_INFERIOR_MARGIN,
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
    FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
    FORECASTING_SUBGROUP_MIN_EVALUATED,
    FORECASTING_WARM_UP_REPLY_OPPORTUNITIES,
    FORECASTING_WARM_UP_WINDOWS,
    REPLY_HORIZONS_MINUTES,
)


def evaluate_forecasting_research(df: pd.DataFrame, dataset_kind: str = "private_exports", dataset_identity: str | None = None) -> dict:
    clean = df.sort_values("timestamp", kind="stable").reset_index(drop=True)
    dynamics = relationship_dynamics(clean)
    participants = _participants(clean)
    opportunities = build_reply_opportunities(dynamics["turns"], participants)
    completed_windows = [window for window in dynamics["adaptive_windows"] if window["eligible"] and not window["partial"]]
    validation_evidence = _build_external_validation_evidence(dataset_kind, dataset_identity, len(opportunities))

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
        "validation_evidence": validation_evidence,
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
                str(horizon): evaluate_reply_within_horizon(opportunities, horizon, validation_evidence)
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
        response = None
        superseding_turn = None
        for candidate in turns[index + 1 :]:
            if candidate["sender"] != source["sender"]:
                response = candidate
                break
            if candidate["starts_thread"]:
                superseding_turn = candidate
                break
        expected = next((sender for sender in participants if sender != source["sender"]), None) if len(participants) == 2 else None
        prediction_time = source["end"]
        termination = (
            "observed_response"
            if response
            else "superseded_by_new_source_thread"
            if superseding_turn
            else "export_end"
        )
        censor_time = response["start"] if response else superseding_turn["start"] if superseding_turn else export_end
        result.append(
            {
                "id": f"turn-{source['id']}",
                "conversation_index": 0,
                "source_turn_index": index,
                "source_turn_id": source["id"],
                "source_sender": source["sender"],
                "expected_responder": expected,
                "observed_responder": response["sender"] if response else None,
                "prediction_time": prediction_time,
                "observed_response_time": response["start"] if response else None,
                "delay_minutes": _round(_diff_minutes(prediction_time, response["start"]), 3) if response else None,
                "censor_time": censor_time,
                "censored": termination != "observed_response",
                "open_at_export_end": termination == "export_end",
                "termination": termination,
                "superseding_turn_id": superseding_turn["id"] if superseding_turn else None,
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
        reason = (
            "source sender started a new thread before the full horizon elapsed"
            if opportunity["termination"] == "superseded_by_new_source_thread"
            else "export ended before the full horizon elapsed"
        )
        return {
            "eligible": False,
            "censored": True,
            "outcome": None,
            "reason": reason,
        }
    return {"eligible": True, "censored": False, "outcome": False, "reason": None}


def evaluate_reply_within_horizon(
    opportunities: list[dict], horizon_minutes: int, validation_evidence: dict | None = None
) -> dict:
    if validation_evidence is None:
        validation_evidence = _build_external_validation_evidence("private_exports", None, len(opportunities))
    prior: list[dict] = []
    predictions = {"global": [], "participant": [], "recent": [], "time_context": [], "candidate": []}
    prediction_records = []
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
            prediction_records.append(
                {
                    "opportunity_id": opportunity["id"],
                    "participant_context": context,
                    "prediction_time": opportunity["prediction_time"],
                    "outcome": outcome["outcome"],
                    "probabilities": probabilities,
                }
            )
        prior.append({"opportunity": opportunity, "outcome": outcome["outcome"]})

    metrics = {key: _binary_metrics(value) for key, value in predictions.items()}
    best_baseline_key = _best_binary_baseline_key(metrics)
    best_baseline = metrics[best_baseline_key]["brier_score"] if best_baseline_key else None
    improvement = (
        _round(((best_baseline - metrics["candidate"]["brier_score"]) / best_baseline) * 100, 1)
        if best_baseline and metrics["candidate"]["brier_score"] is not None
        else None
    )
    candidate_relative = _candidate_brier_improvements(metrics)
    metrics["candidate"]["relative_brier_improvement_pct"] = improvement
    bootstrap = _bootstrap_brier_improvement(prediction_records, best_baseline_key)
    subgroup_checks = _subgroup_brier_checks(prediction_records, best_baseline_key)
    horizon_evidence = {
        **validation_evidence,
        "evaluated_opportunity_count": metrics["candidate"]["evaluated_count"],
        "bootstrap_completed": bootstrap["unavailable_reason"] is None,
        "subgroup_checks_completed": any(check["eligible"] for check in subgroup_checks),
    }

    return {
        "horizon_minutes": horizon_minutes,
        "eligible_count": eligible_count,
        "censored_count": censored_count,
        "metrics": metrics,
        "prediction_records": prediction_records,
        "candidate_relative_brier_improvement_pct": candidate_relative,
        "best_baseline_key": best_baseline_key,
        "candidate_improvement_over_best_baseline_pct": improvement,
        "bootstrap": bootstrap,
        "subgroup_checks": subgroup_checks,
        "promotion": assess_reply_horizon_promotion(
            {
                "evaluated_count": metrics["candidate"]["evaluated_count"],
                "positive_count": metrics["candidate"]["positive_count"],
                "negative_count": metrics["candidate"]["negative_count"],
                "candidate_brier": metrics["candidate"]["brier_score"],
                "best_baseline_brier": best_baseline,
                "calibration_error": metrics["candidate"]["calibration_error"],
                "participant_minimum_evaluated_count": _participant_minimum_evaluation_count(predictions["candidate"]),
                "bootstrap": bootstrap,
                "subgroup_checks": subgroup_checks,
                "validation_evidence": horizon_evidence,
            }
        ),
    }


def evaluate_conditional_reply_delay_bucket(opportunities: list[dict]) -> dict:
    observed = [opportunity for opportunity in opportunities if opportunity["delay_minutes"] is not None]
    prior: list[dict] = []
    predictions = {"global": [], "participant": [], "recent": [], "time_context": [], "candidate": []}
    prediction_records = []

    for opportunity in observed:
        bucket = _bucket_for_delay(opportunity["delay_minutes"])
        if len(prior) >= FORECASTING_WARM_UP_REPLY_OPPORTUNITIES:
            distributions = _delay_distributions(prior, opportunity)
            for key, distribution in distributions.items():
                predictions[key].append({"bucket": bucket, "distribution": distribution})
            prediction_records.append(
                {
                    "opportunity_id": opportunity["id"],
                    "participant_context": _participant_key(opportunity),
                    "prediction_time": opportunity["prediction_time"],
                    "bucket": bucket,
                    "distributions": distributions,
                }
            )
        prior.append({"opportunity": opportunity, "bucket": bucket})

    baselines = {key: _multiclass_metrics(value) for key, value in predictions.items()}
    support = _class_support([_bucket_for_delay(opportunity["delay_minutes"]) for opportunity in observed])
    best_baseline_key = _best_delay_baseline_key(baselines)
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
        "prediction_records": prediction_records,
        "best_baseline_key": best_baseline_key,
        "insufficient_support": not meaningful_support,
        "promotion": {
            "promoted": False,
            "state": "passed_method_gate" if method_gate_passed else "failed_gate",
            "method_gate_passed": method_gate_passed,
            "reasons": reasons,
        },
    }


def evaluate_next_window_activity(windows: list[dict]) -> dict:
    values = [window["message_count"] / max(window["active_days"], 1) for window in windows]
    predictions = {"previous": [], "historical_mean": [], "rolling_mean": [], "ewma": [], "candidate": []}
    prediction_records = []

    for index in range(FORECASTING_WARM_UP_WINDOWS, len(values)):
        prior = values[:index]
        actual = values[index]
        previous = prior[-1]
        historical_mean = _average(prior)
        rolling_mean = _average(prior[-FORECASTING_WARM_UP_WINDOWS:])
        ewma = _exponentially_weighted_mean(prior)
        trend = prior[-1] - prior[-2] if len(prior) >= 2 else 0
        candidate = max(0, rolling_mean + trend * 0.5)
        predictions["previous"].append({"actual": actual, "predicted": previous})
        predictions["historical_mean"].append({"actual": actual, "predicted": historical_mean})
        predictions["rolling_mean"].append({"actual": actual, "predicted": rolling_mean})
        predictions["ewma"].append({"actual": actual, "predicted": ewma})
        predictions["candidate"].append({"actual": actual, "predicted": candidate})
        row_predictions = {
            "previous": previous,
            "historical_mean": historical_mean,
            "rolling_mean": rolling_mean,
            "ewma": ewma,
            "candidate": candidate,
        }
        prediction_records.append(
            {
                "window_index": windows[index]["index"],
                "prediction_time": windows[index - 1]["end"],
                "target_window_start": windows[index]["start"],
                "target_window_end": windows[index]["end"],
                "actual": actual,
                "predictions": row_predictions,
                "absolute_errors": {
                    key: _round(abs(predicted - actual), 4) for key, predicted in row_predictions.items()
                },
            }
        )

    baselines = {key: _regression_metrics(value) for key, value in predictions.items()}
    best_baseline_key = _best_activity_baseline_key(baselines)
    best_baseline = baselines[best_baseline_key]["mae"] if best_baseline_key else None
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
        "prediction_records": prediction_records,
        "best_baseline_key": best_baseline_key,
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
    if input_data["bootstrap"]["unavailable_reason"] is not None:
        reasons.append(f"Bootstrap comparison unavailable: {input_data['bootstrap']['unavailable_reason']}")
    elif input_data["bootstrap"]["strongly_inferior"]:
        reasons.append("Bootstrap evidence indicates the candidate may be strongly inferior to the best baseline.")
    catastrophic = [
        check for check in input_data["subgroup_checks"] if check["eligible"] and check["catastrophic_failure"]
    ]
    if catastrophic:
        reasons.append(f"Catastrophic subgroup degradation detected in {len(catastrophic)} subgroup/time-slice check(s).")

    method_gate_passed = not reasons
    if not input_data["validation_evidence"]["real_world_validation_eligible"]:
        reasons.append(FORECASTING_SAFETY_WORDING["synthetic_limit"])
    return {
        "promoted": method_gate_passed and input_data["validation_evidence"]["real_world_validation_eligible"],
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
        and _day_kind(example["opportunity"]["prediction_time"]) == _day_kind(opportunity["prediction_time"])
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
    time_context = _smoothed_binary_rate(context_examples) if len(context_examples) >= FORECASTING_MIN_CONTEXT_SAMPLES else participant
    thread = _smoothed_binary_rate(thread_examples) if len(thread_examples) >= FORECASTING_MIN_CONTEXT_SAMPLES else global_rate
    candidate = _clamp_probability((global_rate + participant * 2 + recent + time_context * 2 + thread) / 7)
    return {
        "global": _clamp_probability(global_rate),
        "participant": _clamp_probability(participant),
        "recent": _clamp_probability(recent),
        "time_context": _clamp_probability(time_context),
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
        and _day_kind(example["opportunity"]["prediction_time"]) == _day_kind(opportunity["prediction_time"])
        and _time_bucket(example["opportunity"]["prediction_time"]) == _time_bucket(opportunity["prediction_time"])
    ]
    participant = (
        _smoothed_bucket_distribution(participant_examples)
        if len(participant_examples) >= FORECASTING_MIN_PARTICIPANT_SAMPLES
        else global_distribution
    )
    recent = _smoothed_bucket_distribution(recent_examples) if recent_examples else global_distribution
    time_context = _smoothed_bucket_distribution(context_examples) if len(context_examples) >= FORECASTING_MIN_CONTEXT_SAMPLES else participant
    return {
        "global": global_distribution,
        "participant": participant,
        "recent": recent,
        "time_context": time_context,
        "candidate": _average_distributions([global_distribution, participant, participant, recent, time_context, time_context]),
    }


def _binary_metrics(predictions: list[dict]) -> dict:
    empty_bins = _calibration_bins([])
    if not predictions:
        return {
            "evaluated_count": 0,
            "positive_count": 0,
            "negative_count": 0,
            "brier_score": None,
            "log_loss": None,
            "calibration_error": None,
            "calibration_bins": empty_bins,
            "non_empty_calibration_bins": 0,
            "accuracy": None,
            "precision": None,
            "recall": None,
            "relative_brier_improvement_pct": None,
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
    predicted_positive = [prediction for prediction in predictions if prediction["probability"] >= 0.5]
    true_positive = sum(1 for prediction in predicted_positive if prediction["outcome"])
    false_negative = sum(1 for prediction in predictions if prediction["outcome"] and prediction["probability"] < 0.5)
    precision = None if not predicted_positive else true_positive / len(predicted_positive)
    recall = None if true_positive + false_negative == 0 else true_positive / (true_positive + false_negative)
    bins = _calibration_bins(predictions)
    return {
        "evaluated_count": len(predictions),
        "positive_count": positives,
        "negative_count": len(predictions) - positives,
        "brier_score": _round(brier, 4),
        "log_loss": _round(log_loss, 4),
        "calibration_error": _round(_calibration_error_from_bins(bins, len(predictions)), 4),
        "calibration_bins": bins,
        "non_empty_calibration_bins": sum(1 for bin_data in bins if bin_data["count"] > 0),
        "accuracy": _round(accuracy, 4),
        "precision": None if precision is None else _round(precision, 4),
        "recall": None if recall is None else _round(recall, 4),
        "relative_brier_improvement_pct": None,
    }


def _multiclass_metrics(predictions: list[dict]) -> dict:
    labels = [bucket["label"] for bucket in FORECASTING_DELAY_BUCKETS]
    if not predictions:
        return {
            "evaluated_count": 0,
            "accuracy": None,
            "balanced_accuracy": None,
            "macro_f1": None,
            "log_loss": None,
            "confusion_matrix": _empty_confusion_matrix(labels),
            "per_class": {label: {"support": 0, "precision": None, "recall": None, "f1": None} for label in labels},
            "class_support": {label: 0 for label in labels},
        }
    predicted = [_max_probability_label(prediction["distribution"]) for prediction in predictions]
    accuracy = _average([1 if predicted[index] == prediction["bucket"] else 0 for index, prediction in enumerate(predictions)])
    matrix = _empty_confusion_matrix(labels)
    for index, prediction in enumerate(predictions):
        matrix[prediction["bucket"]][predicted[index]] += 1
    per_class = {}
    for label in labels:
        tp = sum(1 for index, prediction in enumerate(predictions) if prediction["bucket"] == label and predicted[index] == label)
        fp = sum(1 for index, prediction in enumerate(predictions) if prediction["bucket"] != label and predicted[index] == label)
        fn = sum(1 for index, prediction in enumerate(predictions) if prediction["bucket"] == label and predicted[index] != label)
        support = tp + fn
        precision = None if tp + fp == 0 else tp / (tp + fp)
        recall = None if support == 0 else tp / support
        f1 = None if precision is None or recall is None or precision + recall == 0 else (2 * precision * recall) / (precision + recall)
        per_class[label] = {
            "support": support,
            "precision": None if precision is None else _round(precision, 4),
            "recall": None if recall is None else _round(recall, 4),
            "f1": None if f1 is None else _round(f1, 4),
        }
    log_loss = _average([-math.log(_clamp_probability(prediction["distribution"].get(prediction["bucket"], 0))) for prediction in predictions])
    recalls = [metric["recall"] for metric in per_class.values() if metric["recall"] is not None]
    f1_scores = [metric["f1"] for metric in per_class.values() if metric["f1"] is not None]
    return {
        "evaluated_count": len(predictions),
        "accuracy": _round(accuracy, 4),
        "balanced_accuracy": None if not recalls else _round(_average(recalls), 4),
        "macro_f1": None if not f1_scores else _round(_average(f1_scores), 4),
        "log_loss": _round(log_loss, 4),
        "confusion_matrix": matrix,
        "per_class": per_class,
        "class_support": {label: per_class[label]["support"] for label in labels},
    }


def _regression_metrics(predictions: list[dict]) -> dict:
    if not predictions:
        return {"evaluated_count": 0, "mae": None, "median_absolute_error": None, "rmse": None, "safe_mape": None}
    errors = [abs(prediction["predicted"] - prediction["actual"]) for prediction in predictions]
    squared = [(prediction["predicted"] - prediction["actual"]) ** 2 for prediction in predictions]
    percentage_errors = [
        abs((prediction["predicted"] - prediction["actual"]) / prediction["actual"])
        for prediction in predictions
        if prediction["actual"] != 0
    ]
    return {
        "evaluated_count": len(predictions),
        "mae": _round(_average(errors), 4),
        "median_absolute_error": _round(median(errors), 4),
        "rmse": _round(math.sqrt(_average(squared)), 4),
        "safe_mape": None if not percentage_errors else _round(_average(percentage_errors), 4),
    }


def _candidate_beats_delay_baselines(baselines: dict) -> bool:
    candidate = baselines["candidate"]
    if candidate["log_loss"] is None or candidate["macro_f1"] is None:
        return False
    for key in ("global", "participant", "recent", "time_context"):
        baseline = baselines[key]
        if baseline["log_loss"] is not None and candidate["log_loss"] >= baseline["log_loss"]:
            return False
        if baseline["macro_f1"] is not None and candidate["macro_f1"] <= baseline["macro_f1"]:
            return False
    return True


def _best_binary_baseline_key(metrics: dict) -> str | None:
    return _min_metric_key(
        {
            "global": metrics["global"]["brier_score"],
            "participant": metrics["participant"]["brier_score"],
            "recent": metrics["recent"]["brier_score"],
            "time_context": metrics["time_context"]["brier_score"],
        }
    )


def _best_delay_baseline_key(metrics: dict) -> str | None:
    return _min_metric_key(
        {
            "global": metrics["global"]["log_loss"],
            "participant": metrics["participant"]["log_loss"],
            "recent": metrics["recent"]["log_loss"],
            "time_context": metrics["time_context"]["log_loss"],
        }
    )


def _best_activity_baseline_key(metrics: dict) -> str | None:
    return _min_metric_key(
        {
            "previous": metrics["previous"]["mae"],
            "historical_mean": metrics["historical_mean"]["mae"],
            "rolling_mean": metrics["rolling_mean"]["mae"],
            "ewma": metrics["ewma"]["mae"],
        }
    )


def _min_metric_key(values: dict[str, float | None]) -> str | None:
    defined = [(key, value) for key, value in values.items() if value is not None]
    if not defined:
        return None
    return min(defined, key=lambda item: item[1])[0]


def _candidate_brier_improvements(metrics: dict) -> dict:
    return {
        "global": _relative_improvement(metrics["global"]["brier_score"], metrics["candidate"]["brier_score"]),
        "participant": _relative_improvement(metrics["participant"]["brier_score"], metrics["candidate"]["brier_score"]),
        "recent": _relative_improvement(metrics["recent"]["brier_score"], metrics["candidate"]["brier_score"]),
        "time_context": _relative_improvement(metrics["time_context"]["brier_score"], metrics["candidate"]["brier_score"]),
    }


def _relative_improvement(baseline: float | None, candidate: float | None) -> float | None:
    if baseline is None or baseline <= 0 or candidate is None:
        return None
    return _round(((baseline - candidate) / baseline) * 100, 1)


def _bootstrap_brier_improvement(records: list[dict], baseline_key: str | None) -> dict:
    base = {
        "seed": FORECASTING_BOOTSTRAP_SEED,
        "resample_count": FORECASTING_BOOTSTRAP_RESAMPLE_COUNT,
        "confidence_level": FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL,
    }
    if not baseline_key or not records:
        return {
            **base,
            "point_estimate": None,
            "lower_bound": None,
            "upper_bound": None,
            "strongly_inferior": False,
            "unavailable_reason": "no evaluated predictions with an applicable baseline",
        }
    improvements = []
    for record in records:
        actual = 1 if record["outcome"] else 0
        baseline_error = (record["probabilities"][baseline_key] - actual) ** 2
        candidate_error = (record["probabilities"]["candidate"] - actual) ** 2
        improvements.append(baseline_error - candidate_error)
    point = _average(improvements)
    random = _seeded_random(FORECASTING_BOOTSTRAP_SEED)
    samples = []
    for _ in range(FORECASTING_BOOTSTRAP_RESAMPLE_COUNT):
        total = 0.0
        for _draw in range(len(improvements)):
            total += improvements[int(random() * len(improvements))]
        samples.append(total / len(improvements))
    samples.sort()
    tail = (1 - FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL) / 2
    lower = _quantile_sorted(samples, tail)
    upper = _quantile_sorted(samples, 1 - tail)
    return {
        **base,
        "point_estimate": _round(point, 4),
        "lower_bound": _round(lower, 4),
        "upper_bound": _round(upper, 4),
        "strongly_inferior": upper < -FORECASTING_BOOTSTRAP_STRONGLY_INFERIOR_MARGIN,
        "unavailable_reason": None,
    }


def _subgroup_brier_checks(records: list[dict], baseline_key: str | None) -> list[dict]:
    if not baseline_key:
        return [
            {
                "subgroup": "all:no_applicable_baseline",
                "sample_count": len(records),
                "candidate_score": None,
                "best_baseline_score": None,
                "degradation": None,
                "eligible": False,
                "catastrophic_failure": False,
            }
        ]
    groups: dict[str, list[dict]] = {}
    for index, record in enumerate(records):
        group_names = [
            f"responder:{record['participant_context']}",
            f"period:{'early' if index < len(records) / 2 else 'late'}",
            f"day:{_day_kind(record['prediction_time'])}",
            f"time:{_time_bucket(record['prediction_time'])}",
        ]
        for name in group_names:
            groups.setdefault(name, []).append(record)
    return [
        _subgroup_brier_check(name, group_records, baseline_key)
        for name, group_records in sorted(groups.items(), key=lambda item: item[0])
    ]


def _subgroup_brier_check(subgroup: str, records: list[dict], baseline_key: str) -> dict:
    if len(records) < FORECASTING_SUBGROUP_MIN_EVALUATED:
        return {
            "subgroup": subgroup,
            "sample_count": len(records),
            "candidate_score": None,
            "best_baseline_score": None,
            "degradation": None,
            "eligible": False,
            "catastrophic_failure": False,
        }
    candidate_score = _brier_from_records(records, "candidate")
    baseline_score = _brier_from_records(records, baseline_key)
    degradation = candidate_score - baseline_score
    return {
        "subgroup": subgroup,
        "sample_count": len(records),
        "candidate_score": _round(candidate_score, 4),
        "best_baseline_score": _round(baseline_score, 4),
        "degradation": _round(degradation, 4),
        "eligible": True,
        "catastrophic_failure": degradation > FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
    }


def _brier_from_records(records: list[dict], key: str) -> float:
    return _average(
        [
            (record["probabilities"][key] - (1 if record["outcome"] else 0)) ** 2
            for record in records
        ]
    )


def _empty_confusion_matrix(labels: list[str]) -> dict:
    return {actual: {predicted: 0 for predicted in labels} for actual in labels}


def _build_external_validation_evidence(dataset_kind: str, dataset_identity: str | None, opportunity_count: int) -> dict:
    return {
        "dataset_kind": dataset_kind,
        "conversation_count": 1,
        "independent_conversation_count": 1 if dataset_kind == "research_dataset" else 0,
        "evaluated_opportunity_count": opportunity_count,
        "provenance": dataset_identity or ("committed synthetic fixture" if dataset_kind == "synthetic" else "local export"),
        "bootstrap_completed": False,
        "subgroup_checks_completed": False,
        "real_world_validation_eligible": False,
    }


def assert_no_forecasting_leakage(records: list[dict]) -> None:
    for record in records:
        if datetime.fromisoformat(record["feature_time"]) > datetime.fromisoformat(record["prediction_time"]):
            raise AssertionError(
                f"Forecasting leakage detected: {record['feature_time']} is after {record['prediction_time']}"
            )


def _participant_minimum_evaluation_count(predictions: list[dict]) -> int:
    if not predictions:
        return 0
    counts: dict[str, int] = {}
    for prediction in predictions:
        context = prediction["participant_context"]
        counts[context] = counts.get(context, 0) + 1
    return min(counts.values())


def _calibration_bins(predictions: list[dict]) -> list[dict]:
    bins = [[] for _ in range(FORECASTING_CALIBRATION_BINS)]
    for prediction in predictions:
        index = min(FORECASTING_CALIBRATION_BINS - 1, int(_clamp_probability(prediction["probability"]) * FORECASTING_CALIBRATION_BINS))
        bins[index].append(prediction)
    result = []
    for index, bin_predictions in enumerate(bins):
        result.append(
            {
                "lower_bound": index / FORECASTING_CALIBRATION_BINS,
                "upper_bound": (index + 1) / FORECASTING_CALIBRATION_BINS,
                "mean_predicted": None
                if not bin_predictions
                else _round(_average([prediction["probability"] for prediction in bin_predictions]), 4),
                "observed_rate": None
                if not bin_predictions
                else _round(_average([1 if prediction["outcome"] else 0 for prediction in bin_predictions]), 4),
                "count": len(bin_predictions),
            }
        )
    return result


def _calibration_error_from_bins(bins: list[dict], prediction_count: int) -> float:
    if prediction_count == 0:
        return 0.0
    total = 0.0
    for bin_data in bins:
        if bin_data["count"] == 0 or bin_data["mean_predicted"] is None or bin_data["observed_rate"] is None:
            continue
        total += (bin_data["count"] / prediction_count) * abs(bin_data["mean_predicted"] - bin_data["observed_rate"])
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


def _day_kind(value: str) -> str:
    return "weekend" if datetime.fromisoformat(value).weekday() >= 5 else "weekday"


def _exponentially_weighted_mean(values: list[float]) -> float:
    if not values:
        return 0
    alpha = 0.5
    estimate = values[0]
    for value in values[1:]:
        estimate = alpha * value + (1 - alpha) * estimate
    return estimate


def _seeded_random(seed: int):
    state = seed & 0xFFFFFFFF

    def random() -> float:
        nonlocal state
        state = (1664525 * state + 1013904223) & 0xFFFFFFFF
        return state / 2**32

    return random


def _quantile_sorted(values: list[float], quantile: float) -> float:
    if not values:
        return 0
    position = min(len(values) - 1, max(0, quantile * (len(values) - 1)))
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return values[lower]
    weight = position - lower
    return values[lower] * (1 - weight) + values[upper] * weight


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
    factor = 10**digits
    return math.floor(value * factor + 0.5) / factor
