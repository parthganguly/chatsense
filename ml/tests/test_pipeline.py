from __future__ import annotations

import unittest
from pathlib import Path

from chatsense_ml.pipeline import analyze_chat_file


ROOT = Path(__file__).resolve().parents[1]


class PipelineTests(unittest.TestCase):
    def test_analysis_contract_has_core_sections(self) -> None:
        result = analyze_chat_file(ROOT / "fixtures" / "sample_chat.txt")
        payload = result.to_json()

        self.assertEqual(payload["metadata"]["message_count"], 16)
        self.assertEqual(payload["metadata"]["participant_count"], 2)
        self.assertGreater(payload["rhythm"]["active_days"], 0)
        self.assertGreaterEqual(payload["balance"]["message_balance"], 0)
        self.assertIn("description", payload["emotional_climate"])
        self.assertGreater(len(payload["topics"]), 0)
        self.assertGreater(len(payload["moments"]), 0)
        self.assertGreater(len(payload["ask_index"]), 0)

    def test_ask_chat_returns_grounded_evidence(self) -> None:
        result = analyze_chat_file(
            ROOT / "fixtures" / "sample_chat.txt",
            question="When was there tension or hurt?",
        )

        self.assertIsNotNone(result.ask_answer)
        assert result.ask_answer is not None
        self.assertGreater(result.ask_answer.confidence, 0)
        self.assertGreater(len(result.ask_answer.evidence), 0)


if __name__ == "__main__":
    unittest.main()
