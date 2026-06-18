"""Deterministic shared fixtures for cross-language parity tests.

Each entry is a synthetic WhatsApp export (no real chat data). The exact bytes are
committed under ``fixtures/whatsapp/`` so the TypeScript runtime and the Python
reference read identical input. Timestamps are chosen so peak hour/weekday are
unambiguous and gaps are never near the silence threshold, keeping the normalized
parity output fully deterministic across both implementations.

Run ``python -m chatsense_ml.synthetic.fixtures`` to (re)write fixture ``.txt``
files. Run ``python -m chatsense_ml.synthetic.fixtures --expected`` only when
intentionally regenerating committed parity golden outputs.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path


def _line(timestamp: datetime, sender: str, text: str) -> str:
    return f"{timestamp.strftime('%d/%m/%Y, %H:%M')} - {sender}: {text}"


def _windowed_chat(name: str, windows: int = 6, dominant_late: bool = False, initiator_late: str | None = None) -> str:
    lines: list[str] = []
    start = datetime(2026, 3, 1, 9, 0)
    for window in range(windows):
        base = start + timedelta(days=window * 7)
        for day_offset in [0, 1]:
            day = base + timedelta(days=day_offset)
            for item in range(10):
                if initiator_late and item == 0:
                    sender = initiator_late if window >= windows - 2 else "Asha"
                elif dominant_late and window >= windows - 2:
                    sender = "Asha" if item < 8 else "Ravi"
                else:
                    sender = "Asha" if item % 2 == 0 else "Ravi"
                lines.append(_line(day + timedelta(minutes=item * 12), sender, f"{name} w{window} d{day_offset} m{item}"))
        if window < windows - 1:
            # Force the next window's first message to be a new thread.
            lines.append(_line(base + timedelta(days=2, hours=8), "Ravi", f"{name} bridge {window}"))
    return "\n".join(lines)


def _reply_slowdown_chat() -> str:
    lines: list[str] = []
    start = datetime(2026, 4, 1, 9, 0)
    for window in range(6):
        base = start + timedelta(days=window * 7)
        for day_offset in [0, 1]:
            day = base + timedelta(days=day_offset)
            for pair in range(5):
                # Keep the export chronological even when late-window replies
                # are intentionally slower than the early-window baseline.
                sent = day + timedelta(minutes=pair * 120)
                delay = 5 if window < 2 else 90
                lines.append(_line(sent, "Asha", f"prompt {window}-{day_offset}-{pair}"))
                lines.append(_line(sent + timedelta(minutes=delay), "Ravi", f"reply {window}-{day_offset}-{pair}"))
    return "\n".join(lines)


def _multi_reconnector_chat() -> str:
    lines: list[str] = []
    timestamp = datetime(2026, 5, 1, 9, 0)
    reconnectors = ["Asha", "Ravi", "Priya", "Asha"]
    for index, sender in enumerate(reconnectors):
        lines.append(_line(timestamp, sender, f"restart {index}"))
        lines.append(_line(timestamp + timedelta(minutes=5), "Ravi" if sender != "Ravi" else "Asha", f"reply {index}"))
        timestamp += timedelta(hours=30)
    return "\n".join(lines)


def _boundary_chat() -> str:
    base = datetime(2026, 6, 1, 9, 0)
    events = [
        (0, "Asha", "start"),
        (14, "Asha", "not follow up yet"),
        (29, "Asha", "exact 15 minute follow up"),
        (389, "Asha", "exact six hour new thread"),
        (1829, "Ravi", "exact twenty four hour reconnection"),
        (1844, "Ravi", "exact 15 minute follow up after restart"),
    ]
    return "\n".join(_line(base + timedelta(minutes=minutes), sender, text) for minutes, sender, text in events)

# name -> WhatsApp export text (LF line endings).
FIXTURES: dict[str, str] = {
    # 1. Normal two-person conversation.
    "normal": "\n".join(
        [
            "01/02/2026, 09:00 - Asha: Morning!",
            "01/02/2026, 09:03 - Ravi: Hey, good morning.",
            "01/02/2026, 09:05 - Asha: Coffee later?",
            "01/02/2026, 09:40 - Ravi: Sure, 11 works.",
            "01/02/2026, 10:30 - Asha: See you then.",
        ]
    ),
    # 2. Consecutive messages from the same sender (must NOT create artificial replies).
    "consecutive_same_sender": "\n".join(
        [
            "02/02/2026, 14:00 - Asha: One.",
            "02/02/2026, 14:01 - Asha: Two.",
            "02/02/2026, 14:02 - Asha: Three.",
            "02/02/2026, 14:30 - Ravi: Finally a reply.",
            "02/02/2026, 14:35 - Ravi: And another from me.",
        ]
    ),
    # 3. Long silence (multi-day gap well above the thread/silence threshold).
    "long_silence": "\n".join(
        [
            "03/02/2026, 08:00 - Asha: You around?",
            "03/02/2026, 08:05 - Ravi: Yeah, what's up?",
            "03/02/2026, 08:10 - Asha: Need to talk later.",
            "05/02/2026, 20:00 - Ravi: Sorry, was swamped.",
            "05/02/2026, 20:10 - Asha: No worries.",
        ]
    ),
    # 4. Ambiguous day/month dates; the first line (day 13) forces DMY for the whole export.
    "ambiguous_dates": "\n".join(
        [
            "13/02/2026, 07:00 - Asha: Day is 13 so this export is DMY.",
            "13/02/2026, 07:05 - Ravi: Understood.",
            "13/02/2026, 07:30 - Asha: Good.",
            "13/02/2026, 08:00 - Ravi: Talk soon.",
        ]
    ),
    # 5. Deleted message.
    "deleted_message": "\n".join(
        [
            "06/02/2026, 11:00 - Asha: Did you see my message?",
            "06/02/2026, 11:02 - Ravi: This message was deleted",
            "06/02/2026, 11:05 - Asha: Oh it got deleted.",
        ]
    ),
    # 6. Omitted media.
    "omitted_media": "\n".join(
        [
            "07/02/2026, 16:00 - Asha: <Media omitted>",
            "07/02/2026, 16:01 - Ravi: Nice pic!",
            "07/02/2026, 16:03 - Asha: Thanks!",
        ]
    ),
    # 7. System notice line (no 'Sender:'): excluded from behavioral metrics by both sides.
    "system_message": "\n".join(
        [
            "08/02/2026, 12:00 - Asha: Hi all",
            "08/02/2026, 12:01 - Messages and calls are end-to-end encrypted.",
            "08/02/2026, 12:05 - Ravi: Hey",
            "08/02/2026, 12:10 - Asha: Welcome",
        ]
    ),
    # 8. Friendship / activity decline across several days.
    "activity_decline": "\n".join(
        [
            "09/02/2026, 18:00 - Asha: Want to hang this weekend?",
            "09/02/2026, 18:05 - Ravi: Maybe, will check.",
            "09/02/2026, 18:30 - Asha: Cool.",
            "12/02/2026, 19:00 - Asha: Still on?",
            "16/02/2026, 20:00 - Ravi: Sorry, busy lately.",
        ]
    ),
    # 9. Group chat with three participants.
    "group_chat": "\n".join(
        [
            "10/02/2026, 10:00 - Asha: Dinner tonight?",
            "10/02/2026, 10:02 - Ravi: I'm in.",
            "10/02/2026, 10:05 - Priya: Me too!",
            "10/02/2026, 10:06 - Asha: Great, 8pm.",
            "10/02/2026, 10:20 - Priya: See you.",
        ]
    ),
    # Stage 4 relationship-dynamics matrix.
    "stage4_balanced_then_one_sided": _windowed_chat("balanced_then_one_sided", dominant_late=True),
    "stage4_increasing_initiation": _windowed_chat("increasing_initiation", initiator_late="Ravi"),
    "stage4_reply_slowdown": _reply_slowdown_chat(),
    "stage4_multi_reconnectors": _multi_reconnector_chat(),
    "stage4_same_sender_burst_turn": "\n".join(
        [
            "01/07/2026, 09:00 - Asha: one",
            "01/07/2026, 09:02 - Asha: two",
            "01/07/2026, 09:04 - Asha: three",
            "01/07/2026, 09:20 - Ravi: reply",
        ]
    ),
    "stage4_followup_15_min_boundary": "\n".join(
        [
            "02/07/2026, 09:00 - Asha: start",
            "02/07/2026, 09:14 - Asha: too soon",
            "02/07/2026, 09:29 - Asha: exact boundary follow up",
            "02/07/2026, 09:40 - Ravi: reply",
        ]
    ),
    "stage4_six_hour_thread_boundary": "\n".join(
        [
            "03/07/2026, 09:00 - Asha: start",
            "03/07/2026, 15:00 - Asha: exact six hour new thread",
            "03/07/2026, 15:05 - Ravi: reply",
        ]
    ),
    "stage4_insufficient_export": "\n".join(
        [
            "04/07/2026, 09:00 - Asha: tiny",
            "04/07/2026, 09:05 - Ravi: tiny reply",
        ]
    ),
    "stage4_group_reply_edges": "\n".join(
        [
            "05/07/2026, 10:00 - Asha: plan?",
            "05/07/2026, 10:03 - Ravi: yes",
            "05/07/2026, 10:04 - Priya: also yes",
            "05/07/2026, 10:08 - Dev: I can join",
            "05/07/2026, 10:10 - Asha: booked",
        ]
    ),
    "stage4_final_open_turn": "\n".join(
        [
            "06/07/2026, 09:00 - Asha: morning",
            "06/07/2026, 09:05 - Ravi: hey",
            "06/07/2026, 09:20 - Asha: question",
            "06/07/2026, 09:35 - Asha: follow up still open",
        ]
    ),
    "stage4_partial_final_window": "\n".join(
        [
            "07/07/2026, 09:00 - Asha: day one",
            "07/07/2026, 09:05 - Ravi: reply",
            "15/07/2026, 09:00 - Asha: partial next window",
            "15/07/2026, 09:05 - Ravi: reply",
        ]
    ),
    "stage4_exact_boundaries": _boundary_chat(),
}


def fixtures_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "fixtures" / "whatsapp"


def expected_dir() -> Path:
    return Path(__file__).resolve().parents[3] / "fixtures" / "expected"


def write_fixtures(target_dir: str | Path | None = None) -> list[Path]:
    directory = Path(target_dir) if target_dir is not None else fixtures_dir()
    directory.mkdir(parents=True, exist_ok=True)
    written = []
    for name, text in FIXTURES.items():
        path = directory / f"{name}.txt"
        # Commit LF bytes so both languages read identical input regardless of OS.
        path.write_bytes((text + "\n").encode("utf-8"))
        written.append(path)
    return written


def write_expected_outputs(target_dir: str | Path | None = None) -> list[Path]:
    """Regenerate golden parity JSON from the Python reference normalizer."""
    from chatsense_ml.parity import normalized_parity_from_text

    directory = Path(target_dir) if target_dir is not None else expected_dir()
    directory.mkdir(parents=True, exist_ok=True)
    written = []
    for name, text in FIXTURES.items():
        path = directory / f"{name}.json"
        payload = normalized_parity_from_text(text + "\n", f"{name}.txt")
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written.append(path)
    return written


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--expected",
        action="store_true",
        help="also regenerate committed fixtures/expected/*.json golden parity outputs",
    )
    args = parser.parse_args()

    for path in write_fixtures():
        print(f"wrote {path}")
    if args.expected:
        for path in write_expected_outputs():
            print(f"wrote {path}")
