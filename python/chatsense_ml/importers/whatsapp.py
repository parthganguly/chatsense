from __future__ import annotations

import hashlib
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from chatsense_ml.contract import (
    DATE_ORDER_DEFAULT,
    DELETED_MARKERS,
    MEDIA_MARKERS,
    TWO_DIGIT_YEAR_PIVOT,
)
from chatsense_ml.schemas import ChatMessage, Conversation, MessageType

_DATE_PREFIX = re.compile(r"^\[?(\d{1,2})/(\d{1,2})/\d{2,4}")

PATTERNS = [
    re.compile(
        r"^\[(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),\s*(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]\s*(?P<sender>.+?):\s*(?P<text>.*)$"
    ),
    re.compile(
        r"^(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),\s*(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*-\s*(?P<sender>.+?):\s*(?P<text>.*)$"
    ),
]

SYSTEM_PATTERNS = [
    re.compile(
        r"^\[(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),\s*(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]\s*(?P<text>.+)$"
    ),
    re.compile(
        r"^(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),\s*(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*-\s*(?P<text>.+)$"
    ),
]


@dataclass(frozen=True)
class RawExport:
    source_name: str
    text: str


def load_export(path: str | Path) -> RawExport:
    export_path = Path(path)
    if not export_path.exists():
        raise FileNotFoundError(export_path)

    if export_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(export_path) as archive:
            txt_names = [
                name
                for name in archive.namelist()
                if not name.endswith("/") and name.lower().endswith(".txt")
            ]
            preferred = [name for name in txt_names if "whatsapp chat" in name.lower()]
            if not txt_names:
                raise ValueError("No WhatsApp chat .txt file found inside ZIP.")
            chat_name = preferred[0] if preferred else txt_names[0]
            data = archive.read(chat_name)
            return RawExport(source_name=export_path.name, text=_decode_text(data))

    if export_path.suffix.lower() != ".txt":
        raise ValueError("Expected a WhatsApp .zip or .txt export.")

    return RawExport(source_name=export_path.name, text=_decode_text(export_path.read_bytes()))


def parse_export(path: str | Path) -> Conversation:
    raw = load_export(path)
    parsed = parse_text(raw.text, raw.source_name)
    if not parsed.messages:
        raise ValueError("No parseable WhatsApp messages found.")
    return parsed


def parse_text(text: str, source_name: str | None = None) -> Conversation:
    conversation_id = _stable_id(text)
    date_order = _infer_date_order(text)
    messages: list[ChatMessage] = []
    current: dict[str, object] | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = _match_message(line, date_order)
        if match:
            if current:
                messages.append(_to_message(conversation_id, len(messages), current))
            current = match
            continue

        system_match = _match_system(line, date_order)
        if system_match:
            if current:
                messages.append(_to_message(conversation_id, len(messages), current))
            current = system_match
            continue

        if current:
            current["text"] = f"{current['text']}\n{line}"

    if current:
        messages.append(_to_message(conversation_id, len(messages), current))

    return Conversation(
        conversation_id=conversation_id,
        source_name=source_name,
        messages=messages,
    )


def _infer_date_order(text: str) -> str:
    """Infer one date order for the entire export (canonical contract policy).

    Mirrors lib/chat-parser.ts: scan timestamped lines in order; the first line
    whose first component exceeds 12 forces DMY, the first whose second component
    exceeds 12 forces MDY, otherwise default. The single order applies to every
    row -- the order is never decided per row.
    """
    for raw_line in text.splitlines():
        match = _DATE_PREFIX.match(raw_line.strip())
        if not match:
            continue
        first = int(match.group(1))
        second = int(match.group(2))
        if first > 12:
            return "dmy"
        if second > 12:
            return "mdy"
    return DATE_ORDER_DEFAULT


def _match_message(line: str, date_order: str) -> dict[str, object] | None:
    for pattern in PATTERNS:
        match = pattern.match(line)
        if match:
            text = match.group("text").strip()
            return {
                "timestamp": _parse_datetime(match.group("date"), match.group("time"), date_order),
                "sender": match.group("sender").strip(),
                "text": text,
                "message_type": _classify_message(text),
            }
    return None


def _match_system(line: str, date_order: str) -> dict[str, object] | None:
    for pattern in SYSTEM_PATTERNS:
        match = pattern.match(line)
        if match:
            text = match.group("text").strip()
            return {
                "timestamp": _parse_datetime(match.group("date"), match.group("time"), date_order),
                "sender": "System",
                "text": text,
                "message_type": "system",
            }
    return None


def _to_message(conversation_id: str, index: int, data: dict[str, object]) -> ChatMessage:
    text = str(data["text"])
    message_type = data["message_type"]
    message_id = _stable_id(f"{conversation_id}:{index}:{data['timestamp']}:{data['sender']}:{text}")
    return ChatMessage(
        conversation_id=conversation_id,
        message_id=message_id,
        message_index=index,
        timestamp=data["timestamp"],  # type: ignore[arg-type]
        sender=str(data["sender"]),
        text=text,
        message_type=message_type,  # type: ignore[arg-type]
        contains_media=message_type == "media",
        is_deleted=message_type == "deleted",
    )


def _parse_datetime(date_text: str, time_text: str, date_order: str = DATE_ORDER_DEFAULT) -> datetime:
    first, second, year = [int(part) for part in date_text.split("/")]
    if date_order == "mdy":
        month, day = first, second
    else:
        day, month = first, second
    if year < 100:
        year += TWO_DIGIT_YEAR_PIVOT

    cleaned = time_text.strip().lower().replace(" ", "")
    is_pm = cleaned.endswith("pm")
    is_am = cleaned.endswith("am")
    cleaned = cleaned.removesuffix("pm").removesuffix("am")
    parts = [int(part) for part in cleaned.split(":")]
    hour, minute = parts[0], parts[1]
    second = parts[2] if len(parts) > 2 else 0

    if is_pm and hour != 12:
        hour += 12
    if is_am and hour == 12:
        hour = 0

    return datetime(year, month, day, hour, minute, second)


def _classify_message(text: str) -> MessageType:
    lowered = text.lower()
    if any(marker in lowered for marker in DELETED_MARKERS):
        return "deleted"
    if any(marker in lowered for marker in MEDIA_MARKERS):
        return "media"
    return "text"


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _stable_id(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]
