from __future__ import annotations

from collections.abc import Callable

import pandas as pd


PredictorFactory = Callable[[pd.DataFrame, str], Callable[[pd.DataFrame], pd.Series]]


def expanding_window_backtest(
    df: pd.DataFrame,
    label_column: str,
    predictor_factory: PredictorFactory,
    initial_train_size: int,
    step_size: int = 50,
) -> pd.DataFrame:
    rows = []
    labeled = df.dropna(subset=[label_column]).copy()
    if initial_train_size <= 0:
        raise ValueError("initial_train_size must be positive.")
    if step_size <= 0:
        raise ValueError("step_size must be positive.")

    for train_end in range(initial_train_size, len(labeled), step_size):
        test_end = min(train_end + step_size, len(labeled))
        train = labeled.iloc[:train_end]
        test = labeled.iloc[train_end:test_end]
        if test.empty:
            continue
        predict = predictor_factory(train, label_column)
        predictions = predict(test)
        rows.append(
            {
                "train_end": int(train_end),
                "test_start": int(train_end),
                "test_end": int(test_end),
                "accuracy": float((predictions.values == test[label_column].values).mean()),
                "support": int(len(test)),
            }
        )
    return pd.DataFrame(rows)
