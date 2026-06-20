from __future__ import annotations

import json

import pandas as pd
from typer.testing import CliRunner

from chatsense_ml.cli import app
from chatsense_ml.synthetic.generate_chat import write_synthetic_zip

runner = CliRunner()


def test_cli_writes_report_and_features(tmp_path):
    chat_path = write_synthetic_zip(tmp_path / "synthetic.zip", "repair", repeat=3)
    report_path = tmp_path / "report.json"
    features_path = tmp_path / "features.parquet"

    result = runner.invoke(
        app,
        ["analyze", str(chat_path), "--out", str(report_path), "--features", str(features_path)],
    )

    assert result.exit_code == 0, result.output
    report = json.loads(report_path.read_text(encoding="utf-8"))
    features = pd.read_parquet(features_path)

    assert report["schema_version"] == "2.0"
    assert report["conversation"]["message_count"] == len(features)
    assert report["warnings"]
    assert "reply_dynamics" in report["metrics"]
    assert "next_reply_delay_bucket" in features.columns
    assert "rolling_7d_sender_share" in features.columns
