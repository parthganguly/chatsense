from __future__ import annotations

import json
from pathlib import Path

from chatsense_ml.forecasting.evaluation import evaluate_forecasting_research
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.pipeline import build_core_features_frame

ROOT = Path(__file__).resolve().parents[3]
FIXTURE_DIRS = [ROOT / "fixtures" / "whatsapp", ROOT / "fixtures" / "forecasting"]
ARTIFACT_DIR = ROOT / "artifacts" / "forecasting"


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    fixture_reports = []
    fixture_paths = sorted(path for directory in FIXTURE_DIRS for path in directory.glob("*.txt"))
    for fixture_path in fixture_paths:
        conversation = parse_text(fixture_path.read_text(encoding="utf-8"), fixture_path.name)
        frame = build_core_features_frame(conversation)
        fixture_reports.append(
            {
                "fixture": fixture_path.name,
                "report": evaluate_forecasting_research(frame),
            }
        )

    summary = {
        "source": "python",
        "fixture_count": len(fixture_reports),
        "fixtures": fixture_reports,
    }
    (ARTIFACT_DIR / "python_report.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    (ARTIFACT_DIR / "python_report.md").write_text(_markdown(summary), encoding="utf-8")
    print(f"Wrote Python forecasting evaluation for {len(fixture_reports)} fixtures to {ARTIFACT_DIR}")


def _markdown(summary: dict) -> str:
    lines = [
        "# Python Forecasting Evaluation",
        "",
        "Research-only chronological backtests over committed synthetic fixtures.",
        "",
        "| Fixture | Status | Reply opportunities | Observed replies | Completed windows |",
        "| --- | --- | ---: | ---: | ---: |",
    ]
    for item in summary["fixtures"]:
        report = item["report"]
        lines.append(
            "| {fixture} | {status} | {opps} | {observed} | {windows} |".format(
                fixture=item["fixture"],
                status=report["status"],
                opps=report["summary"]["reply_opportunity_count"],
                observed=report["summary"]["observed_reply_count"],
                windows=report["summary"]["completed_activity_window_count"],
            )
        )
    lines.append("")
    lines.append("Synthetic fixtures validate method mechanics, not real-world predictive validity.")
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    main()
