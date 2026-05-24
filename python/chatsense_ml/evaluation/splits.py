from __future__ import annotations

import pandas as pd


def chronological_split(df: pd.DataFrame, train_fraction: float = 0.8) -> tuple[pd.DataFrame, pd.DataFrame]:
    if not 0 < train_fraction < 1:
        raise ValueError("train_fraction must be between 0 and 1.")
    split_index = int(len(df) * train_fraction)
    return df.iloc[:split_index].copy(), df.iloc[split_index:].copy()
