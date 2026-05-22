from __future__ import annotations

import re
import zipfile
from datetime import datetime
from pathlib import Path

from .schemas import ChatMessage

MESSAGE_PATTERNS = [
    re.compile(
        r"^\[(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),\s*"
        r"(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]\s*"
        r"(?P<sender>.+?):\s*(?P<content>.*)$"
    ),
    re.compile(
        r"^(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),\s*"
        r"(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*-\s*"
        r"(?P<sender>.+?):\s*(?P<content>.*)$"
    ),
]


def read_chat_export(path: str | Path) -> str:
    export_path = Path(path)
    if export_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(export_path) as archive:
            text_members = [
                member
                for member in archive.namelist()
                if member.lower().endswith(".txt") and not member.endswith("/")
            ]
            if not text_members:
                raise ValueError("No .txt WhatsApp export found in zip archive.")
            with archive.open(text_members[0]) as file:
                return file.read().decode("utf-8-sig", errors="replace")

    return export_path.read_text(encoding="utf-8-sig", errors="replace")


def parse_whatsapp_chat(text: str) -> list[ChatMessage]:
    messages: list[ChatMessage] = []
    current: ChatMessage | None = None

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = _match_message_line(line)
        if match:
            if current is not None:
                messages.append(current)
            current = ChatMessage(
                timestamp=parse_timestamp(match.group("date"), match.group("time")),
                sender=match.group("sender").strip(),
                content=match.group("content").strip(),
            )
            continue

        if current is not None:
            current = ChatMessage(
                timestamp=current.timestamp,
                sender=current.sender,
                content=f"{current.content}\n{line}",
            )

    if current is not None:
        messages.append(current)

    return messages


def load_messages(path: str | Path) -> list[ChatMessage]:
    return parse_whatsapp_chat(read_chat_export(path))


def parse_timestamp(date_text: str, time_text: str) -> datetime:
    day, month, year = [int(part) for part in date_text.split("/")]
    if year < 100:
        year += 2000

    time_clean = time_text.lower().replace(" ", "")
    is_pm = time_clean.endswith("pm")
    is_am = time_clean.endswith("am")
    time_clean = time_clean.removesuffix("pm").removesuffix("am")
    parts = [int(part) for part in time_clean.split(":")]
    hour = parts[0]
    minute = parts[1] if len(parts) > 1 else 0
    second = parts[2] if len(parts) > 2 else 0

    if is_pm and hour != 12:
        hour += 12
    if is_am and hour == 12:
        hour = 0

    return datetime(year, month, day, hour, minute, second)


def _match_message_line(line: str) -> re.Match[str] | None:
    for pattern in MESSAGE_PATTERNS:
        match = pattern.match(line)
        if match:
            return match
    return None
