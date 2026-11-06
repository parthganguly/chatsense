"""Focused offline checks of the activated finite GLiDE body-label amendment."""
import json
from pathlib import Path
import tempfile
import unittest

from s3_a3 import dispatcher as d
from s3_a3.tests.fakes import FakeProvider, valid_response
from s3_transport.postrun import validate_recorded_responses

CANONICAL = "fastino/GLiDE"
APPROVED = ("glide", "glide_v2")


class ModelCompatibility(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        frozen = d.load_frozen()
        cls.row = frozen["rows"][1]
        cls.request = d.build_requests(frozen)[1]

    def response(self, model="glide_v2"):
        obj, headers = valid_response(self.row["id"], self.request["body"])
        obj["model"] = model
        headers = [(k, CANONICAL if k.lower() == "x-fastino-served-model" else v) for k, v in headers]
        return obj, headers

    def validate(self, obj, headers, previous=None):
        info = {}
        d._check_response((200, headers, json.dumps(obj).encode()), self.row, (CANONICAL,), None, info, previous)
        return info

    def test_active_allowlist_matches_owner_approval(self):
        self.assertEqual(d.GLIDE_BODY_MODELS, APPROVED)

    def test_approved_exact_labels(self):
        for label in APPROVED:
            with self.subTest(label=label):
                obj, headers = self.response(label)
                self.assertEqual(self.validate(obj, headers, label)["body_model_class"], label)

    def test_unknown_missing_and_nonstring_labels(self):
        for label in ("fastino/GLiDE", "glide-v1.2", "glide_v3", "GLIDE", "glide_v2 ",
                      "sensitive-provider-text", "", None, [], {}, 1, True):
            obj, headers = self.response(label)
            info = {}
            with self.subTest(label=label), self.assertRaisesRegex(d.Invalid, "MODEL_MISMATCH"):
                d._check_response((200, headers, json.dumps(obj).encode()), self.row,
                                  (CANONICAL,), None, info)
            self.assertEqual(info["body_model_class"], "other_or_missing")
            self.assertNotIn("sensitive-provider-text", json.dumps(info))
        obj, headers = self.response()
        del obj["model"]
        with self.assertRaisesRegex(d.Invalid, "MODEL_MISMATCH"):
            self.validate(obj, headers)

    def test_header_and_retention_requirements(self):
        for name, value, reason in (("x-fastino-served-model", "another-model", "CANONICAL_IDENTITY"),
                                    ("x-fastino-served-model", None, "CANONICAL_IDENTITY"),
                                    ("x-fastino-data-retention", "stored", "RETENTION"),
                                    ("x-fastino-data-retention", None, "RETENTION")):
            obj, headers = self.response()
            headers = [(k, v) for k, v in headers if k.lower() != name]
            if value is not None:
                headers.append((name, value))
            with self.subTest(name=name, value=value), self.assertRaisesRegex(d.Invalid, reason):
                self.validate(obj, headers)

    def test_malformed_answers_usage_and_json(self):
        for mutation in ("missing_answer", "bad_probability", "bad_type", "bad_usage"):
            obj, headers = self.response()
            if mutation == "missing_answer":
                del obj["answers"]["q08"]
            elif mutation == "bad_probability":
                obj["answers"]["q01"]["probabilities"]["k1"] = -1
            elif mutation == "bad_type":
                obj["answers"]["q01"]["type"] = "noul"
            else:
                obj["usage"]["input_tokens"] = True
            with self.subTest(mutation=mutation), self.assertRaises(d.Invalid):
                self.validate(obj, headers)
        _, headers = self.response()
        with self.assertRaisesRegex(d.Invalid, "JSON_INVALID"):
            d._check_response((200, headers, b'{"model":'), self.row, (CANONICAL,), None, {})

    def run_fake(self, label, drift=None):
        with tempfile.TemporaryDirectory() as tmp:
            state = Path(tmp) / "state"
            def mutate(i, obj, headers):
                if obj["model"] == "glide":
                    obj["model"] = drift if drift is not None and i == 2 else label
                    headers[:] = [(k, CANONICAL if k.lower() == "x-fastino-served-model" else v) for k, v in headers]
            fake = FakeProvider(state, mutate=mutate)
            result = d.run(state, fake, served_allowlist=(CANONICAL,))
            self.assertEqual(d.inspect(state)["errors"], [])
            with self.assertRaises(d.Refused):
                d.run(state, fake, served_allowlist=(CANONICAL,))
            accepted = validate_recorded_responses(state)
            self.assertEqual(len(accepted), sum(outcome == "VALID" for _, outcome in result["outcomes"]))
            for attempt_id, obj in accepted.items():
                if "-glide-" in attempt_id:
                    self.assertEqual(obj["model"], label)
            return result

    def test_stable_labels_complete_in_fake_run(self):
        for label in APPROVED:
            with self.subTest(label=label):
                result = self.run_fake(label)
                self.assertEqual(result["stop_reason"], "PLAN_COMPLETE")
                self.assertEqual(result["handoffs"], 32)

    def test_body_identity_drift_stops_before_fourth_handoff(self):
        for first, second in (("glide", "glide_v2"), ("glide_v2", "glide")):
            with self.subTest(first=first):
                result = self.run_fake(first, drift=second)
                self.assertEqual((result["failure"], result["handoffs"]), ("BODY_MODEL_CHANGED", 3))
                self.assertEqual(len(result["not_attempted"]), 29)


if __name__ == "__main__":
    unittest.main()
