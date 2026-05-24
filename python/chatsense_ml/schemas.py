from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

MessageType = Literal["text", "media", "deleted", "system"]


class ChatMessage(BaseModel):
    conversation_id: str
    message_id: str
    message_index: int = Field(ge=0)
    timestamp: datetime
    sender: str
    text: str
    message_type: MessageType = "text"
    contains_media: bool = False
    is_deleted: bool = False
    reply_to: str | None = None


class Conversation(BaseModel):
    conversation_id: str
    source_name: str | None
    messages: list[ChatMessage]


class AnalysisPaths(BaseModel):
    report: str
    features: str | None = None
