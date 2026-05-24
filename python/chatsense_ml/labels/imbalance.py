from __future__ import annotations

import pandas as pd


def add_next_window_imbalance_change(df: pd.DataFrame, window_size: int = 20) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    labels = []
    for idx in range(len(result)):
        current = result.iloc[max(0, idx - window_size + 1) : idx + 1]
        future = result.iloc[idx + 1 : idx + 1 + window_size]
        if future.empty:
            labels.append(None)
            continue

        current_imbalance = _imbalance(current)
        future_imbalance = _imbalance(future)
        delta = future_imbalance - current_imbalance
        if delta < -0.1:
            labels.append("more_balanced")
        elif delta > 0.1:
            labels.append("more_one_sided")
        else:
            labels.append("same")

    result["next_window_imbalance_change"] = pd.Series(labels, index=result.index, dtype=object)
    return result


def _imbalance(df: pd.DataFrame) -> float:
    shares = df["sender"].value_counts(normalize=True)
    if len(shares) <= 1:
        return 1.0
    return float(shares.max() - shares.min())
