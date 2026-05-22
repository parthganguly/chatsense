from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class ChatMessage:
    timestamp: datetime
    sender: str
    content: str

    def to_json(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "sender": self.sender,
            "content": self.content,
        }


@dataclass(frozen=True)
class ParticipantStats:
    sender: str
    messages: int
    words: int
    characters: int
    questions: int
    starts: int
    avg_words_per_message: float


@dataclass(frozen=True)
class ReplyStats:
    average_minutes: float
    median_minutes: float
    quick_reply_rate: float
    reply_pairs: int


@dataclass(frozen=True)
class RhythmSummary:
    first_message_at: str
    last_message_at: str
    active_days: int
    total_messages: int
    messages_per_active_day: float
    peak_hour: int
    peak_day: str
    longest_silence_hours: float
    reply_stats: ReplyStats


@dataclass(frozen=True)
class BalanceSummary:
    participant_stats: list[ParticipantStats]
    initiation_balance: float
    message_balance: float
    question_balance: float
    description: str


@dataclass(frozen=True)
class EmotionalDay:
    date: str
    sentiment: float
    warmth: float
    tension: float
    support: float
    message_count: int


@dataclass(frozen=True)
class EmotionalClimate:
    average_sentiment: float
    recent_sentiment: float
    trend: float
    warmest_day: str | None
    tensest_day: str | None
    daily: list[EmotionalDay]
    description: str


@dataclass(frozen=True)
class TopicCluster:
    id: str
    label: str
    keywords: list[str]
    document_count: int
    message_count: int
    date_range: list[str]
    sample_messages: list[str]


@dataclass(frozen=True)
class Moment:
    date: str
    type: str
    title: str
    description: str
    score: float
    evidence: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class AskSnippet:
    id: str
    date_range: list[str]
    senders: list[str]
    text: str
    keywords: list[str]


@dataclass(frozen=True)
class AskAnswer:
    question: str
    answer: str
    confidence: float
    evidence: list[AskSnippet]


@dataclass(frozen=True)
class AnalysisResult:
    version: str
    generated_at: str
    metadata: dict[str, Any]
    rhythm: RhythmSummary
    balance: BalanceSummary
    emotional_climate: EmotionalClimate
    topics: list[TopicCluster]
    moments: list[Moment]
    ask_index: list[AskSnippet]
    ask_answer: AskAnswer | None = None

    def to_json(self) -> dict[str, Any]:
        return asdict(self)
