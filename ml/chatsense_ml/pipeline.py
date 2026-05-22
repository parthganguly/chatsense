from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from .ask import answer_question, build_ask_index
from .features import balance_summary, emotional_climate, rhythm_summary
from .ingest import load_messages
from .moments import detect_moments
from .schemas import AnalysisResult, AskAnswer, ChatMessage
from .topics import cluster_topics

ANALYSIS_VERSION = "python-ml-foundation-v1"


def analyze_chat_file(path: str | Path, question: str | None = None) -> AnalysisResult:
    return analyze_messages(load_messages(path), question=question, source=str(path))


def analyze_messages(
    messages: list[ChatMessage],
    question: str | None = None,
    source: str | None = None,
) -> AnalysisResult:
    ordered = sorted(messages, key=lambda message: message.timestamp)
    ask_index = build_ask_index(ordered)
    ask_answer: AskAnswer | None = answer_question(ask_index, question) if question else None
    senders = sorted({message.sender for message in ordered})

    return AnalysisResult(
        version=ANALYSIS_VERSION,
        generated_at=datetime.now(UTC).isoformat(),
        metadata={
            "source": source,
            "message_count": len(ordered),
            "participant_count": len(senders),
            "participants": senders,
            "date_range": [
                ordered[0].timestamp.date().isoformat(),
                ordered[-1].timestamp.date().isoformat(),
            ]
            if ordered
            else [],
        },
        rhythm=rhythm_summary(ordered),
        balance=balance_summary(ordered),
        emotional_climate=emotional_climate(ordered),
        topics=cluster_topics(ordered),
        moments=detect_moments(ordered),
        ask_index=ask_index,
        ask_answer=ask_answer,
    )
