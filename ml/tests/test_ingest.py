from __future__ import annotations

import unittest
from pathlib import Path

from chatsense_ml.ingest import load_messages, parse_timestamp, parse_whatsapp_chat


ROOT = Path(__file__).resolve().parents[1]


class IngestTests(unittest.TestCase):
    def test_parse_export_with_continuation_line(self) -> None:
        text = (
            "[01/05/2026, 09:00] Alex: First line\n"
            "continued thought\n"
            "[01/05/2026, 09:02] Sam: Reply\n"
        )

        messages = parse_whatsapp_chat(text)

        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0].sender, "Alex")
        self.assertIn("continued thought", messages[0].content)

    def test_load_fixture(self) -> None:
        messages = load_messages(ROOT / "fixtures" / "sample_chat.txt")

        self.assertEqual(len(messages), 16)
        self.assertEqual({message.sender for message in messages}, {"Alex", "Sam"})

    def test_timestamp_handles_12_hour_clock(self) -> None:
        timestamp = parse_timestamp("01/05/26", "12:05 AM")

        self.assertEqual(timestamp.year, 2026)
        self.assertEqual(timestamp.hour, 0)
        self.assertEqual(timestamp.minute, 5)


if __name__ == "__main__":
    unittest.main()
