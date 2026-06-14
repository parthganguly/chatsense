"""Research-only silence-anomaly experiment. NOT the shipped runtime metric.

This module implements an *unfloored, configurable* modified z-score over message
gaps. It is distinct from the canonical runtime silence-anomaly definition
(``chatsense_ml.features.reply_dynamics.runtime_silence_threshold``), which mirrors
``lib/chat-analyzer.ts`` and floors the threshold at the thread-gap. The functions
here are named ``research_silence_zscore`` / ``research_unusual_silences`` to make
clear they are an alternative research lens, never the shipped behavioral metric.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# Modified z-score constant (0.6745 = scale^-1 where scale = 1.4826).
_MODIFIED_Z_CONSTANT = 0.6745


def research_silence_zscore(df: pd.DataFrame, z_threshold: float = 3.5) -> pd.DataFrame:
    """Research lens: modified z-score of gaps, no thread-gap floor."""
    result = df.copy()
    gaps = result["gap_min"] if "gap_min" in result else pd.Series(dtype=float)
    median = gaps.dropna().median()
    mad = (gaps.dropna() - median).abs().median()

    if pd.isna(median) or pd.isna(mad) or mad == 0:
        result["silence_anomaly_score"] = np.nan
        result["is_unusual_silence"] = False
        return result

    result["silence_anomaly_score"] = _MODIFIED_Z_CONSTANT * (gaps - median) / mad
    result["is_unusual_silence"] = result["silence_anomaly_score"] > z_threshold
    return result


def research_unusual_silences(df: pd.DataFrame, z_threshold: float = 3.5) -> pd.DataFrame:
    """Rows flagged unusual by the research z-score lens (not the runtime metric)."""
    scored = research_silence_zscore(df, z_threshold)
    return scored.loc[scored["is_unusual_silence"]].copy()
