from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from chatsense_ml.forecasting.contract import FORECASTING_CONTRACT_VERSION
from chatsense_ml.forecasting.parity import normalized_forecasting_parity_from_path

ROOT = Path(__file__).resolve().parents[3]
FIXTURE_DIR = ROOT / "fixtures" / "forecasting"
MANIFEST_PATH = FIXTURE_DIR / "manifest.json"
ARTIFACT_DIR = ROOT / "artifacts" / "forecasting"


def build_report(source: str = "python") -> dict:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    fixture_paths = sorted(FIXTURE_DIR.glob("*.txt"))
    return {
        "schema_version": "1.0",
        "contract_version": FORECASTING_CONTRACT_VERSION,
        "source": source,
        "dataset_identity": "committed_stage5_synthetic_fixtures",
        "fixture_count": len(fixture_paths),
        "fixtures": [
            _summarize_fixture(path.name, normalized_forecasting_parity_from_path(path), manifest)
            for path in fixture_paths
        ],
    }


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    report = build_report("python")
    (ARTIFACT_DIR / "python_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote Python forecasting evaluation for {report['fixture_count']} fixtures to {ARTIFACT_DIR}")


def _summarize_fixture(fixture: str, normalized: dict, manifest: dict) -> dict:
    reply_tasks = [
        _summarize_reply_task(task)
        for task in sorted(
            normalized["tasks"]["reply_within_horizon"].values(),
            key=lambda item: item["horizon_minutes"],
        )
    ]
    return {
        "fixture": fixture,
        "cases": _case_ids_for_fixture(fixture, manifest),
        "status": normalized["status"],
        "summary": normalized["summary"],
        "opportunities": normalized["opportunities"],
        "validation_evidence": normalized["validation_evidence"],
        "tasks": {
            "reply_within_horizon": reply_tasks,
            "conditional_reply_delay_bucket": {
                "observed_response_count": normalized["tasks"]["conditional_reply_delay_bucket"][
                    "observed_response_count"
                ],
                "evaluated_count": normalized["tasks"]["conditional_reply_delay_bucket"]["evaluated_count"],
                "class_support": normalized["tasks"]["conditional_reply_delay_bucket"]["class_support"],
                "best_baseline_key": normalized["tasks"]["conditional_reply_delay_bucket"]["best_baseline_key"],
                "insufficient_support": normalized["tasks"]["conditional_reply_delay_bucket"]["insufficient_support"],
                "prediction_records": normalized["tasks"]["conditional_reply_delay_bucket"]["prediction_records"],
                "metrics": normalized["tasks"]["conditional_reply_delay_bucket"]["baselines"],
                "promotion": normalized["tasks"]["conditional_reply_delay_bucket"]["promotion"],
            },
            "next_window_activity": {
                "completed_window_count": normalized["tasks"]["next_window_activity"]["completed_window_count"],
                "evaluated_count": normalized["tasks"]["next_window_activity"]["evaluated_count"],
                "best_baseline_key": normalized["tasks"]["next_window_activity"]["best_baseline_key"],
                "candidate_improvement_over_best_baseline_pct": normalized["tasks"]["next_window_activity"][
                    "candidate_improvement_over_best_baseline_pct"
                ],
                "prediction_records": normalized["tasks"]["next_window_activity"]["prediction_records"],
                "metrics": normalized["tasks"]["next_window_activity"]["baselines"],
                "promotion": normalized["tasks"]["next_window_activity"]["promotion"],
            },
        },
    }


def _summarize_reply_task(task: dict) -> dict:
    return {
        "horizon_minutes": task["horizon_minutes"],
        "eligible_count": task["eligible_count"],
        "censored_count": task["censored_count"],
        "prediction_records": task["prediction_records"],
        "metrics": task["metrics"],
        "best_baseline_key": task["best_baseline_key"],
        "candidate_relative_brier_improvement_pct": task["candidate_relative_brier_improvement_pct"],
        "candidate_improvement_over_best_baseline_pct": task["candidate_improvement_over_best_baseline_pct"],
        "bootstrap": task["bootstrap"],
        "subgroup_checks": task["subgroup_checks"],
        "promotion": task["promotion"],
    }


def _case_ids_for_fixture(fixture: str, manifest: dict[str, Any]) -> list[str]:
    return sorted(
        case_id
        for case_id, entry in manifest["cases"].items()
        if entry.get("fixture") == fixture
    )


if __name__ == "__main__":
    main()
