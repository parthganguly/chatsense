from __future__ import annotations

from collections import defaultdict

from .schemas import ChatMessage, Moment
from .sentiment import score_text
from .text import summarize_text


def detect_moments(messages: list[ChatMessage]) -> list[Moment]:
    ordered = sorted(messages, key=lambda message: message.timestamp)
    moments: list[Moment] = []
    moments.extend(_detect_silences_and_reconnections(ordered))
    moments.extend(_detect_daily_emotional_events(ordered))
    return sorted(moments, key=lambda moment: moment.score, reverse=True)[:12]


def _detect_silences_and_reconnections(messages: list[ChatMessage]) -> list[Moment]:
    moments: list[Moment] = []
    for index in range(1, len(messages)):
        previous = messages[index - 1]
        current = messages[index]
        gap_hours = (current.timestamp - previous.timestamp).total_seconds() / 3600
        if gap_hours >= 24:
            moments.append(
                Moment(
                    date=current.timestamp.date().isoformat(),
                    type="reconnection",
                    title="Conversation resumed after silence",
                    description=f"The chat resumed after a {gap_hours:.1f} hour gap.",
                    score=min(100.0, 55.0 + gap_hours / 4),
                    evidence=[
                        summarize_text(previous.content),
                        summarize_text(current.content),
                    ],
                )
            )
    return moments


def _detect_daily_emotional_events(messages: list[ChatMessage]) -> list[Moment]:
    by_day: dict[str, list[ChatMessage]] = defaultdict(list)
    for message in messages:
        by_day[message.timestamp.date().isoformat()].append(message)

    if not by_day:
        return []

    avg_daily_count = len(messages) / len(by_day)
    moments: list[Moment] = []

    for date, day_messages in sorted(by_day.items()):
        joined = " ".join(message.content for message in day_messages)
        scores = score_text(joined)
        evidence = [summarize_text(message.content) for message in day_messages[:3]]
        message_count = len(day_messages)

        if scores["tension"] >= 0.08:
            moments.append(
                Moment(
                    date=date,
                    type="tension",
                    title="Tense exchange",
                    description="This day had elevated tension or negative language.",
                    score=round(65 + min(scores["tension"] * 180, 30), 2),
                    evidence=evidence,
                )
            )

        if scores["support"] >= 0.05:
            moments.append(
                Moment(
                    date=date,
                    type="support",
                    title="Supportive conversation",
                    description="Supportive or reassuring language showed up strongly.",
                    score=round(60 + min(scores["support"] * 180, 35), 2),
                    evidence=evidence,
                )
            )

        if scores["warmth"] >= 0.05 and scores["sentiment"] > 0:
            moments.append(
                Moment(
                    date=date,
                    type="warmth",
                    title="Warm moment",
                    description="Affectionate or appreciative language stood out.",
                    score=round(60 + min(scores["warmth"] * 160, 35), 2),
                    evidence=evidence,
                )
            )

        if message_count >= avg_daily_count * 2 and message_count >= 8:
            moments.append(
                Moment(
                    date=date,
                    type="high_volume",
                    title="Unusually active day",
                    description=f"{message_count} messages made this a high-activity day.",
                    score=round(55 + min(message_count / max(avg_daily_count, 1) * 10, 35), 2),
                    evidence=evidence,
                )
            )

    return moments
