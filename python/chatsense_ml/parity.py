"""Canonical normalized parity output (Python side).

Produces ONLY the metrics both implementations promise to share, in a normalized
shape that is byte-comparable with the TypeScript runtime's ``lib/parity.ts``
output. The shared expected JSON in ``fixtures/expected/`` is the single source of
truth that both languages are tested against.

Parity scope is non-system messages (see contracts/behavioral_contract.json): the
TypeScript parser never emits system notices, so here we drop them BEFORE computing
features, ensuring the message sequence — and therefore every gap, reply and
rolling metric — matches the runtime exactly.

All shared metrics are integers or categorical values; the runtime already rounds
rates and delays with JS ``Math.round`` and we mirror that with ``js_round`` so
comparisons are exact (see contract parity.rounding).
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from chatsense_ml.contract import (
    QUICK_REPLY_MAX_MIN,
    WITHIN_ONE_DAY_MAX_MIN,
    WITHIN_ONE_HOUR_MAX_MIN,
    WITHIN_SIX_HOURS_MAX_MIN,
)
from chatsense_ml.features.reply_dynamics import runtime_silence_threshold
from chatsense_ml.importers.whatsapp import parse_export, parse_text
from chatsense_ml.pipeline import build_core_features_frame
from chatsense_ml.rounding import js_round
from chatsense_ml.schemas import Conversation

_WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def normalized_parity_from_text(text: str, source_name: str | None = None) -> dict:
    conversation = parse_text(text, source_name)
    return _normalize(conversation)


def normalized_parity_from_export(path: str | Path) -> dict:
    conversation = parse_export(path)
    return _normalize(conversation)


def _normalize(conversation: Conversation) -> dict:
    non_system = [m for m in conversation.messages if m.message_type != "system"]
    filtered = Conversation(
        conversation_id=conversation.conversation_id,
        source_name=conversation.source_name,
        messages=non_system,
    )
    df = build_core_features_frame(filtered)

    if df.empty:
        return {
            "message_count": 0,
            "participant_count": 0,
            "participants": [],
            "reply_count": 0,
            "thread_count": 0,
            "peak_hour": None,
            "peak_weekday": None,
            "quick_reply_rate_pct": 0,
            "within_one_hour_rate_pct": 0,
            "within_six_hours_rate_pct": 0,
            "within_one_day_rate_pct": 0,
            "avg_reply_delay_min": None,
            "median_reply_delay_min": None,
            "longest_silence_min": None,
            "unusual_silence_count": 0,
            "reply_edges": [],
        }

    total = len(df)
    delays = df.loc[df["reply_delay_min"].notna(), "reply_delay_min"]
    reply_count = int(delays.shape[0])
    gaps = df["gap_min"].dropna()

    participants = []
    for sender, group in df.groupby("sender", sort=False):
        count = int(len(group))
        participants.append(
            {
                "sender": str(sender),
                "message_count": count,
                "word_count": int(group["word_count"].sum()),
                "message_share_pct": int(js_round(count / total * 100)),
            }
        )
    participants.sort(key=lambda p: p["sender"])

    edges: dict[tuple[str, str], int] = {}
    reply_rows = df.loc[df["is_reply"], ["sender", "prev_sender"]]
    for sender, prev in zip(reply_rows["sender"], reply_rows["prev_sender"]):
        key = (str(sender), str(prev))
        edges[key] = edges.get(key, 0) + 1
    reply_edges = [
        {"from": frm, "to": to, "count": count}
        for (frm, to), count in sorted(edges.items())
    ]

    threshold = runtime_silence_threshold(gaps)
    unusual_count = int((gaps > threshold).sum()) if threshold is not None and not gaps.empty else 0

    return {
        "message_count": total,
        "participant_count": int(df["sender"].nunique()),
        "participants": participants,
        "reply_count": reply_count,
        "thread_count": int(df["initiates_thread"].sum()),
        "peak_hour": int(df.groupby("hour").size().idxmax()),
        "peak_weekday": _WEEKDAY_NAMES[int(df.groupby("weekday").size().idxmax())],
        "quick_reply_rate_pct": _rate_pct(delays < QUICK_REPLY_MAX_MIN, reply_count),
        "within_one_hour_rate_pct": _rate_pct(delays <= WITHIN_ONE_HOUR_MAX_MIN, reply_count),
        "within_six_hours_rate_pct": _rate_pct(delays <= WITHIN_SIX_HOURS_MAX_MIN, reply_count),
        "within_one_day_rate_pct": _rate_pct(delays <= WITHIN_ONE_DAY_MAX_MIN, reply_count),
        "avg_reply_delay_min": int(js_round(float(delays.mean()))) if reply_count else None,
        "median_reply_delay_min": int(js_round(float(delays.median()))) if reply_count else None,
        "longest_silence_min": int(js_round(float(gaps.max()))) if not gaps.empty else None,
        "unusual_silence_count": unusual_count,
        "reply_edges": reply_edges,
    }


def _rate_pct(mask: pd.Series, total: int) -> int:
    if total == 0:
        return 0
    return int(js_round(int(mask.sum()) / total * 100))
