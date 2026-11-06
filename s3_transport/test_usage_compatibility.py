"""Offline checks of the proposed independent GLiDE usage-counter contract."""
import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from s3_a3 import dispatcher as d
from s3_a3.tests.fakes import FakeProvider, valid_response
from s3_transport.postrun import validate_recorded_responses

CANONICAL = "fastino/GLiDE"
CANARY = "PRIVATE_USAGE_CANARY"


class UsageCompatibility(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.frozen = d.load_frozen()
        cls.requests = d.build_requests(cls.frozen)
        cls.row = cls.frozen["rows"][1]

    def response(self, triple=(137, 0, 216), provider="glide"):
        index = 1 if provider == "glide" else 0
        row = self.frozen["rows"][index]
        obj, headers = valid_response(row["id"], self.requests[index]["body"])
        obj["usage"] = dict(zip(("input_tokens", "output_tokens"), triple[:2]))
        if provider == "glide":
            obj.update(model="glide_v2", token_usage=triple[2])
            headers = [(k, CANONICAL if k.lower() == "x-fastino-served-model" else v)
                       for k, v in headers]
        return obj, headers, row

    def check(self, obj, headers, row=None, previous=None):
        info = {}
        result = d._check_response((200, headers, json.dumps(obj).encode()), row or self.row,
                                   (CANONICAL,), None, info, previous)
        return result, info

    def invalid_usage(self, obj, headers, subtype, code="USAGE_INVALID", row=None):
        info = {}
        with self.assertRaisesRegex(d.Invalid, "^" + code + "$"):
            d._check_response((200, headers, json.dumps(obj).encode()), row or self.row,
                              (CANONICAL,), None, info)
        self.assertEqual(info["usage_failure"], subtype)
        self.assertNotIn("usage", info)
        self.assertNotIn("token_usage", info)
        self.assertNotIn("provisional_input_nano_usd", info)
        self.assertNotIn(CANARY, json.dumps(info))

    def test_pending_default_keeps_equality(self):
        self.assertIs(d.GLIDE_INDEPENDENT_TOKEN_USAGE, False)
        obj, headers, _ = self.response()
        self.invalid_usage(obj, headers, "TOKEN_USAGE_SUM_MISMATCH")
        obj["token_usage"] = 137
        self.check(obj, headers)

    def test_historical_counts_and_cost_basis(self):
        obj, headers, _ = self.response()
        original = copy.deepcopy(obj)
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            result, info = self.check(obj, headers)
        self.assertEqual(result, original)
        self.assertEqual(info["usage"], {"input_tokens": 137, "output_tokens": 0})
        self.assertEqual(info["provisional_input_nano_usd"], 5480)
        self.assertNotIn("usage_failure", info)

    def test_ordinary_zero_and_independent_boundaries(self):
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            for triple in ((89, 1, 90), (743, 252, 995), (0, 0, 0),
                           (137, 0, 0), (137, 0, d.USAGE_MAX),
                           (d.INPUT_BOUND["glide"], d.USAGE_MAX, d.USAGE_MAX)):
                for label in ("glide", "glide_v2"):
                    with self.subTest(triple=triple, label=label):
                        obj, headers, _ = self.response(triple)
                        obj["model"] = label
                        result, info = self.check(obj, headers)
                        self.assertEqual(result["token_usage"], triple[2])
                        self.assertEqual(info["provisional_input_nano_usd"], triple[0] * 40)

    def test_independent_maximum_is_also_pending(self):
        # Previously equality could admit a total above USAGE_MAX; do not silently
        # change that active accepted set before the proposed independent bound.
        obj, headers, _ = self.response((1, d.USAGE_MAX, d.USAGE_MAX + 1))
        self.check(obj, headers)
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            self.invalid_usage(obj, headers, "TOKEN_USAGE_EXCESSIVE")

    def test_required_usage_object_and_fields(self):
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            obj, headers, _ = self.response()
            del obj["usage"]
            self.invalid_usage(obj, headers, "USAGE_MISSING")
            for value in (None, [], True, 137, CANARY):
                obj, headers, _ = self.response()
                obj["usage"] = value
                self.invalid_usage(obj, headers, "USAGE_TYPE")
            for field in ("input_tokens", "output_tokens", "token_usage"):
                obj, headers, _ = self.response()
                target = obj if field == "token_usage" else obj["usage"]
                del target[field]
                self.invalid_usage(obj, headers, field.upper() + "_MISSING")

    def test_incorrect_types_negative_and_excessive_counters(self):
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            for field in ("input_tokens", "output_tokens", "token_usage"):
                for value, suffix in [(v, "TYPE") for v in
                                      (True, False, None, 137.0, "137", CANARY, [], {"private": CANARY})] + [
                                          (-1, "NEGATIVE"), (d.USAGE_MAX + 1, "EXCESSIVE")]:
                    with self.subTest(field=field, value=value):
                        obj, headers, _ = self.response()
                        target = obj if field == "token_usage" else obj["usage"]
                        target[field] = value
                        self.invalid_usage(obj, headers, field.upper() + "_" + suffix)

    def test_input_bound_and_jev_contract_unchanged(self):
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            for provider in ("jev", "glide"):
                obj, headers, row = self.response((137, 0, 216), provider)
                _, info = self.check(obj, headers, row)
                self.assertEqual(info["provisional_input_nano_usd"], 137 * d.NANO_USD_PER_INPUT_TOKEN[provider])
                obj["usage"]["input_tokens"] = d.INPUT_BOUND[provider] + 1
                self.invalid_usage(obj, headers, "INPUT_BOUND", "USAGE_BOUND", row)

    def test_identity_retention_answers_and_probabilities_still_required(self):
        with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            for mutation, reason in (("model", "MODEL_MISMATCH"), ("served", "CANONICAL_IDENTITY"),
                                     ("retention", "RETENTION"), ("answer", "ANSWERS_INVALID"),
                                     ("type", "ANSWERS_INVALID"), ("probability", "PROBABILITY_INVALID")):
                obj, headers, _ = self.response()
                if mutation == "model":
                    obj["model"] = "unknown"
                elif mutation in ("served", "retention"):
                    name = "x-fastino-served-model" if mutation == "served" else "x-fastino-data-retention"
                    headers = [(k, "wrong" if k.lower() == name else v) for k, v in headers]
                elif mutation == "answer":
                    del obj["answers"]["q08"]
                elif mutation == "type":
                    obj["answers"]["q01"]["type"] = "noul"
                else:
                    obj["answers"]["q01"]["probabilities"]["k1"] = -1
                with self.subTest(mutation=mutation), self.assertRaisesRegex(d.Invalid, reason):
                    self.check(obj, headers)
            obj, headers, _ = self.response()
            with self.assertRaisesRegex(d.Invalid, "BODY_MODEL_CHANGED"):
                self.check(obj, headers, previous="glide")

    def fixture_run(self, state, bad=False):
        def mutate(i, obj, headers):
            if obj["model"] == "glide":
                obj.update(model="glide_v2", usage={"input_tokens": CANARY if bad else 137,
                                                  "output_tokens": 0}, token_usage=216)
                headers[:] = [(k, CANONICAL if k.lower() == "x-fastino-served-model" else v)
                              for k, v in headers]
        return d.run(state, FakeProvider(state, mutate=mutate), served_allowlist=(CANONICAL,))

    def test_fake_live_and_postrun_accept_historical_counts_without_normalizing(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            state = Path(tmp) / "state"
            result = self.fixture_run(state)
            self.assertEqual((result["stop_reason"], result["handoffs"]), ("PLAN_COMPLETE", 32))
            before = {p: p.read_bytes() for p in state.rglob("*") if p.is_file()}
            accepted = validate_recorded_responses(state)
            self.assertEqual(len(accepted), 32)
            for row in self.frozen["rows"]:
                if row["provider"] == "glide":
                    obj = accepted[row["id"]]
                    self.assertEqual((obj["usage"]["input_tokens"], obj["usage"]["output_tokens"], obj["token_usage"]), (137, 0, 216))
            self.assertEqual(before, {p: p.read_bytes() for p in state.rglob("*") if p.is_file()})
            records = [json.loads(x) for x in d.paths(state)["ledger"].read_bytes().splitlines()]
            costs = [r["provisional_input_nano_usd"] for r in records
                     if r["type"] == "RESULT" and "-glide-" in r["id"]]
            self.assertEqual(costs, [5480] * 16)
            with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", False), self.assertRaisesRegex(d.Invalid, "USAGE_INVALID"):
                validate_recorded_responses(state)

    def test_rejected_attempts_stay_rejected_and_diagnostic_is_bounded(self):
        for proposed, bad, subtype in ((False, False, "TOKEN_USAGE_SUM_MISMATCH"),
                                       (True, True, "INPUT_TOKENS_TYPE")):
            with tempfile.TemporaryDirectory() as tmp, patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", proposed):
                state = Path(tmp) / "state"
                result = self.fixture_run(state, bad)
                self.assertEqual((result["failure"], result["handoffs"]), ("USAGE_INVALID", 2))
                paths = d.paths(state)
                raw = paths["ledger"].read_bytes()
                self.assertNotIn(CANARY.encode(), raw)
                records = [json.loads(x) for x in raw.splitlines()]
                failure = next(r for r in records if r.get("outcome") == "USAGE_INVALID")
                self.assertEqual(failure["usage_failure"], subtype)
                for name in ("usage", "provisional_input_nano_usd", "receipt"):
                    self.assertNotIn(name, failure)
                with patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
                    accepted = validate_recorded_responses(state)
                self.assertEqual(set(accepted), {self.frozen["rows"][0]["id"]})
                self.assertEqual(len(list(paths["receipts"].iterdir())), 1)

    def test_live_postrun_malformed_usage_parity(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(d, "GLIDE_INDEPENDENT_TOKEN_USAGE", True):
            state = Path(tmp) / "state"
            self.fixture_run(state)
            paths = d.paths(state)
            base = [json.loads(x) for x in paths["ledger"].read_bytes().splitlines()]
            result = next(r for r in base if r.get("id") == self.row["id"] and r["type"] == "RESULT")
            receipt = paths["receipts"] / result["receipt"]
            original = receipt.read_bytes()
            for field, value, missing in (("token_usage", None, True), ("output_tokens", None, True),
                                           ("token_usage", True, False), ("input_tokens", -1, False),
                                           ("token_usage", d.USAGE_MAX + 1, False)):
                obj = json.loads(original)
                target = obj if field == "token_usage" else obj["usage"]
                if missing:
                    del target[field]
                else:
                    target[field] = value
                raw = json.dumps(obj).encode()
                receipt.write_bytes(raw)
                records = copy.deepcopy(base)
                rec = next(r for r in records if r.get("id") == self.row["id"] and r["type"] == "RESULT")
                rec.update(response_sha256=d._sha(raw), response_bytes=len(raw))
                previous = d._sha(paths["marker"].read_bytes())
                for rec in records:
                    rec["prev"] = previous
                    rec["hash"] = d._digest({k: v for k, v in rec.items() if k != "hash"})
                    previous = rec["hash"]
                paths["ledger"].write_text("".join(json.dumps(r) + "\n" for r in records))
                self.assertEqual(d.inspect(state)["errors"], [])
                with self.assertRaisesRegex(d.Invalid, "USAGE_INVALID"):
                    self.check(obj, list(result["safe_headers"].items()))
                with self.assertRaisesRegex(d.Invalid, "USAGE_INVALID"):
                    validate_recorded_responses(state)


if __name__ == "__main__":
    unittest.main()
