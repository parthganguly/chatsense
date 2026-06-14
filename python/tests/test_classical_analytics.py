from __future__ import annotations

import pandas as pd

from chatsense_ml.anomaly.activity_change import daily_activity_change
from chatsense_ml.anomaly.silence_anomaly import research_unusual_silences
from chatsense_ml.evaluation.backtest import expanding_window_backtest
from chatsense_ml.evaluation.calibration import expected_calibration_error
from chatsense_ml.importers.whatsapp import parse_text
from chatsense_ml.models.baselines import majority_class_predictor
from chatsense_ml.pipeline import build_features_frame
from chatsense_ml.survival.reply_time import empirical_reply_survival


def _features_for_classical_tests() -> pd.DataFrame:
    text = "\n".join(
        [
            "01/01/2026, 09:00 - Asha: first",
            "01/01/2026, 09:05 - Ravi: reply",
            "01/01/2026, 09:08 - Asha: back",
            "01/01/2026, 09:11 - Ravi: back",
            "03/01/2026, 12:00 - Asha: after silence",
            "03/01/2026, 12:20 - Ravi: twenty minutes",
            "04/01/2026, 13:00 - Asha: next day",
            "04/01/2026, 15:30 - Ravi: later",
        ]
    )
    return build_features_frame(parse_text(text, "sample.txt"))


def test_empirical_reply_survival_reports_horizon_probabilities():
    features = _features_for_classical_tests()

    survival = empirical_reply_survival(features, horizons_min=(10, 60))

    assert survival["support"] == 7
    assert survival["probability_by_horizon"]["10"] > 0
    assert survival["survival_by_horizon"]["60"] > 0


def test_silence_anomaly_flags_large_gap():
    features = _features_for_classical_tests()

    anomalies = research_unusual_silences(features, z_threshold=2.0)

    assert not anomalies.empty
    assert anomalies["gap_min"].max() > 24 * 60


def test_daily_activity_change_outputs_baseline_columns():
    features = _features_for_classical_tests()

    changes = daily_activity_change(features, window_days=2)

    assert {"date", "message_count", "baseline_count", "activity_change_ratio"} <= set(changes.columns)
    assert len(changes) >= 4


def test_expanding_backtest_uses_past_rows_only():
    features = _features_for_classical_tests()

    scores = expanding_window_backtest(
        features,
        "next_reply_delay_bucket",
        majority_class_predictor,
        initial_train_size=3,
        step_size=2,
    )

    assert not scores.empty
    assert {"accuracy", "support"} <= set(scores.columns)


def test_expected_calibration_error_for_simple_binary_probabilities():
    y_true = pd.Series(["yes", "no", "yes", "no"])
    probabilities = pd.Series([0.9, 0.1, 0.6, 0.4])

    ece = expected_calibration_error(y_true, probabilities, positive_label="yes", bins=2)

    assert 0 <= ece <= 1
