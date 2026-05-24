from __future__ import annotations

import pandas as pd


def add_next_window_activity_level(df: pd.DataFrame, window_size: int = 20) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    baseline = max(float(result["rolling_20_message_count"].median()), 1.0)
    labels = []
    for idx in range(len(result)):
        future = result.iloc[idx + 1 : idx + 1 + window_size]
        if future.empty:
            labels.append(None)
            continue
        activity = len(future)
        if activity < baseline * 0.75:
            labels.append("low")
        elif activity > baseline * 1.25:
            labels.append("high")
        else:
            labels.append("normal")
    result["next_window_activity_level"] = pd.Series(labels, index=result.index, dtype=object)
    return result
