from __future__ import annotations

import pandas as pd


def add_sender_balance_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    result = df.copy()
    result["sender_message_count_so_far"] = result.groupby("sender").cumcount() + 1
    result["sender_message_share_so_far"] = (
        result["sender_message_count_so_far"] / (result["message_index"] + 1)
    )
    return result


def sender_balance_metrics(df: pd.DataFrame) -> dict:
    if df.empty:
        return {
            "message_balance_score": 0.0,
            "word_balance_score": 0.0,
            "one_sidedness": 0.0,
        }

    message_shares = df["sender"].value_counts(normalize=True)
    word_counts = df.groupby("sender")["word_count"].sum()
    word_shares = word_counts / max(word_counts.sum(), 1)

    message_balance = _balance_score(message_shares)
    word_balance = _balance_score(word_shares)
    return {
        "message_balance_score": message_balance,
        "word_balance_score": word_balance,
        "one_sidedness": float(1 - message_balance),
    }


def participant_summary(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []

    total_messages = max(len(df), 1)
    total_words = max(int(df["word_count"].sum()), 1)
    reply_medians = df.groupby("sender")["reply_delay_min"].median()

    participants = []
    for sender, group in df.groupby("sender", sort=False):
        participants.append(
            {
                "sender": str(sender),
                "message_count": int(len(group)),
                "word_count": int(group["word_count"].sum()),
                "message_share": float(len(group) / total_messages),
                "word_share": float(group["word_count"].sum() / total_words),
                "median_reply_delay_min": _nullable_float(reply_medians.get(sender)),
            }
        )
    return participants


def _balance_score(shares: pd.Series) -> float:
    if shares.empty:
        return 0.0
    if len(shares) == 1:
        return 0.0
    return float(1 - (shares.max() - shares.min()))


def _nullable_float(value: object) -> float | None:
    if pd.isna(value):
        return None
    return float(value)
