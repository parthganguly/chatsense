from __future__ import annotations

import pandas as pd

from chatsense_ml.contract import (
    LATE_REPLY_MIN_EXCLUSIVE_MIN,
    QUICK_REPLY_MAX_MIN,
    SILENCE_ANOMALY_FLOOR_MIN,
    SILENCE_ANOMALY_K,
    SILENCE_ANOMALY_SCALE,
    WITHIN_ONE_DAY_MAX_MIN,
    WITHIN_ONE_HOUR_MAX_MIN,
    WITHIN_SIX_HOURS_MAX_MIN,
)


def reply_metrics(df: pd.DataFrame) -> dict:
    replies = df.loc[df["reply_delay_min"].notna(), ["sender", "reply_delay_min"]]
    if replies.empty:
        return {
            "avg_reply_delay_min": None,
            "median_reply_delay_min": None,
            "quick_reply_rate": 0.0,
            "within_one_hour_rate": 0.0,
            "within_six_hours_rate": 0.0,
            "within_one_day_rate": 0.0,
            "late_reply_rate": 0.0,
            "per_sender_median_reply_delay_min": {},
        }

    delays = replies["reply_delay_min"]
    return {
        "avg_reply_delay_min": float(delays.mean()),
        "median_reply_delay_min": float(delays.median()),
        "quick_reply_rate": float((delays < QUICK_REPLY_MAX_MIN).mean()),
        "within_one_hour_rate": float((delays <= WITHIN_ONE_HOUR_MAX_MIN).mean()),
        "within_six_hours_rate": float((delays <= WITHIN_SIX_HOURS_MAX_MIN).mean()),
        "within_one_day_rate": float((delays <= WITHIN_ONE_DAY_MAX_MIN).mean()),
        "late_reply_rate": float((delays > LATE_REPLY_MIN_EXCLUSIVE_MIN).mean()),
        "per_sender_median_reply_delay_min": {
            str(sender): float(value)
            for sender, value in replies.groupby("sender")["reply_delay_min"].median().items()
        },
    }


def runtime_silence_threshold(gaps: pd.Series) -> float | None:
    """Canonical runtime silence-anomaly threshold (modified z-score, floored).

    threshold = max(thread_gap, median(gaps) + k * scale * MAD(gaps))

    This is the SHIPPED definition, identical to lib/chat-analyzer.ts. The research
    z-score variant in chatsense_ml/anomaly/silence_anomaly.py is a different metric.
    """
    clean = gaps.dropna()
    if clean.empty:
        return None
    median_gap = float(clean.median())
    mad = float((clean - median_gap).abs().median())
    robust = median_gap + SILENCE_ANOMALY_K * SILENCE_ANOMALY_SCALE * mad
    return max(float(SILENCE_ANOMALY_FLOOR_MIN), robust)


def silence_metrics(df: pd.DataFrame) -> dict:
    gaps = df["gap_min"].dropna()
    if gaps.empty:
        return {
            "longest_silence_hours": 0.0,
            "longest_silence_min": None,
            "median_gap_min": None,
            "gaps_over_24h": 0,
            "unusual_silence_threshold_min": None,
            "unusual_silence_count": 0,
        }

    threshold = runtime_silence_threshold(gaps)
    return {
        "longest_silence_hours": float(gaps.max() / 60),
        "longest_silence_min": float(gaps.max()),
        "median_gap_min": float(gaps.median()),
        "gaps_over_24h": int((gaps > WITHIN_ONE_DAY_MAX_MIN).sum()),
        "unusual_silence_threshold_min": threshold,
        "unusual_silence_count": int((gaps > threshold).sum()) if threshold is not None else 0,
    }
