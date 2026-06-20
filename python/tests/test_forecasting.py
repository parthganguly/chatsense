from __future__ import annotations

import json
from pathlib import Path

from chatsense_ml.features.relationship_dynamics import relationship_dynamics
from chatsense_ml.forecasting.contract import (
    FORECASTING_CONTRACT_VERSION,
    FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
    REPLY_HORIZONS_MINUTES,
    forecasting_contract_path,
)
from chatsense_ml.forecasting.evaluation import (
    assess_reply_horizon_promotion,
    build_reply_opportunities,
    evaluate_forecasting_research,
    outcome_for_horizon,
)
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.pipeline import build_core_features_frame

ROOT = Path(__file__).resolve().parents[2]


def frame_from_text(text: str):
    return build_core_features_frame(parse_text(text, "forecasting-test.txt"))


def test_forecasting_fixture_matrix_exists():
    fixture_names = sorted(path.name for path in (ROOT / "fixtures" / "forecasting").glob("*.txt"))
    assert fixture_names == [
        "stage5_activity_windows.txt",
        "stage5_group_approximation.txt",
        "stage5_regime_shift.txt",
        "stage5_reply_censoring.txt",
    ]


def test_forecasting_contract_loader_matches_json():
    contract = json.loads(forecasting_contract_path().read_text(encoding="utf-8"))

    assert FORECASTING_CONTRACT_VERSION == contract["contract_version"]
    assert list(REPLY_HORIZONS_MINUTES) == contract["tasks"]["reply_within_horizon"]["horizons_minutes"]
    assert (
        FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL
        == contract["promotion_gates"]["reply_horizon"]["min_evaluated_overall"]
    )


def test_reply_opportunities_use_turns_not_raw_next_rows():
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
    assert opportunities[0]["source_sender"] == "Asha"
    assert opportunities[0]["source_turn_message_count"] == 2
    assert opportunities[0]["observed_responder"] == "Ravi"
    assert opportunities[0]["delay_minutes"] == 15


def test_censoring_does_not_treat_final_open_turn_as_no_reply():
    frame = frame_from_text(
        "\n".join(
            [
                "01/01/2026, 09:00 - Asha: start",
                "01/01/2026, 16:00 - Asha: same sender new thread",
            ]
        )
    )
    opportunities = build_reply_opportunities(relationship_dynamics(frame)["turns"], ["Asha", "Ravi"])

    assert len(opportunities) == 2
    assert outcome_for_horizon(opportunities[0], 60)["censored"] is False
    assert outcome_for_horizon(opportunities[0], 60)["outcome"] is False
    assert opportunities[1]["open_at_export_end"] is True
    assert outcome_for_horizon(opportunities[1], 60) == {
        "eligible": False,
        "censored": True,
        "outcome": None,
        "reason": "export ended before the full horizon elapsed",
    }


def test_promotion_gate_separates_method_pass_from_product_promotion():
    method_pass = assess_reply_horizon_promotion(
        {
            "evaluated_count": 100,
            "positive_count": 50,
            "negative_count": 50,
            "candidate_brier": 0.18,
            "best_baseline_brier": 0.2,
            "calibration_error": 0.05,
            "participant_minimum_evaluated_count": 40,
            "general_validity_established": False,
        }
    )
    assert method_pass["method_gate_passed"] is True
    assert method_pass["promoted"] is False
    assert "Synthetic fixtures" in "\n".join(method_pass["reasons"])

    product_pass = assess_reply_horizon_promotion(
        {
            "evaluated_count": 100,
            "positive_count": 50,
            "negative_count": 50,
            "candidate_brier": 0.18,
            "best_baseline_brier": 0.2,
            "calibration_error": 0.05,
            "participant_minimum_evaluated_count": 40,
            "general_validity_established": True,
        }
    )
    assert product_pass["method_gate_passed"] is True
    assert product_pass["promoted"] is True

    fail = assess_reply_horizon_promotion(
        {
            "evaluated_count": 20,
            "positive_count": 19,
            "negative_count": 1,
            "candidate_brier": 0.2,
            "best_baseline_brier": 0.2,
            "calibration_error": 0.2,
            "participant_minimum_evaluated_count": 10,
            "general_validity_established": True,
        }
    )
    assert fail["method_gate_passed"] is False
    assert fail["promoted"] is False
    assert "Requires 80 evaluated opportunities" in "\n".join(fail["reasons"])


def test_forecasting_report_is_conservative():
    fixture = (ROOT / "fixtures" / "whatsapp" / "stage4_balanced_then_one_sided.txt").read_text(encoding="utf-8")
    report = evaluate_forecasting_research(frame_from_text(fixture))

    assert report["status"] == "not_validated"
    assert report["summary"]["product_promotion"] is False
    assert report["opportunities"]["reply"]["total"] > 0
    assert report["tasks"]["initiation_reconnection"]["promoted"] is False
    assert "not knowledge of intent" in "\n".join(report["summary"]["reasons"])
