from __future__ import annotations

import pandas as pd


def activity_metrics(df: pd.DataFrame) -> dict:
    if df.empty:
        return {
            "daily_counts": {},
            "weekly_counts": {},
            "peak_hour": None,
            "peak_weekday": None,
            "active_day_ratio": 0.0,
        }

    daily = df.groupby("date").size()
    weekly = df.set_index("timestamp").resample("W").size()
    span_days = max((df["timestamp"].max().date() - df["timestamp"].min().date()).days + 1, 1)
    hour_counts = df.groupby("hour").size()
    weekday_counts = df.groupby("weekday").size()

    return {
        "daily_counts": {str(k): int(v) for k, v in daily.items()},
        "weekly_counts": {str(k.date()): int(v) for k, v in weekly.items()},
        "peak_hour": int(hour_counts.idxmax()) if not hour_counts.empty else None,
        "peak_weekday": int(weekday_counts.idxmax()) if not weekday_counts.empty else None,
        "active_day_ratio": float(len(daily) / span_days),
    }
