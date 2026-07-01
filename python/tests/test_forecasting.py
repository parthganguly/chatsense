from __future__ import annotations

import json
from pathlib import Path

import pytest

from chatsense_ml.features.relationship_dynamics import relationship_dynamics
from chatsense_ml.forecasting.contract import (
    FORECASTING_BOOTSTRAP_SEED,
    FORECASTING_CONTRACT_VERSION,
    FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
    FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
    REPLY_HORIZONS_MINUTES,
    forecasting_contract_path,
)
from chatsense_ml.forecasting.evaluation import (
    assert_no_forecasting_leakage,
    assess_reply_horizon_promotion,
    build_reply_opportunities,
    evaluate_conditional_reply_delay_bucket,
    evaluate_forecasting_research,
    evaluate_next_window_activity,
    evaluate_reply_within_horizon,
    outcome_for_horizon,
)
from chatsense_ml.forecasting.parity import normalized_forecasting_parity_from_text
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.pipeline import build_core_features_frame

ROOT = Path(__file__).resolve().parents[2]
FORECASTING_DIR = ROOT / "fixtures" / "forecasting"
REQUIRED_CASES = [
    "response_exactly_60m",
    "response_just_after_60m",
    "response_exactly_6h",
    "response_just_after_6h",
    "response_exactly_24h",
    "response_just_after_24h",
    "export_ends_before_1h",
    "export_ends_after_1h_before_24h",
    "final_open_turn",
    "same_sender_followup_before_response",
    "same_sender_new_thread_before_response",
    "sparse_participant_history",
    "changing_reply_regime",
    "stable_periodic_communication",
    "sudden_activity_decline",
    "partial_target_window_excluded",
    "leakage_trap_future_aggregates",
    "chronological_regime_shift_random_split_trap",
    "synthetic_candidate_fails_method_gate",
    "synthetic_candidate_passes_method_gate_product_blocked",
    "group_chat_approximate_unsupported",
]


def frame_from_text(text: str):
    return build_core_features_frame(parse_text(text, "forecasting-test.txt"))


def test_forecasting_fixture_manifest():
    manifest = json.loads((FORECASTING_DIR / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["required_cases"] == REQUIRED_CASES
    for case_id in REQUIRED_CASES:
        assert case_id in manifest["cases"]
        case = manifest["cases"][case_id]
        assert case.get("fixture") or case.get("generator")
        assert "expected_opportunity_count" in case
        assert "expected_censoring_state" in case
        assert "expected_boundary_outcome" in case
        assert "expected_gate_behavior" in case
    assert len(list(FORECASTING_DIR.glob("*.txt"))) >= 10


def test_forecasting_contract_loader_matches_json():
    contract = json.loads(forecasting_contract_path().read_text(encoding="utf-8"))

    assert FORECASTING_CONTRACT_VERSION == contract["contract_version"]
    assert list(REPLY_HORIZONS_MINUTES) == contract["tasks"]["reply_within_horizon"]["horizons_minutes"]
    assert (
        FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL
        == contract["promotion_gates"]["reply_horizon"]["min_evaluated_overall"]
    )
    assert FORECASTING_BOOTSTRAP_SEED == contract["evaluation"]["bootstrap"]["seed"]
    assert (
        FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION
        == contract["evaluation"]["subgroup_checks"]["catastrophic_brier_degradation"]
    )


def test_reply_opportunities_terminate_on_same_sender_new_thread():
    frame = frame_from_text(
        "\n".join(
            [
                "01/01/2026, 09:00 - Asha: old source",
                "01/01/2026, 16:00 - Asha: new source thread",
                "01/01/2026, 16:10 - Ravi: response to new source",
            ]
        )
    )
    opportunities = build_reply_opportunities(relationship_dynamics(frame)["turns"], ["Asha", "Ravi"])

    assert opportunities[0]["termination"] == "superseded_by_new_source_thread"
    assert opportunities[0]["observed_responder"] is None
    assert opportunities[0]["superseding_turn_id"] == opportunities[1]["source_turn_id"]
    assert outcome_for_horizon(opportunities[0], 1440)["censored"] is True
    assert outcome_for_horizon(opportunities[1], 60)["outcome"] is True


def test_same_sender_followup_stays_inside_one_turn():
    frame = frame_from_text(
        "\n".join(
            [
                "01/01/2026, 09:00 - Asha: first",
                "01/01/2026, 09:05 - Asha: same sender follow up",
                "01/01/2026, 09:20 - Ravi: response",
            ]
        )
    )
    dynamics = relationship_dynamics(frame)
    opportunities = build_reply_opportunities(dynamics["turns"], ["Asha", "Ravi"])

    assert len(dynamics["turns"]) == 2
    assert opportunities[0]["source_turn_message_count"] == 2
    assert opportunities[0]["termination"] == "observed_response"
    assert opportunities[0]["delay_minutes"] == 15


def test_horizon_boundary_outcomes():
    assert outcome_for_horizon(make_opportunity(delay_minutes=60), 60)["outcome"] is True
    assert outcome_for_horizon(make_opportunity(delay_minutes=60.001), 60)["outcome"] is False
    assert outcome_for_horizon(make_opportunity(delay_minutes=360), 360)["outcome"] is True
    assert outcome_for_horizon(make_opportunity(delay_minutes=360.001), 360)["outcome"] is False
    assert outcome_for_horizon(make_opportunity(delay_minutes=1440), 1440)["outcome"] is True
    assert outcome_for_horizon(make_opportunity(delay_minutes=1440.001), 1440)["outcome"] is False


def test_export_end_censoring():
    one_hour_covered = make_opportunity(
        delay_minutes=None,
        prediction_time="2026-01-01T09:00:00.000Z",
        censor_time="2026-01-01T10:30:00.000Z",
        termination="export_end",
    )
    assert outcome_for_horizon(one_hour_covered, 60)["outcome"] is False
    assert outcome_for_horizon(one_hour_covered, 1440)["censored"] is True

    superseded = make_opportunity(
        delay_minutes=None,
        prediction_time="2026-01-01T09:00:00.000Z",
        censor_time="2026-01-01T09:30:00.000Z",
        termination="superseded_by_new_source_thread",
    )
    assert outcome_for_horizon(superseded, 60) == {
        "eligible": False,
        "censored": True,
        "outcome": None,
        "reason": "source sender started a new thread before the full horizon elapsed",
    }


def test_reply_metrics_include_time_context_calibration_and_subgroups():
    opportunities = [
        make_opportunity(
            id=f"op-{index}",
            prediction_time=f"2026-01-{index + 1:02d}T09:00:00+00:00",
            delay_minutes=120 if index % 3 == 0 else 20,
            source_sender="Asha" if index % 2 == 0 else "Ravi",
            expected_responder="Ravi" if index % 2 == 0 else "Asha",
        )
        for index in range(16)
    ]
    result = evaluate_reply_within_horizon(opportunities, 60, synthetic_evidence(len(opportunities)))
    assert "time_context" in result["metrics"]
    assert len(result["metrics"]["candidate"]["calibration_bins"]) == 5
    assert result["metrics"]["candidate"]["non_empty_calibration_bins"] == sum(
        1 for bin_data in result["metrics"]["candidate"]["calibration_bins"] if bin_data["count"] > 0
    )
    assert "precision" in result["metrics"]["candidate"]
    assert "recall" in result["metrics"]["candidate"]
    assert result["bootstrap"]["seed"] == FORECASTING_BOOTSTRAP_SEED
    assert any(check["subgroup"].startswith("period:") for check in result["subgroup_checks"])


def test_delay_bucket_metrics_include_confusion_and_support():
    delays = [10, 20, 40, 90, 120, 180, 400, 500, 800, 1500, 1600, 1700]
    result = evaluate_conditional_reply_delay_bucket(
        [
            make_opportunity(id=f"delay-{index}", delay_minutes=delay, prediction_time=f"2026-02-{index + 1:02d}T09:00:00+00:00")
            for index, delay in enumerate(delays)
        ]
    )
    assert "time_context" in result["baselines"]
    assert "under_1h" in result["baselines"]["candidate"]["confusion_matrix"]
    assert "over_24h" in result["baselines"]["candidate"]["per_class"]
    assert result["baselines"]["candidate"]["evaluated_count"] == len(result["prediction_records"])
    assert isinstance(result["insufficient_support"], bool)


def test_activity_metrics_include_ewma_and_per_window_errors():
    windows = [
        {
            "index": index,
            "start": f"2026-03-{index + 1:02d}T00:00:00+00:00",
            "end": f"2026-03-{index + 1:02d}T23:59:00+00:00",
            "partial": False,
            "eligible": True,
            "message_count": 20 if index < 4 else 6,
            "active_days": 1,
            "turn_count": 2,
            "thread_count": 1,
            "reconnection_count": 0,
            "participants": [],
        }
        for index in range(8)
    ]
    result = evaluate_next_window_activity(windows)
    assert "ewma" in result["baselines"]
    assert result["baselines"]["candidate"]["evaluated_count"] == len(result["prediction_records"])
    assert "safe_mape" in result["baselines"]["candidate"]
    assert result["prediction_records"][0]["absolute_errors"]["ewma"] >= 0


def test_promotion_gate_separates_method_from_product_promotion():
    method_pass = assess_reply_horizon_promotion(
        {
            "evaluated_count": 100,
            "positive_count": 50,
            "negative_count": 50,
            "candidate_brier": 0.18,
            "best_baseline_brier": 0.2,
            "calibration_error": 0.05,
            "participant_minimum_evaluated_count": 40,
            "bootstrap": passing_bootstrap(),
            "subgroup_checks": [passing_subgroup()],
            "validation_evidence": synthetic_evidence(100),
        }
    )
    assert method_pass["method_gate_passed"] is True
    assert method_pass["promoted"] is False
    assert "Synthetic fixtures" in "\n".join(method_pass["reasons"])

    subgroup_fail = assess_reply_horizon_promotion(
        {
            "evaluated_count": 100,
            "positive_count": 50,
            "negative_count": 50,
            "candidate_brier": 0.18,
            "best_baseline_brier": 0.2,
            "calibration_error": 0.05,
            "participant_minimum_evaluated_count": 40,
            "bootstrap": passing_bootstrap(),
            "subgroup_checks": [{**passing_subgroup(), "degradation": 0.2, "catastrophic_failure": True}],
            "validation_evidence": synthetic_evidence(100),
        }
    )
    assert subgroup_fail["method_gate_passed"] is False


def test_leakage_helper():
    assert_no_forecasting_leakage(
        [{"feature_time": "2026-01-01T09:00:00+00:00", "prediction_time": "2026-01-01T09:10:00+00:00"}]
    )
    with pytest.raises(AssertionError, match="Forecasting leakage"):
        assert_no_forecasting_leakage(
            [{"feature_time": "2026-01-01T09:11:00+00:00", "prediction_time": "2026-01-01T09:10:00+00:00"}]
        )


def test_future_mutation_does_not_change_earlier_prediction():
    base = [
        make_opportunity(id=f"stable-{index}", prediction_time=f"2026-04-{index + 1:02d}T09:00:00+00:00", delay_minutes=20 if index % 2 == 0 else 80)
        for index in range(8)
    ]
    changed_future = [dict(opportunity) for opportunity in base]
    changed_future[-1]["delay_minutes"] = 300
    changed_future[-1]["observed_response_time"] = "2026-04-08T14:00:00+00:00"

    first_prediction = evaluate_reply_within_horizon(base, 60, synthetic_evidence(len(base)))["prediction_records"][0]
    first_after_future_change = evaluate_reply_within_horizon(changed_future, 60, synthetic_evidence(len(base)))["prediction_records"][0]
    assert first_after_future_change["probabilities"] == first_prediction["probabilities"]


def test_forecasting_report_is_conservative():
    fixture = (ROOT / "fixtures" / "whatsapp" / "stage4_balanced_then_one_sided.txt").read_text(encoding="utf-8")
    report = evaluate_forecasting_research(
        frame_from_text(fixture),
        dataset_kind="synthetic",
        dataset_identity="stage4_balanced_then_one_sided.txt",
    )

    assert report["status"] == "not_validated"
    assert report["summary"]["product_promotion"] is False
    assert report["opportunities"]["reply"]["total"] > 0
    assert report["tasks"]["initiation_reconnection"]["promoted"] is False
    assert report["validation_evidence"]["real_world_validation_eligible"] is False
    assert "not knowledge of intent" in "\n".join(report["summary"]["reasons"])


def test_forecasting_parity_normalizer_has_canonical_shape():
    fixture = (FORECASTING_DIR / "stage5_supersession_and_censoring.txt").read_text(encoding="utf-8")
    parity = normalized_forecasting_parity_from_text(fixture, "stage5_supersession_and_censoring.txt")

    assert parity["contract_version"] == FORECASTING_CONTRACT_VERSION
    assert parity["tasks"]["reply_within_horizon"]["60"]["horizon_minutes"] == 60
    assert "time_context" in parity["tasks"]["reply_within_horizon"]["60"]["metrics"]


def make_opportunity(**overrides):
    prediction_time = overrides.get("prediction_time", "2026-01-01T09:00:00+00:00")
    delay_minutes = overrides["delay_minutes"] if "delay_minutes" in overrides else 20
    observed = None
    if delay_minutes is not None:
        observed = "2026-01-01T09:20:00+00:00"
    termination = overrides.get("termination") or ("export_end" if delay_minutes is None else "observed_response")
    value = {
        "id": overrides.get("id", "opportunity"),
        "conversation_index": overrides.get("conversation_index", 0),
        "source_turn_index": overrides.get("source_turn_index", 0),
        "source_turn_id": overrides.get("source_turn_id", 0),
        "source_sender": overrides.get("source_sender", "Asha"),
        "expected_responder": overrides.get("expected_responder", "Ravi"),
        "observed_responder": None if delay_minutes is None else "Ravi",
        "prediction_time": prediction_time,
        "observed_response_time": overrides.get("observed_response_time", observed),
        "delay_minutes": delay_minutes,
        "censor_time": overrides.get("censor_time", overrides.get("observed_response_time", observed) or prediction_time),
        "censored": termination != "observed_response",
        "open_at_export_end": termination == "export_end",
        "termination": termination,
        "superseding_turn_id": overrides.get("superseding_turn_id"),
        "group_approximation": overrides.get("group_approximation", False),
        "starts_thread": overrides.get("starts_thread", True),
        "source_turn_message_count": overrides.get("source_turn_message_count", 1),
        "source_turn_word_count": overrides.get("source_turn_word_count", 3),
    }
    value.update(overrides)
    return value


def synthetic_evidence(evaluated_opportunity_count: int) -> dict:
    return {
        "dataset_kind": "synthetic",
        "conversation_count": 1,
        "independent_conversation_count": 0,
        "evaluated_opportunity_count": evaluated_opportunity_count,
        "provenance": "unit test synthetic fixture",
        "bootstrap_completed": True,
        "subgroup_checks_completed": True,
        "real_world_validation_eligible": False,
    }


def passing_bootstrap() -> dict:
    return {
        "seed": FORECASTING_BOOTSTRAP_SEED,
        "resample_count": 200,
        "confidence_level": 0.9,
        "point_estimate": 0.02,
        "lower_bound": 0.01,
        "upper_bound": 0.03,
        "strongly_inferior": False,
        "unavailable_reason": None,
    }


def passing_subgroup() -> dict:
    return {
        "subgroup": "period:early",
        "sample_count": 50,
        "candidate_score": 0.18,
        "best_baseline_score": 0.2,
        "degradation": -0.02,
        "eligible": True,
        "catastrophic_failure": False,
    }
