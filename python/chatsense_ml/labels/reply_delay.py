from __future__ import annotations

import pandas as pd


def add_next_reply_delay_bucket(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    next_reply_delay = result["reply_delay_min"].shift(-1)
    result["next_reply_delay_bucket"] = pd.Series(
        [_bucket_reply_delay(value) for value in next_reply_delay],
        index=result.index,
        dtype=object,
    )
    return result


def _bucket_reply_delay(minutes: float | None) -> str | None:
    if pd.isna(minutes):
        return None
    if minutes < 5:
        return "<5m"
    if minutes < 30:
        return "5-30m"
    if minutes < 120:
        return "30m-2h"
    if minutes <= 24 * 60:
        return "2h-24h"
    return ">24h/no_reply"
