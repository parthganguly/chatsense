from __future__ import annotations

from collections import Counter, defaultdict
from statistics import median

from .schemas import (
    BalanceSummary,
    ChatMessage,
    EmotionalClimate,
    ParticipantStats,
    ReplyStats,
    RhythmSummary,
)
from .sentiment import daily_emotional_scores
from .text import word_count

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def rhythm_summary(messages: list[ChatMessage]) -> RhythmSummary:
    if not messages:
        empty_reply = ReplyStats(0.0, 0.0, 0.0, 0)
        return RhythmSummary("", "", 0, 0, 0.0, 0, "", 0.0, empty_reply)

    ordered = sorted(messages, key=lambda message: message.timestamp)
    by_day = Counter(message.timestamp.date().isoformat() for message in ordered)
    by_hour = Counter(message.timestamp.hour for message in ordered)
    by_weekday = Counter(message.timestamp.weekday() for message in ordered)

    gaps_hours = [
        (ordered[index].timestamp - ordered[index - 1].timestamp).total_seconds() / 3600
        for index in range(1, len(ordered))
    ]

    return RhythmSummary(
        first_message_at=ordered[0].timestamp.isoformat(),
        last_message_at=ordered[-1].timestamp.isoformat(),
        active_days=len(by_day),
        total_messages=len(ordered),
        messages_per_active_day=round(len(ordered) / max(len(by_day), 1), 2),
        peak_hour=by_hour.most_common(1)[0][0],
        peak_day=DAY_NAMES[by_weekday.most_common(1)[0][0]],
        longest_silence_hours=round(max(gaps_hours, default=0.0), 2),
        reply_stats=reply_stats(ordered),
    )


def reply_stats(messages: list[ChatMessage]) -> ReplyStats:
    reply_minutes: list[float] = []
    for index in range(1, len(messages)):
        previous = messages[index - 1]
        current = messages[index]
        if previous.sender == current.sender:
            continue
        minutes = (current.timestamp - previous.timestamp).total_seconds() / 60
        if 0 < minutes <= 24 * 60:
            reply_minutes.append(minutes)

    if not reply_minutes:
        return ReplyStats(0.0, 0.0, 0.0, 0)

    quick = [minutes for minutes in reply_minutes if minutes <= 5]
    return ReplyStats(
        average_minutes=round(sum(reply_minutes) / len(reply_minutes), 2),
        median_minutes=round(median(reply_minutes), 2),
        quick_reply_rate=round(len(quick) / len(reply_minutes), 4),
        reply_pairs=len(reply_minutes),
    )


def balance_summary(messages: list[ChatMessage]) -> BalanceSummary:
    grouped: dict[str, list[ChatMessage]] = defaultdict(list)
    for message in sorted(messages, key=lambda item: item.timestamp):
        grouped[message.sender].append(message)

    starts_by_sender = conversation_starts(messages)
    participant_stats: list[ParticipantStats] = []
    for sender, sender_messages in sorted(grouped.items()):
        words = sum(word_count(message.content) for message in sender_messages)
        characters = sum(len(message.content) for message in sender_messages)
        questions = sum(message.content.count("?") for message in sender_messages)
        participant_stats.append(
            ParticipantStats(
                sender=sender,
                messages=len(sender_messages),
                words=words,
                characters=characters,
                questions=questions,
                starts=starts_by_sender.get(sender, 0),
                avg_words_per_message=round(words / max(len(sender_messages), 1), 2),
            )
        )

    message_balance = _balance_score([stats.messages for stats in participant_stats])
    initiation_balance = _balance_score([stats.starts for stats in participant_stats])
    question_balance = _balance_score([stats.questions for stats in participant_stats])

    if message_balance >= 0.8 and initiation_balance >= 0.65:
        description = "Conversation effort looks broadly balanced."
    elif message_balance >= 0.6:
        description = "Message volume is somewhat balanced, but initiation or questions lean one way."
    else:
        description = "One participant appears to carry noticeably more of the conversation."

    return BalanceSummary(
        participant_stats=participant_stats,
        initiation_balance=round(initiation_balance, 4),
        message_balance=round(message_balance, 4),
        question_balance=round(question_balance, 4),
        description=description,
    )


def emotional_climate(messages: list[ChatMessage]) -> EmotionalClimate:
    daily = daily_emotional_scores(messages)
    if not daily:
        return EmotionalClimate(0.0, 0.0, 0.0, None, None, [], "No emotional data available.")

    average = sum(day.sentiment for day in daily) / len(daily)
    recent_window = daily[-7:]
    earlier_window = daily[-14:-7] if len(daily) >= 14 else daily[: max(len(daily) - 7, 0)]
    recent = sum(day.sentiment for day in recent_window) / max(len(recent_window), 1)
    earlier = sum(day.sentiment for day in earlier_window) / max(len(earlier_window), 1)
    trend = recent - earlier
    warmest = max(daily, key=lambda day: day.warmth, default=None)
    tensest = max(daily, key=lambda day: day.tension, default=None)

    if recent > average + 0.15:
        description = "Recent tone is warmer than the chat baseline."
    elif recent < average - 0.15:
        description = "Recent tone is lower than the chat baseline."
    else:
        description = "Recent tone is close to the chat baseline."

    return EmotionalClimate(
        average_sentiment=round(average, 4),
        recent_sentiment=round(recent, 4),
        trend=round(trend, 4),
        warmest_day=warmest.date if warmest and warmest.warmth > 0 else None,
        tensest_day=tensest.date if tensest and tensest.tension > 0 else None,
        daily=daily,
        description=description,
    )


def conversation_starts(messages: list[ChatMessage], silence_hours: float = 8.0) -> Counter[str]:
    starts: Counter[str] = Counter()
    ordered = sorted(messages, key=lambda message: message.timestamp)
    previous: ChatMessage | None = None
    for message in ordered:
        if previous is None:
            starts[message.sender] += 1
        else:
            gap = (message.timestamp - previous.timestamp).total_seconds() / 3600
            if gap >= silence_hours:
                starts[message.sender] += 1
        previous = message
    return starts


def _balance_score(values: list[int]) -> float:
    if len(values) <= 1:
        return 1.0
    total = sum(values)
    if total == 0:
        return 1.0
    largest = max(values)
    expected = total / len(values)
    imbalance = (largest - expected) / max(total - expected, 1)
    return max(0.0, 1.0 - imbalance)
