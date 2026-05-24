from __future__ import annotations

import zipfile
from datetime import datetime, timedelta
from pathlib import Path

SCENARIOS = {
    "normal": [
        ("Asha", "Hey, are we still meeting today?"),
        ("Ravi", "Yes, 6 works for me."),
        ("Asha", "Great, I'll book the table."),
        ("Ravi", "Thanks!"),
    ],
    "long_silence": [
        ("Asha", "Can we talk about yesterday?"),
        ("Ravi", "I need some time."),
        ("Asha", "Okay. I am here when you are ready."),
        ("Ravi", "Thanks for waiting. I can talk now."),
    ],
    "repair": [
        ("Asha", "That came out harsher than I meant."),
        ("Ravi", "I appreciate you saying that."),
        ("Asha", "Can I explain what I meant?"),
        ("Ravi", "Yes, let's reset."),
    ],
    "friendship_drift": [
        ("Asha", "Miss hanging out like before."),
        ("Ravi", "Work has been a lot lately."),
        ("Asha", "I get it. Maybe a short call this weekend?"),
        ("Ravi", "Sunday evening should work."),
    ],
    "family_group": [
        ("Mom", "Dinner is at 8."),
        ("Asha", "I may be late."),
        ("Dad", "Please tell us earlier next time."),
        ("Ravi", "I can pick her up."),
    ],
    "work": [
        ("Manager", "Can you send the deck today?"),
        ("Asha", "Yes, I will share it by 4."),
        ("Manager", "Thank you."),
        ("Asha", "Uploaded it to Drive."),
    ],
}


def generate_chat_text(scenario: str = "normal", repeat: int = 6) -> str:
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario}")

    timestamp = datetime(2026, 1, 1, 9, 0)
    lines = []
    for cycle in range(repeat):
        for sender, text in SCENARIOS[scenario]:
            lines.append(f"{timestamp.strftime('%d/%m/%Y, %H:%M')} - {sender}: {text}")
            if scenario == "long_silence" and "I need some time" in text:
                timestamp += timedelta(hours=30)
            else:
                timestamp += timedelta(minutes=5 + cycle)
    return "\n".join(lines)


def write_synthetic_txt(path: str | Path, scenario: str = "normal", repeat: int = 6) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(generate_chat_text(scenario, repeat), encoding="utf-8")
    return target


def write_synthetic_zip(path: str | Path, scenario: str = "normal", repeat: int = 6) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    text = generate_chat_text(scenario, repeat)
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("WhatsApp Chat with Synthetic Contact.txt", text)
    return target


if __name__ == "__main__":
    write_synthetic_zip("sample_data/synthetic_whatsapp_chat.zip")
