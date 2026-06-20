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
from chatsense_ml.features.relationship_dynamics import relationship_dynamics
from chatsense_ml.importers.whatsapp import parse_export, parse_text
from chatsense_ml.pipeline import build_core_features_frame
from chatsense_ml.rounding import js_round
from chatsense_ml.schemas import Conversation

_RUNTIME_WEEKDAY_ORDER = [
    (6, "Sunday"),
    (0, "Monday"),
    (1, "Tuesday"),
    (2, "Wednesday"),
    (3, "Thursday"),
    (4, "Friday"),
    (5, "Saturday"),
]


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
            "relationship_dynamics": _normalize_relationship_dynamics(relationship_dynamics(df)),
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
        "peak_weekday": _peak_weekday(df),
        "quick_reply_rate_pct": _rate_pct(delays < QUICK_REPLY_MAX_MIN, reply_count),
        "within_one_hour_rate_pct": _rate_pct(delays <= WITHIN_ONE_HOUR_MAX_MIN, reply_count),
        "within_six_hours_rate_pct": _rate_pct(delays <= WITHIN_SIX_HOURS_MAX_MIN, reply_count),
        "within_one_day_rate_pct": _rate_pct(delays <= WITHIN_ONE_DAY_MAX_MIN, reply_count),
        "avg_reply_delay_min": int(js_round(float(delays.mean()))) if reply_count else None,
        "median_reply_delay_min": int(js_round(float(delays.median()))) if reply_count else None,
        "longest_silence_min": int(js_round(float(gaps.max()))) if not gaps.empty else None,
        "unusual_silence_count": unusual_count,
        "reply_edges": reply_edges,
        "relationship_dynamics": _normalize_relationship_dynamics(relationship_dynamics(df)),
    }


def _rate_pct(mask: pd.Series, total: int) -> int:
    if total == 0:
        return 0
    return int(js_round(int(mask.sum()) / total * 100))


def _peak_weekday(df: pd.DataFrame) -> str:
    counts = df.groupby("weekday").size().to_dict()
    # Match the TypeScript runtime's Sunday-first weekday array and first-max
    # tie break. Pandas' idxmax would otherwise prefer Monday in Sunday/Monday
    # ties because its weekday integers are Monday-first.
    best_day = _RUNTIME_WEEKDAY_ORDER[0][1]
    best_count = -1
    for weekday, label in _RUNTIME_WEEKDAY_ORDER:
        count = int(counts.get(weekday, 0))
        if count > best_count:
            best_count = count
            best_day = label
    return best_day


def _normalize_relationship_dynamics(dynamics: dict) -> dict:
    return {
        "turn_count": len(dynamics["turns"]),
        "turns": [
            {
                "sender": turn["sender"],
                "message_count": turn["message_count"],
                "word_count": turn["word_count"],
                "duration_min": turn["duration_minutes"],
                "starts_thread": turn["starts_thread"],
                "open_at_export_end": turn["open_at_export_end"],
            }
            for turn in dynamics["turns"]
        ],
        "participants": sorted(
            [
                {
                    "sender": participant["sender"],
                    "turn_count": participant["turn_count"],
                    "turn_share_pct": participant["turn_share"],
                    "median_reply_delay_min": participant["median_reply_minutes"],
                    "reply_sample_count": participant["reply_sample_count"],
                    "thread_starts": participant["thread_starts"],
                    "reconnections": participant["reconnection_count"],
                    "follow_ups": participant["follow_up_count"],
                    "follow_up_relevant_turns": participant["follow_up_relevant_turn_count"],
                    "follow_up_rate_pct": participant["follow_up_rate"],
                }
                for participant in dynamics["participant_summaries"]
            ],
            key=lambda item: item["sender"],
        ),
        "pause_summary": {
            "long_pause_count": dynamics["pause_summary"]["long_pause_count"],
            "latest_gap_min": dynamics["pause_summary"]["latest_gap_minutes"],
            "latest_gap_percentile": dynamics["pause_summary"]["latest_gap_percentile"],
            "median_inter_message_gap_min": dynamics["pause_summary"]["median_inter_message_gap_minutes"],
            "longest_pauses": [
                {
                    "started_at": pause["started_at"],
                    "ended_at": pause["ended_at"],
                    "duration_min": pause["duration_minutes"],
                    "reconnecting_sender": pause["reconnecting_sender"],
                }
                for pause in dynamics["pause_summary"]["longest_pauses"]
            ],
            "reconnecting_participants": [
                {
                    "sender": participant["sender"],
                    "count": participant["count"],
                    "share_pct": participant["share"],
                }
                for participant in dynamics["pause_summary"]["reconnecting_participants"]
            ],
        },
        "adaptive_windows": [
            {
                "start": window["start"],
                "end": window["end"],
                "partial": window["partial"],
                "eligible": window["eligible"],
                "message_count": window["message_count"],
                "active_days": window["active_days"],
                "turn_count": window["turn_count"],
                "thread_count": window["thread_count"],
                "reconnection_count": window["reconnection_count"],
            }
            for window in dynamics["adaptive_windows"]
        ],
        "early_late": _normalize_comparison(dynamics["early_late"]),
        "recent_prior": _normalize_comparison(dynamics["recent_prior"]),
    }


def _normalize_comparison(comparison: dict) -> dict:
    return {
        "available": comparison["available"],
        "unavailable_reason": comparison["unavailable_reason"],
        "earlier_period": {
            "start": comparison["earlier_period"]["start"],
            "end": comparison["earlier_period"]["end"],
            "message_count": comparison["earlier_period"]["message_count"],
            "active_days": comparison["earlier_period"]["active_days"],
        },
        "later_period": {
            "start": comparison["later_period"]["start"],
            "end": comparison["later_period"]["end"],
            "message_count": comparison["later_period"]["message_count"],
            "active_days": comparison["later_period"]["active_days"],
        },
        "changes": sorted(
            [
                {
                    "metric": change["metric"],
                    "sender": change["sender"],
                    "evidence_state": change["evidence_state"],
                    "direction": change["direction"],
                    "notable": change["notable"],
                    "earlier_value": change["earlier_value"],
                    "later_value": change["later_value"],
                    "earlier_sample_size": change["earlier_sample_size"],
                    "later_sample_size": change["later_sample_size"],
                }
                for change in comparison["changes"]
            ],
            key=lambda item: (item["metric"], item["sender"] or ""),
        ),
    }
