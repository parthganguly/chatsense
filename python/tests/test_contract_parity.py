from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from jsonschema import Draft202012Validator

from chatsense_ml import contract
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.parity import normalized_parity_from_text
from chatsense_ml.pipeline import build_core_features_frame, build_research_features_frame
from chatsense_ml.reports.json_report import build_report

ROOT = Path(__file__).resolve().parents[2]
FIXTURES_DIR = ROOT / "fixtures" / "whatsapp"
EXPECTED_DIR = ROOT / "fixtures" / "expected"
LABEL_COLUMNS = {
    "next_reply_delay_bucket",
    "next_window_activity_level",
    "next_window_imbalance_change",
}


def test_python_contract_loader_matches_json_file():
    loaded = contract.load_contract()
    raw = json.loads(contract.contract_path().read_text(encoding="utf-8"))

    assert loaded == raw
    thresholds = raw["thresholds_minutes"]
    assert contract.QUICK_REPLY_MAX_MIN == thresholds["quick_reply_max"]
    assert contract.WITHIN_ONE_HOUR_MAX_MIN == thresholds["within_one_hour_max"]
    assert contract.WITHIN_SIX_HOURS_MAX_MIN == thresholds["within_six_hours_max"]
    assert contract.WITHIN_ONE_DAY_MAX_MIN == thresholds["within_one_day_max"]
    assert contract.LATE_REPLY_MIN_EXCLUSIVE_MIN == thresholds["late_reply_min_exclusive"]
    assert contract.THREAD_GAP_MIN == thresholds["thread_gap_min"]
    assert contract.RECONNECTION_GAP_MIN == thresholds["reconnection_gap_min"]
    assert contract.FOLLOW_UP_MIN == thresholds["follow_up_min"]
    assert contract.SILENCE_ANOMALY_SCALE == raw["silence_anomaly"]["scale"]
    assert contract.SILENCE_ANOMALY_K == raw["silence_anomaly"]["k"]
    assert contract.SILENCE_ANOMALY_FLOOR_MIN == thresholds["thread_gap_min"]
    assert contract.DATE_ORDER_DEFAULT == raw["date_order_policy"]["default"]
    assert contract.TWO_DIGIT_YEAR_PIVOT == raw["date_order_policy"]["two_digit_year_pivot"]
    dynamics = raw["relationship_dynamics"]
    assert contract.CONTRACT_VERSION == raw["contract_version"]
    assert contract.MIN_WINDOW_MESSAGES == dynamics["window_eligibility"]["min_messages"]
    assert contract.MIN_WINDOW_ACTIVE_DAYS == dynamics["window_eligibility"]["min_active_days"]
    assert contract.EARLY_LATE_MIN_ELIGIBLE_WINDOWS == dynamics["comparison_periods"]["early_late_min_eligible_windows"]
    assert contract.MIN_REPLY_LATENCY_PER_PARTICIPANT == dynamics["sample_minimums"]["reply_latency_per_participant"]
    assert (
        contract.NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER
        == dynamics["notable_change_thresholds"]["reply_latency_relative_multiplier"]
    )
    assert (
        contract.NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN
        == dynamics["notable_change_thresholds"]["reply_latency_absolute_min"]
    )


def test_whole_export_date_order_inference_follows_contract():
    text = "\n".join(
        [
            "04/05/2026, 09:00 - Asha: ambiguous first row",
            "05/22/2026, 10:00 - Ravi: later row forces MDY for the whole export",
        ]
    )

    conversation = parse_text(text, "date-order.txt")

    assert conversation.messages[0].timestamp.month == 4
    assert conversation.messages[0].timestamp.day == 5
    assert conversation.messages[1].timestamp.month == 5
    assert conversation.messages[1].timestamp.day == 22


def test_consecutive_same_sender_messages_do_not_create_artificial_replies():
    text = (FIXTURES_DIR / "consecutive_same_sender.txt").read_text(encoding="utf-8")
    features = build_core_features_frame(parse_text(text, "consecutive_same_sender.txt"))

    assert int(features["is_reply"].sum()) == 1
    assert pd.isna(features.loc[0, "reply_delay_min"])
    assert pd.isna(features.loc[1, "reply_delay_min"])
    assert pd.isna(features.loc[2, "reply_delay_min"])
    assert features.loc[3, "reply_delay_min"] == 28


def test_core_report_contains_no_future_label_columns():
    text = (FIXTURES_DIR / "normal.txt").read_text(encoding="utf-8")
    conversation = parse_text(text, "normal.txt")
    core = build_core_features_frame(conversation)
    report = build_report(conversation, core)

    assert LABEL_COLUMNS.isdisjoint(core.columns)
    _assert_no_label_keys(report)


def test_research_features_may_contain_leakage_safe_future_labels():
    text = (FIXTURES_DIR / "normal.txt").read_text(encoding="utf-8")
    features = build_research_features_frame(parse_text(text, "normal.txt"))

    assert LABEL_COLUMNS <= set(features.columns)
    assert features.loc[0, "next_reply_delay_bucket"] == "<5m"


def test_python_parity_matches_all_committed_expected_fixtures():
    fixture_paths = sorted(FIXTURES_DIR.glob("*.txt"))

    assert len(fixture_paths) >= 21
    for fixture_path in fixture_paths:
        expected_path = EXPECTED_DIR / f"{fixture_path.stem}.json"
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        actual = normalized_parity_from_text(fixture_path.read_text(encoding="utf-8"), fixture_path.name)
        assert actual == expected, fixture_path.name


def test_report_schema_validates_generated_core_report():
    text = (FIXTURES_DIR / "normal.txt").read_text(encoding="utf-8")
    conversation = parse_text(text, "normal.txt")
    report = build_report(conversation, build_core_features_frame(conversation))
    schema = json.loads((ROOT / "contracts" / "report.schema.json").read_text(encoding="utf-8"))

    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema).validate(report)


def _assert_no_label_keys(value):
    if isinstance(value, dict):
        assert LABEL_COLUMNS.isdisjoint(value.keys())
        for child in value.values():
            _assert_no_label_keys(child)
    elif isinstance(value, list):
        for child in value:
            _assert_no_label_keys(child)
