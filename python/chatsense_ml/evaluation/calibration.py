from __future__ import annotations

import numpy as np
import pandas as pd


def expected_calibration_error(
    y_true: pd.Series,
    positive_probability: pd.Series,
    positive_label: str,
    bins: int = 10,
) -> float:
    if bins <= 0:
        raise ValueError("bins must be positive.")
    truth = (y_true == positive_label).astype(float).to_numpy()
    probs = positive_probability.astype(float).to_numpy()
    edges = np.linspace(0, 1, bins + 1)
    ece = 0.0

    for left, right in zip(edges[:-1], edges[1:]):
        if right == 1:
            mask = (probs >= left) & (probs <= right)
        else:
            mask = (probs >= left) & (probs < right)
        if not mask.any():
            continue
        confidence = probs[mask].mean()
        accuracy = truth[mask].mean()
        ece += (mask.mean()) * abs(accuracy - confidence)

    return float(ece)
