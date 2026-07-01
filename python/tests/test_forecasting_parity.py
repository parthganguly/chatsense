from __future__ import annotations

import json
from pathlib import Path

from jsonschema import Draft202012Validator

from chatsense_ml.forecasting.evaluate import build_report
from chatsense_ml.forecasting.parity import normalized_forecasting_parity_from_path

ROOT = Path(__file__).resolve().parents[2]
FORECASTING_DIR = ROOT / "fixtures" / "forecasting"


def test_forecasting_parity_normalizes_all_stage5_fixtures():
    manifest = json.loads((FORECASTING_DIR / "manifest.json").read_text(encoding="utf-8"))
    fixture_names = sorted(path.name for path in FORECASTING_DIR.glob("*.txt"))

    assert len(fixture_names) >= 10
    assert len(manifest["required_cases"]) >= 21

    for fixture_name in fixture_names:
        normalized = normalized_forecasting_parity_from_path(FORECASTING_DIR / fixture_name)
        assert normalized["contract_version"] == "1.0"
        assert "reply_within_horizon" in normalized["tasks"]
        assert "conditional_reply_delay_bucket" in normalized["tasks"]
        assert "next_window_activity" in normalized["tasks"]
        for horizon in ("60", "360", "1440"):
            task = normalized["tasks"]["reply_within_horizon"][horizon]
            assert "time_context" in task["metrics"]
            assert "candidate" in task["metrics"]
            assert "bootstrap" in task
            assert "subgroup_checks" in task


def test_forecasting_report_schema_validates_generated_summary():
    schema = json.loads((ROOT / "contracts" / "forecasting_report.schema.json").read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)

    for source in ("python", "parity"):
        report = build_report(source)
        errors = sorted(validator.iter_errors(report), key=lambda error: list(error.path))
        assert errors == []
