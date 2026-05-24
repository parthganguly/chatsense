from __future__ import annotations

import pytest

from chatsense_ml.importers.whatsapp import parse_export, parse_text
from chatsense_ml.synthetic.generate_chat import write_synthetic_zip


def test_parse_raw_txt_with_multiline_and_12h_time():
    text = "\n".join(
        [
            "[01/01/2026, 9:05 PM] Asha: hello",
            "continued line",
            "[01/01/2026, 9:07 PM] Ravi: hi",
        ]
    )

    conversation = parse_text(text, "sample.txt")

    assert len(conversation.messages) == 2
    assert conversation.messages[0].text == "hello\ncontinued line"
    assert conversation.messages[0].timestamp.hour == 21


def test_parse_month_first_date_when_second_component_exceeds_12():
    conversation = parse_text("05/22/2026, 21:05 - Asha: hello", "sample.txt")

    assert conversation.messages[0].timestamp.month == 5
    assert conversation.messages[0].timestamp.day == 22


def test_parse_zip_export(tmp_path):
    path = write_synthetic_zip(tmp_path / "chat.zip", "normal", repeat=1)

    conversation = parse_export(path)

    assert len(conversation.messages) == 4
    assert conversation.source_name == "chat.zip"


def test_malformed_export_raises(tmp_path):
    path = tmp_path / "bad.txt"
    path.write_text("not a chat", encoding="utf-8")

    with pytest.raises(ValueError):
        parse_export(path)
