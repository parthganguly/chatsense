from __future__ import annotations

import pandas as pd


def daily_activity_change(df: pd.DataFrame, window_days: int = 7) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(
            columns=["date", "message_count", "baseline_count", "activity_change_ratio"]
        )

    daily = (
        df.set_index("timestamp")
        .resample("1D")
        .size()
        .rename("message_count")
        .reset_index()
    )
    daily["date"] = daily["timestamp"].dt.date.astype(str)
    daily["baseline_count"] = (
        daily["message_count"].shift(1).rolling(window_days, min_periods=1).median()
    )
    daily["activity_change_ratio"] = (
        daily["message_count"] - daily["baseline_count"]
    ) / daily["baseline_count"].replace(0, pd.NA)
    return daily[["date", "message_count", "baseline_count", "activity_change_ratio"]]


def flag_activity_changes(
    df: pd.DataFrame,
    window_days: int = 7,
    ratio_threshold: float = 1.0,
) -> pd.DataFrame:
    changes = daily_activity_change(df, window_days)
    changes["is_activity_spike"] = changes["activity_change_ratio"] >= ratio_threshold
    changes["is_activity_drop"] = changes["activity_change_ratio"] <= -ratio_threshold
    return changes
