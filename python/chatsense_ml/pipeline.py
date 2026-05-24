from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from chatsense_ml.cleaning import add_base_columns, conversation_to_dataframe
from chatsense_ml.features.initiation import add_initiation_features
from chatsense_ml.features.rolling_windows import add_rolling_window_features
from chatsense_ml.features.sender_balance import add_sender_balance_features
from chatsense_ml.importers.whatsapp import parse_export
from chatsense_ml.labels.activity import add_next_window_activity_level
from chatsense_ml.labels.imbalance import add_next_window_imbalance_change
from chatsense_ml.labels.reply_delay import add_next_reply_delay_bucket
from chatsense_ml.reports.json_report import build_report


def analyze_file(input_path: str | Path, report_path: str | Path, features_path: str | Path | None = None) -> dict:
    conversation = parse_export(input_path)
    features = build_features_frame(conversation)
    report = build_report(conversation, features)

    report_target = Path(report_path)
    report_target.parent.mkdir(parents=True, exist_ok=True)
    report_target.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    if features_path:
        features_target = Path(features_path)
        features_target.parent.mkdir(parents=True, exist_ok=True)
        features.to_parquet(features_target, index=False)

    return report


def build_features_frame(conversation) -> pd.DataFrame:
    df = conversation_to_dataframe(conversation)
    df = add_base_columns(df)
    df = add_sender_balance_features(df)
    df = add_initiation_features(df)
    df = add_rolling_window_features(df)
    df = add_next_reply_delay_bucket(df)
    df = add_next_window_activity_level(df)
    df = add_next_window_imbalance_change(df)
    return _ordered_contract_columns(df)


def _ordered_contract_columns(df: pd.DataFrame) -> pd.DataFrame:
    columns = [
        "conversation_id",
        "message_id",
        "message_index",
        "timestamp",
        "sender",
        "text",
        "message_type",
        "contains_media",
        "is_deleted",
        "text_len",
        "word_count",
        "hour",
        "weekday",
        "date",
        "prev_sender",
        "is_reply",
        "gap_min",
        "reply_delay_min",
        "is_quick_reply",
        "is_late_reply",
        "sender_message_count_so_far",
        "sender_message_share_so_far",
        "initiates_thread",
        "rolling_20_message_count",
        "rolling_20_unique_senders",
        "rolling_20_reply_rate",
        "rolling_20_avg_gap_min",
        "rolling_7d_message_count",
        "rolling_7d_sender_share",
        "next_reply_delay_bucket",
        "next_window_activity_level",
        "next_window_imbalance_change",
    ]
    return df[[column for column in columns if column in df.columns]]
