"""Focused parity checks using synthetic receipts only; never live campaign data."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from s3_a3 import dispatcher as d
from s3_a3.tests.fakes import FakeProvider
from s3_transport.postrun import validate_recorded_responses

CANONICAL = "fastino/GLiDE"


class PostRunCompatibility(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.state = Path(self.tmp.name) / "state"
        def mutate(i, obj, headers):
            if obj["model"] == "glide":
                obj["model"] = "glide_v2"
                headers[:] = [(k, CANONICAL if k.lower() == "x-fastino-served-model" else v)
                              for k, v in headers]
        result = d.run(self.state, FakeProvider(self.state, mutate=mutate),
                       served_allowlist=(CANONICAL,))
        self.assertEqual(result["stop_reason"], "PLAN_COMPLETE")
        self.paths = d.paths(self.state)
        self.ledger = [json.loads(line) for line in self.paths["ledger"].read_bytes().splitlines()]
        self.rows = d.load_frozen()["rows"]

    def replace_synthetic_response(self, row_index, transform):
        """Rehash a synthetic fixture so parity tests reach semantic checks."""
        records = copy.deepcopy(self.ledger)
        row = self.rows[row_index]
        record = next(r for r in records if r["type"] == "RESULT" and r["id"] == row["id"])
        receipt = self.paths["receipts"] / record["receipt"]
        original = receipt.read_bytes()
        raw, headers = transform(original, record["safe_headers"])
        receipt.write_bytes(raw)
        record.update(response_sha256=d._sha(raw), response_bytes=len(raw), safe_headers=headers)
        previous = d._sha(self.paths["marker"].read_bytes())
        for rec in records:
            rec["prev"] = previous
            rec["hash"] = d._digest({k: v for k, v in rec.items() if k != "hash"})
            previous = rec["hash"]
        self.paths["ledger"].write_text("".join(json.dumps(r) + "\n" for r in records))
        return original, receipt, row, raw, headers

    def test_live_postrun_rejection_parity(self):
        def body_change(change):
            def transform(raw, headers):
                obj = json.loads(raw)
                change(obj)
                return json.dumps(obj).encode(), headers
            return transform
        def header_change(name, value):
            def transform(raw, headers):
                headers[name] = value
                return raw, headers
            return transform
        cases = [
            ("unknown", body_change(lambda o: o.update(model="glide_v3")), "MODEL_MISMATCH"),
            ("case", body_change(lambda o: o.update(model="GLIDE_V2")), "MODEL_MISMATCH"),
            ("missing", body_change(lambda o: o.pop("model")), "MODEL_MISMATCH"),
            ("served", header_change("x-fastino-served-model", "wrong"), "CANONICAL_IDENTITY"),
            ("retention", header_change("x-fastino-data-retention", "stored"), "RETENTION"),
            ("answers", body_change(lambda o: o["answers"].pop("q08")), "ANSWERS_INVALID"),
            ("probability", body_change(lambda o: o["answers"]["q01"]["probabilities"].update(k1=-1)), "PROBABILITY_INVALID"),
            ("usage", body_change(lambda o: o["usage"].update(input_tokens=True)), "USAGE_INVALID"),
            ("json", lambda raw, headers: (b'{"model":', headers), "JSON_INVALID"),
        ]
        for name, transform, code in cases:
            with self.subTest(name=name):
                original, receipt, row, raw, headers = self.replace_synthetic_response(1, transform)
                self.assertEqual(d.inspect(self.state)["errors"], [])
                with self.assertRaisesRegex(d.Invalid, code):
                    d._check_response((200, list(headers.items()), raw), row, (CANONICAL,), None, {})
                with self.assertRaisesRegex(d.Invalid, code):
                    validate_recorded_responses(self.state)
                receipt.write_bytes(original)

    def test_postrun_rejects_body_identity_change(self):
        def change(raw, headers):
            obj = json.loads(raw)
            obj["model"] = "glide"
            return json.dumps(obj).encode(), headers
        self.replace_synthetic_response(2, change)
        self.assertEqual(d.inspect(self.state)["errors"], [])
        with self.assertRaisesRegex(d.Invalid, "BODY_MODEL_CHANGED"):
            validate_recorded_responses(self.state)

    def test_read_only_and_original_labels_preserved(self):
        before = {p: p.read_bytes() for p in self.state.rglob("*") if p.is_file()}
        accepted = validate_recorded_responses(self.state)
        self.assertEqual(len(accepted), 32)
        for row in self.rows:
            self.assertEqual(accepted[row["id"]]["model"],
                             "glide_v2" if row["provider"] == "glide" else "jev-1.14.0")
        self.assertEqual(before, {p: p.read_bytes() for p in self.state.rglob("*") if p.is_file()})

    def test_rejects_broken_receipt_integrity(self):
        receipt = next(self.paths["receipts"].iterdir())
        receipt.write_bytes(b"{}")
        with self.assertRaisesRegex(d.Invalid, "POSTRUN_LEDGER_INVALID"):
            validate_recorded_responses(self.state)


if __name__ == "__main__":
    unittest.main()
