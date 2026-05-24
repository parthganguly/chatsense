from __future__ import annotations

import pandas as pd


def majority_label_baseline(df: pd.DataFrame, label_column: str) -> dict:
    labels = df[label_column].dropna()
    if labels.empty:
        return {"label": None, "accuracy": None, "support": 0}
    majority = labels.mode().iloc[0]
    return {
        "label": str(majority),
        "accuracy": float((labels == majority).mean()),
        "support": int(len(labels)),
    }
