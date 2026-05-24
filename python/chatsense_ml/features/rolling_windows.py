from __future__ import annotations

import pandas as pd


def add_rolling_window_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    result["rolling_20_message_count"] = (
        result["message_index"].rolling(window=20, min_periods=1).count().astype("int64")
    )
    result["rolling_20_unique_senders"] = [
        int(result["sender"].iloc[max(0, idx - 19) : idx + 1].nunique())
        for idx in range(len(result))
    ]
    result["rolling_20_reply_rate"] = result["is_reply"].rolling(window=20, min_periods=1).mean()
    result["rolling_20_avg_gap_min"] = result["gap_min"].rolling(window=20, min_periods=1).mean()

    indexed = result.set_index("timestamp")
    result["rolling_7d_message_count"] = (
        indexed["message_id"].rolling("7D", min_periods=1).count().to_numpy().astype("int64")
    )
    sender_share = []
    for idx, row in result.iterrows():
        start = row["timestamp"] - pd.Timedelta(days=7)
        window = result.loc[(result["timestamp"] >= start) & (result["timestamp"] <= row["timestamp"])]
        sender_share.append(float((window["sender"] == row["sender"]).mean()))
    result["rolling_7d_sender_share"] = sender_share
    return result
