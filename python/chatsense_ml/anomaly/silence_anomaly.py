from __future__ import annotations

import numpy as np
import pandas as pd


def add_silence_anomaly_score(df: pd.DataFrame, z_threshold: float = 3.5) -> pd.DataFrame:
    result = df.copy()
    gaps = result["gap_min"] if "gap_min" in result else pd.Series(dtype=float)
    median = gaps.dropna().median()
    mad = (gaps.dropna() - median).abs().median()

    if pd.isna(median) or pd.isna(mad) or mad == 0:
        result["silence_anomaly_score"] = np.nan
        result["is_unusual_silence"] = False
        return result

    result["silence_anomaly_score"] = 0.6745 * (gaps - median) / mad
    result["is_unusual_silence"] = result["silence_anomaly_score"] > z_threshold
    return result


def unusual_silences(df: pd.DataFrame, z_threshold: float = 3.5) -> pd.DataFrame:
    scored = add_silence_anomaly_score(df, z_threshold)
    return scored.loc[scored["is_unusual_silence"]].copy()
