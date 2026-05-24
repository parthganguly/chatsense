from __future__ import annotations

import hashlib
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from chatsense_ml.schemas import ChatMessage, Conversation, MessageType

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
    messages: list[ChatMessage] = []
    current: dict[str, object] | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = _match_message(line)
        if match:
            if current:
                messages.append(_to_message(conversation_id, len(messages), current))
            current = match
            continue

        system_match = _match_system(line)
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


def _match_message(line: str) -> dict[str, object] | None:
    for pattern in PATTERNS:
        match = pattern.match(line)
        if match:
            text = match.group("text").strip()
            return {
                "timestamp": _parse_datetime(match.group("date"), match.group("time")),
                "sender": match.group("sender").strip(),
                "text": text,
                "message_type": _classify_message(text),
            }
    return None


def _match_system(line: str) -> dict[str, object] | None:
    for pattern in SYSTEM_PATTERNS:
        match = pattern.match(line)
        if match:
            text = match.group("text").strip()
            return {
                "timestamp": _parse_datetime(match.group("date"), match.group("time")),
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


def _parse_datetime(date_text: str, time_text: str) -> datetime:
    first, second, year = [int(part) for part in date_text.split("/")]
    if second > 12 and first <= 12:
        month, day = first, second
    else:
        day, month = first, second
    if year < 100:
        year += 2000

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
    if "message was deleted" in lowered or "deleted this message" in lowered:
        return "deleted"
    if "media omitted" in lowered or "<attached:" in lowered:
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
