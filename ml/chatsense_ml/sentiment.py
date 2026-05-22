from __future__ import annotations

from collections import Counter

from .schemas import ChatMessage, EmotionalDay
from .text import tokenize

POSITIVE = {
    "amazing",
    "awesome",
    "best",
    "better",
    "beautiful",
    "excited",
    "fun",
    "good",
    "great",
    "haha",
    "happy",
    "lol",
    "love",
    "lovely",
    "nice",
    "perfect",
    "proud",
    "sweet",
    "thanks",
    "thank",
    "yay",
    "yes",
}

NEGATIVE = {
    "angry",
    "annoyed",
    "anxious",
    "bad",
    "cant",
    "confused",
    "disappointed",
    "frustrated",
    "hate",
    "hurt",
    "mad",
    "no",
    "sad",
    "sorry",
    "stressed",
    "terrible",
    "tired",
    "upset",
    "worried",
    "worse",
    "worst",
}

TENSION = {
    "argue",
    "argument",
    "blame",
    "fight",
    "ignore",
    "late",
    "never",
    "problem",
    "rude",
    "serious",
    "stop",
    "wrong",
}

SUPPORT = {
    "care",
    "help",
    "here",
    "listen",
    "okay",
    "support",
    "together",
    "understand",
}

WARMTH = {
    "baby",
    "dear",
    "hug",
    "love",
    "miss",
    "sweet",
    "thanks",
}


def score_text(text: str) -> dict[str, float]:
    tokens = tokenize(text)
    if not tokens:
        return {
            "sentiment": 0.0,
            "warmth": 0.0,
            "tension": 0.0,
            "support": 0.0,
        }

    counts = Counter(tokens)
    positive = sum(counts[word] for word in POSITIVE)
    negative = sum(counts[word] for word in NEGATIVE)
    tension = sum(counts[word] for word in TENSION)
    support = sum(counts[word] for word in SUPPORT)
    warmth = sum(counts[word] for word in WARMTH)
    denominator = max(positive + negative + tension, 1)

    return {
        "sentiment": round((positive - negative - (0.5 * tension)) / denominator, 4),
        "warmth": round(warmth / max(len(tokens), 1), 4),
        "tension": round((tension + negative) / max(len(tokens), 1), 4),
        "support": round(support / max(len(tokens), 1), 4),
    }


def daily_emotional_scores(messages: list[ChatMessage]) -> list[EmotionalDay]:
    grouped: dict[str, list[ChatMessage]] = {}
    for message in messages:
        grouped.setdefault(message.timestamp.date().isoformat(), []).append(message)

    days: list[EmotionalDay] = []
    for date, date_messages in sorted(grouped.items()):
        joined = " ".join(message.content for message in date_messages)
        scores = score_text(joined)
        days.append(
            EmotionalDay(
                date=date,
                sentiment=scores["sentiment"],
                warmth=scores["warmth"],
                tension=scores["tension"],
                support=scores["support"],
                message_count=len(date_messages),
            )
        )
    return days
