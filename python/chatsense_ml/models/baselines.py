from __future__ import annotations

import pandas as pd


def majority_class_predictor(train: pd.DataFrame, label_column: str):
    labels = train[label_column].dropna()
    majority = None if labels.empty else labels.mode().iloc[0]

    def predict(frame: pd.DataFrame) -> pd.Series:
        return pd.Series([majority] * len(frame), index=frame.index, dtype=object)

    return predict


def sender_majority_predictor(train: pd.DataFrame, label_column: str, fallback: str | None = None):
    labels = train[["sender", label_column]].dropna()
    sender_modes = labels.groupby("sender")[label_column].agg(lambda values: values.mode().iloc[0])
    if fallback is None and not labels.empty:
        fallback = labels[label_column].mode().iloc[0]

    def predict(frame: pd.DataFrame) -> pd.Series:
        values = frame["sender"].map(sender_modes).fillna(fallback)
        return pd.Series(values, index=frame.index, dtype=object)

    return predict
