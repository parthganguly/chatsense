from __future__ import annotations

import pandas as pd

from chatsense_ml.schemas import Conversation


def conversation_to_dataframe(conversation: Conversation) -> pd.DataFrame:
    rows = [message.model_dump() for message in conversation.messages]
    df = pd.DataFrame(rows)
    if df.empty:
        return _empty_dataframe()

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp", kind="stable").reset_index(drop=True)
    df["message_index"] = range(len(df))
    df["text"] = df["text"].fillna("").astype(str)
    df["sender"] = df["sender"].fillna("Unknown").astype(str)
    df["message_type"] = df["message_type"].fillna("text").astype(str)
    return df


def add_base_columns(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    result["text_len"] = result["text"].str.len().astype("int64")
    result["word_count"] = result["text"].str.split().map(len).astype("int64")
    result["hour"] = result["timestamp"].dt.hour.astype("int64")
    result["weekday"] = result["timestamp"].dt.weekday.astype("int64")
    result["date"] = result["timestamp"].dt.date.astype(str)
    result["prev_sender"] = result["sender"].shift(1)
    result["is_reply"] = (result["sender"] != result["prev_sender"]) & result["prev_sender"].notna()
    result["gap_min"] = result["timestamp"].diff().dt.total_seconds() / 60
    result["reply_delay_min"] = result["gap_min"].where(result["is_reply"])
    result["is_quick_reply"] = (result["reply_delay_min"] < 5).fillna(False)
    result["is_late_reply"] = (result["reply_delay_min"] > 24 * 60).fillna(False)
    return result


def _empty_dataframe() -> pd.DataFrame:
    return pd.DataFrame(
        columns=[
            "conversation_id",
            "message_id",
            "message_index",
            "timestamp",
            "sender",
            "text",
            "message_type",
            "contains_media",
            "is_deleted",
            "reply_to",
        ]
    )
