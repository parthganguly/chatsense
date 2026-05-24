from __future__ import annotations

import pandas as pd

from chatsense_ml.features.initiation import initiation_metrics
from chatsense_ml.features.reply_dynamics import reply_metrics, silence_metrics
from chatsense_ml.features.sender_balance import participant_summary, sender_balance_metrics
from chatsense_ml.features.temporal import activity_metrics
from chatsense_ml.graphs.interaction_graph import graph_summary
from chatsense_ml.schemas import Conversation

SAFETY_WARNINGS = [
    "Analysis is based only on exported messages, not full relationship context.",
    "Reply delays and message patterns are behavioral observations, not proof of hidden intent.",
    "Do not use this report to diagnose mental health, personality, or relationship status.",
]


def build_report(conversation: Conversation, features: pd.DataFrame) -> dict:
    started_at = None
    ended_at = None
    if not features.empty:
        started_at = features["timestamp"].min().isoformat()
        ended_at = features["timestamp"].max().isoformat()

    return {
        "schema_version": "1.0",
        "conversation": {
            "conversation_id": conversation.conversation_id,
            "source_name": conversation.source_name,
            "message_count": int(len(features)),
            "participant_count": int(features["sender"].nunique()) if not features.empty else 0,
            "started_at": started_at,
            "ended_at": ended_at,
        },
        "participants": participant_summary(features),
        "metrics": {
            "reply_dynamics": reply_metrics(features),
            "silence_gaps": silence_metrics(features),
            "sender_balance": sender_balance_metrics(features),
            "initiation": initiation_metrics(features),
            "activity": activity_metrics(features),
        },
        "graph": graph_summary(features),
        "warnings": SAFETY_WARNINGS,
    }
