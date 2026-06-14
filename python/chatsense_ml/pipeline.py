"""Reference analytics pipeline.

Two explicit levels:

* ``build_core_features_frame`` -- the core/reference pipeline (parsing, cleaning,
  base message features, sender balance, initiation). ``report.json`` depends on
  this level ONLY. It contains no forward-looking labels, so nothing in the report
  or any current-row descriptive metric can be influenced by the future.
* ``build_research_features_frame`` -- the core level PLUS the research extension
  (rolling windows and leakage-safe future labels). This is what ``features.parquet``
  carries when ``--features`` is requested, for offline model research.

``build_features_frame`` is kept as a backwards-compatible alias for the research
frame so existing callers and tests are unaffected.
"""

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

_CORE_COLUMNS = [
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
]

# Research extension columns (rolling windows + leakage-safe forward labels).
_RESEARCH_COLUMNS = [
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


def analyze_file(input_path: str | Path, report_path: str | Path, features_path: str | Path | None = None) -> dict:
    conversation = parse_export(input_path)

    # The shipped report contract depends on the core/reference pipeline only.
    core = build_core_features_frame(conversation)
    report = build_report(conversation, core)

    report_target = Path(report_path)
    report_target.parent.mkdir(parents=True, exist_ok=True)
    report_target.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    if features_path:
        # features.parquet may carry the research extension, including leakage-safe labels.
        research = build_research_features_frame(conversation)
        features_target = Path(features_path)
        features_target.parent.mkdir(parents=True, exist_ok=True)
        research.to_parquet(features_target, index=False)

    return report


def build_core_features_frame(conversation) -> pd.DataFrame:
    """Core/reference features. No forward-looking labels. Feeds report.json."""
    df = conversation_to_dataframe(conversation)
    df = add_base_columns(df)
    df = add_sender_balance_features(df)
    df = add_initiation_features(df)
    return _ordered_columns(df, _CORE_COLUMNS)


def build_research_features_frame(conversation) -> pd.DataFrame:
    """Core features plus the research extension (rolling windows + future labels)."""
    df = conversation_to_dataframe(conversation)
    df = add_base_columns(df)
    df = add_sender_balance_features(df)
    df = add_initiation_features(df)
    df = add_rolling_window_features(df)
    df = add_next_reply_delay_bucket(df)
    df = add_next_window_activity_level(df)
    df = add_next_window_imbalance_change(df)
    return _ordered_columns(df, _CORE_COLUMNS + _RESEARCH_COLUMNS)


def build_features_frame(conversation) -> pd.DataFrame:
    """Backwards-compatible alias for the full research features frame."""
    return build_research_features_frame(conversation)


def _ordered_columns(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    return df[[column for column in columns if column in df.columns]]
