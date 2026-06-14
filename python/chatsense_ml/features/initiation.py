from __future__ import annotations

import pandas as pd

from chatsense_ml.contract import THREAD_GAP_MIN


def add_initiation_features(df: pd.DataFrame, threshold_min: float = THREAD_GAP_MIN) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    result["initiates_thread"] = result["gap_min"].isna() | (result["gap_min"] >= threshold_min)
    return result


def initiation_metrics(df: pd.DataFrame) -> dict:
    if df.empty or "initiates_thread" not in df:
        return {"thread_initiations": {}, "initiation_ratio": {}}

    counts = df.loc[df["initiates_thread"]].groupby("sender").size()
    total = max(int(counts.sum()), 1)
    return {
        "thread_initiations": {str(k): int(v) for k, v in counts.items()},
        "initiation_ratio": {str(k): float(v / total) for k, v in counts.items()},
    }
