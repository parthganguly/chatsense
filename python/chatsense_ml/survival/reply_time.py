from __future__ import annotations

from collections.abc import Sequence

import pandas as pd


def empirical_reply_survival(
    df: pd.DataFrame,
    horizons_min: Sequence[float] = (60, 360, 1440),
) -> dict:
    """Estimate reply probabilities from observed reply delays without modeling hidden intent."""
    delays = df["reply_delay_min"].dropna() if "reply_delay_min" in df else pd.Series(dtype=float)
    if delays.empty:
        return {
            "support": 0,
            "median_reply_delay_min": None,
            "probability_by_horizon": {str(int(horizon)): None for horizon in horizons_min},
            "survival_by_horizon": {str(int(horizon)): None for horizon in horizons_min},
        }

    probability_by_horizon = {
        str(int(horizon)): float((delays <= horizon).mean()) for horizon in horizons_min
    }
    survival_by_horizon = {
        str(int(horizon)): float((delays > horizon).mean()) for horizon in horizons_min
    }
    return {
        "support": int(len(delays)),
        "median_reply_delay_min": float(delays.median()),
        "probability_by_horizon": probability_by_horizon,
        "survival_by_horizon": survival_by_horizon,
    }


def per_sender_reply_survival(
    df: pd.DataFrame,
    horizons_min: Sequence[float] = (60, 360, 1440),
) -> dict[str, dict]:
    if "sender" not in df:
        return {}
    return {
        str(sender): empirical_reply_survival(group, horizons_min)
        for sender, group in df.groupby("sender", dropna=False)
    }
