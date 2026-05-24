from __future__ import annotations

import pandas as pd


def reply_metrics(df: pd.DataFrame) -> dict:
    replies = df.loc[df["reply_delay_min"].notna(), ["sender", "reply_delay_min"]]
    if replies.empty:
        return {
            "avg_reply_delay_min": None,
            "median_reply_delay_min": None,
            "quick_reply_rate": 0.0,
            "late_reply_rate": 0.0,
            "per_sender_median_reply_delay_min": {},
        }

    return {
        "avg_reply_delay_min": float(replies["reply_delay_min"].mean()),
        "median_reply_delay_min": float(replies["reply_delay_min"].median()),
        "quick_reply_rate": float((replies["reply_delay_min"] < 5).mean()),
        "late_reply_rate": float((replies["reply_delay_min"] > 24 * 60).mean()),
        "per_sender_median_reply_delay_min": {
            str(sender): float(value)
            for sender, value in replies.groupby("sender")["reply_delay_min"].median().items()
        },
    }


def silence_metrics(df: pd.DataFrame) -> dict:
    gaps = df["gap_min"].dropna()
    if gaps.empty:
        return {
            "longest_silence_hours": 0.0,
            "median_gap_min": None,
            "gaps_over_24h": 0,
        }

    return {
        "longest_silence_hours": float(gaps.max() / 60),
        "median_gap_min": float(gaps.median()),
        "gaps_over_24h": int((gaps > 24 * 60).sum()),
    }
