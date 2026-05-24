from __future__ import annotations

import pandas as pd


def label_distribution(df: pd.DataFrame, label_column: str) -> dict[str, int]:
    if label_column not in df:
        return {}
    return {str(k): int(v) for k, v in df[label_column].dropna().value_counts().items()}
