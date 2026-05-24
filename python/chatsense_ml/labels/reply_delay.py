from __future__ import annotations

import pandas as pd


def add_next_reply_delay_bucket(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    next_reply_delay = _delay_until_next_other_sender(result)
    result["next_reply_delay_bucket"] = pd.Series(
        [_bucket_reply_delay(value) for value in next_reply_delay],
        index=result.index,
        dtype=object,
    )
    return result


def _delay_until_next_other_sender(df: pd.DataFrame) -> list[float | None]:
    delays: list[float | None] = []
    senders = df["sender"].tolist()
    timestamps = df["timestamp"].tolist()

    for row_number, sender in enumerate(senders):
        next_delay: float | None = None
        current_timestamp = timestamps[row_number]
        for future_row_number in range(row_number + 1, len(df)):
            if senders[future_row_number] == sender:
                continue
            future_timestamp = timestamps[future_row_number]
            next_delay = (future_timestamp - current_timestamp).total_seconds() / 60
            break
        delays.append(next_delay)

    return delays


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
