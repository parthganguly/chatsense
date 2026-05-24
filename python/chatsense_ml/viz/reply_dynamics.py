from __future__ import annotations

import pandas as pd


def reply_delay_frame(features: pd.DataFrame) -> pd.DataFrame:
    return features.loc[features["reply_delay_min"].notna(), ["timestamp", "sender", "reply_delay_min"]].copy()
