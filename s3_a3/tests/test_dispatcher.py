"""Offline tests for the S3 A3 one-shot dispatcher. Fake transport only."""
import ast
import errno
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
import types
import unittest
from pathlib import Path
from unittest import mock

from fakes import CANARY, PACKET, ROWS, SERVED, FakeProvider, ledger_path
import dispatcher as d

HERE = Path(__file__).resolve().parent
IDS = [r["id"] for r in ROWS]
ENV = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")


def tree_bytes(root):
    out = {}
    for p in sorted(Path(root).rglob("*")):
        if p.is_file():
            st = p.stat()
            out[str(p)] = (p.read_bytes(), st.st_mtime_ns, st.st_size)
    return out


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="s3a3-")
        self.state = os.path.join(self.tmp, "state")
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def run_fake(self, mutate=None, clock=None, packet=d.PACKET, on_handoff=None, allow=(SERVED,)):
        fake = FakeProvider(self.state, mutate=mutate, on_handoff=on_handoff)
        kw = {"clock": clock} if clock else {}
        summary = d.run(self.state, fake, served_allowlist=allow, packet=packet, **kw)
        self.assertEqual(fake.errors, [], "oracle rejected a handoff")
        return summary, fake

    def assert_no_canary(self, summary=None):
        for path, (data, _, _) in tree_bytes(self.state).items():
            self.assertNotIn(CANARY.lower().encode(), data.lower(), path)
        self.assertNotIn(CANARY.lower(), repr(summary).lower())

    def after_append(self, hook):
        """Patch _append so hook(rec) runs after each genuine append+fsync."""
        orig = d._append

        def wrapped(fd, chain, rec):
            orig(fd, chain, rec)
            hook(rec)
        return mock.patch.object(d, "_append", wrapped)

    def copy_packet(self):
        dst = Path(self.tmp) / "packet"
        shutil.copytree(PACKET, dst)
        return dst


class FrozenInputs(Base):
    def test_inventory_and_32_ordered_requests_verify(self):
        frozen = d.load_frozen()
        reqs = d.build_requests(frozen)
        self.assertEqual([r["id"] for r in reqs], IDS)
        self.assertEqual([r["body_sha256"] for r in reqs], [r["body_sha256"] for r in ROWS])
        by = {r["id"]: r for r in reqs}
        for p in ("jev", "glide"):
            self.assertEqual(by["11-%s-R-D" % p]["body"], by["04-%s-U-D" % p]["body"])
            self.assertEqual(by["12-%s-R-E" % p]["body"], by["05-%s-U-E" % p]["body"])
        self.assertEqual(len({r["request_sha256"] for r in reqs}), 32)
        for r in reqs:
            self.assertNotIn("authorization", {k.lower() for k in r["headers"]})

    def test_mutated_packet_refused_before_any_state(self):
        def flip(p):
            f = p / "stimuli/s8a-v2-c4-unusual-silence.innerText.txt"
            f.write_bytes(f.read_bytes() + b" ")

        def symlink(p):
            f = p / "QUESTION-BANK.json"
            data = f.read_bytes()
            f.unlink()
            (p / "elsewhere.json").write_bytes(data)
            f.symlink_to(p / "elsewhere.json")
        cases = {
            "changed stimulus": (flip, "INVENTORY_MISMATCH"),
            "extra file": (lambda p: (p / "controls/extra.py").write_text("x"), "INVENTORY_MISMATCH"),
            "missing file": (lambda p: (p / "EVALUATOR-KEY.json").unlink(), "INVENTORY_MISMATCH"),
            "symlinked file": (symlink, "INVENTORY_MISMATCH"),
            "freeze edited": (lambda p: (p / "FREEZE.json").write_bytes(
                (p / "FREEZE.json").read_bytes().replace(b'"jev": 16', b'"jev": 17')), "FREEZE_MISMATCH"),
            "inventory edited": (lambda p: (p / "SHA256SUMS").write_bytes(
                (p / "SHA256SUMS").read_bytes() + b"\n"), "INVENTORY_MISMATCH"),
        }
        for name, (mutate, code) in cases.items():
            with self.subTest(name):
                packet = self.copy_packet()
                mutate(packet)
                with self.assertRaises(d.Refused) as cm:
                    self.run_fake(packet=packet)
                self.assertEqual(cm.exception.code, code)
                self.assertFalse(os.path.exists(self.state))
                shutil.rmtree(packet)

    def test_reordered_or_duplicated_plan_refused_before_any_state(self):
        good = d.build_requests
        cases = {
            "swap": lambda r: r[:1] + r[2:3] + r[1:2] + r[3:],
            "duplicate first": lambda r: r[:1] + r[:1] + r[2:],
            "drop last": lambda r: r[:-1],
            "extra repeat": lambda r: r + r[-1:],
        }
        for name, edit in cases.items():
            with self.subTest(name), mock.patch.object(d, "build_requests", lambda f: edit(good(f))):
                fake = FakeProvider(self.state)
                with self.assertRaises(d.Refused) as cm:
                    d.run(self.state, fake, served_allowlist=(SERVED,))
                self.assertEqual(cm.exception.code, "PLAN_MISMATCH")
                self.assertEqual(fake.calls, [])
                self.assertFalse(os.path.exists(self.state))

    def test_outbound_validation_rejects_any_changed_handoff(self):
        reqs = d.build_requests(d.load_frozen())
        rows = {r["id"]: r for r in ROWS}
        d.validate_outbound(reqs[0], rows[reqs[0]["id"]])
        edits = {
            "body byte": lambda r: r.update(body=r["body"][:-1] + b" "),
            "auth header": lambda r: r.update(headers={**r["headers"], "Authorization": "Bearer " + CANARY}),
            "url": lambda r: r.update(url="https://evil.example/v1/systemone"),
            "provider": lambda r: r.update(provider="glide"),
        }
        for name, edit in edits.items():
            with self.subTest(name):
                r = dict(reqs[0])
                edit(r)
                with self.assertRaises(d.Refused) as cm:
                    d.validate_outbound(r, rows[reqs[0]["id"]])
                self.assertEqual(cm.exception.code, "OUTBOUND_MISMATCH")
                self.assertNotIn(CANARY, str(cm.exception))

    def test_request_mutated_mid_run_is_never_handed_off(self):
        good = d.build_requests
        holder = {}

        def capture(f):
            holder["r"] = good(f)
            return holder["r"]

        def tamper(i):
            if i == 0:
                holder["r"][1]["body"] = holder["r"][1]["body"].replace(b"k1", b"k9", 1)
        with mock.patch.object(d, "build_requests", capture):
            summary, fake = self.run_fake(on_handoff=tamper)
        self.assertEqual(len(fake.calls), 1)
        self.assertEqual(summary["stop_reason"], "TECHNICAL_FAILURE")
        self.assertEqual(summary["outcomes"][-1], [IDS[1], "OUTBOUND_MISMATCH"])
        self.assertEqual(summary["not_attempted"], IDS[1:])
        report = d.inspect(self.state)
        self.assertEqual(report["reserved_micro_usd"], {"jev": 3000, "glide": 0, "total": 3000})

    def test_packet_mutated_mid_run_stops_before_next_handoff(self):
        packet = self.copy_packet()

        def tamper(i):
            if i == 1:
                f = packet / "QUESTION-BANK.json"
                f.write_bytes(f.read_bytes().replace(b"Ravi", b"Ravl", 1))
        summary, fake = self.run_fake(packet=packet, on_handoff=tamper)
        self.assertEqual(len(fake.calls), 2)
        self.assertEqual(summary["outcomes"][-1], [IDS[2], "INVENTORY_MISMATCH"])
        self.assertEqual(summary["not_attempted"], IDS[2:])


class Dispatch(Base):
    def test_full_fake_run_matches_oracle_and_verifies_read_only(self):
        summary, fake = self.run_fake()
        fake.oracle.finish(32)
        self.assertEqual(summary["stop_reason"], "PLAN_COMPLETE")
        self.assertEqual(summary["not_attempted"], [])
        self.assertEqual([o for _, o in summary["outcomes"]], ["VALID"] * 32)
        for c in fake.calls:
            self.assertLessEqual(c["timeout"], 300)
            self.assertNotIn("authorization", {k.lower() for k in c["headers"]})
        before = tree_bytes(self.state)
        report = d.inspect(self.state)
        self.assertEqual(tree_bytes(self.state), before)
        self.assertEqual(report["errors"], [])
        self.assertTrue(report["complete"])
        self.assertEqual(report["stop_reason"], "PLAN_COMPLETE")
        self.assertEqual(report["counts"], {"attempted": 32, "valid": 32, "invalid": 0,
                                            "unknown": 0, "not_sent": 0, "not_attempted": 0})
        self.assertEqual(report["reserved_micro_usd"], {"jev": 48000, "glide": 400000, "total": 448000})
        self.assertEqual(report["cost_status"], "UNKNOWN_UNRECONCILED")
        self.assertIs(report["within_budget_verified"], False)
        receipts = list((ledger_path(self.state).parent / "receipts").iterdir())
        self.assertEqual(len(receipts), 32)

    def test_unsafe_headers_never_persisted(self):
        def mutate(i, resp, headers):
            headers += [("Set-Cookie", CANARY), ("Authorization", "Bearer " + CANARY),
                        ("X-Debug-Echo", CANARY)]
        summary, fake = self.run_fake(mutate=mutate)
        self.assertEqual(summary["stop_reason"], "PLAN_COMPLETE")
        self.assert_no_canary(summary)
        rec = [json.loads(x) for x in ledger_path(self.state).read_bytes().splitlines()]
        res = [r for r in rec if r["type"] == "RESULT"]
        self.assertEqual(res[0]["safe_headers"], {"content-type": "application/json",
                                                  "x-request-id": "fake-01"})

    def factual(self, idx, value):
        def mutate(i, resp, headers):
            if i in idx:
                row = ROWS[i]
                p = resp["answers"]["q03"]["probabilities"]
                correct = resp["answers"]["q03"]["choice"]
                other = next(k for k in p if k != correct)
                p[correct], p[other] = value, round(1 - value, 10)
        return self.run_fake(mutate=mutate)

    def test_factual_stop_after_exactly_twenty(self):
        summary, fake = self.factual({19}, 0.79)
        self.assertEqual(len(fake.calls), 20)
        self.assertEqual(summary["stop_reason"], "FACTUAL_CONTROL_STOP")
        self.assertEqual(summary["not_attempted"], IDS[20:])
        self.assertEqual(d.inspect(self.state)["counts"]["not_attempted"], 12)

    def test_early_factual_failure_still_runs_all_twenty_first(self):
        summary, fake = self.factual({0}, 0.5)
        self.assertEqual(len(fake.calls), 20)
        self.assertEqual(summary["stop_reason"], "FACTUAL_CONTROL_STOP")

    def test_factual_boundary_080_continues(self):
        summary, fake = self.factual(set(range(20)), 0.8)
        self.assertEqual(len(fake.calls), 32)
        self.assertEqual(summary["stop_reason"], "PLAN_COMPLETE")

    def test_sixty_minute_limit_and_timeout_cap(self):
        now = [1000.0]

        def tick(i):  # inside each call, within its timeout
            now[0] += {3: 97}.get(i, 1)

        def gap(rec):  # between attempts
            if rec["type"] == "RESULT":
                now[0] += {IDS[2]: 3499, IDS[3]: 1}.get(rec["id"], 0)
        with self.after_append(gap):
            summary, fake = self.run_fake(clock=lambda: now[0], on_handoff=tick)
        # first send t=1000; handoff 3 at elapsed 3502 -> timeout 98, reply at 3599; then elapsed 3600 -> stop
        self.assertEqual(len(fake.calls), 4)
        self.assertEqual(fake.calls[3]["timeout"], 98.0)
        self.assertEqual(summary["outcomes"][-1], [IDS[3], "VALID"])
        self.assertEqual(summary["stop_reason"], "TIME_LIMIT")
        self.assertEqual(summary["not_attempted"], IDS[4:])
        self.assertEqual(d.inspect(self.state)["counts"]["not_sent"], 0)

    def test_time_limit_exactly_sixty_minutes_stops(self):
        now = [0.0]

        def gap(rec):
            if rec["type"] == "RESULT":
                now[0] = 3600.0
        with self.after_append(gap):
            summary, fake = self.run_fake(clock=lambda: now[0])
        self.assertEqual(len(fake.calls), 1)
        self.assertEqual(summary["stop_reason"], "TIME_LIMIT")


class Deadline(Base):
    """Second review: the window is rechecked after the durable reserve, at handoff."""

    def test_deadline_reached_during_reserve_never_hands_off(self):  # Astra's reproduction
        for jump in (3600.0, 3601.0):
            with self.subTest(jump):
                self.setUp()
                now = [0.0]

                def hook(rec):
                    if rec["type"] == "RESERVE" and rec["id"] == IDS[1]:
                        now[0] = jump
                with self.after_append(hook):
                    summary, fake = self.run_fake(clock=lambda: now[0])
                self.assertEqual(len(fake.calls), 1)
                self.assertEqual(summary["stop_reason"], "TIME_LIMIT")
                self.assertIsNone(summary["failure"])
                self.assertEqual(summary["outcomes"], [[IDS[0], "VALID"], [IDS[1], "NOT_SENT_TIME_LIMIT"]])
                self.assertEqual(summary["handoffs"], 1)
                self.assertEqual(summary["not_attempted"], IDS[1:])
                held = {"jev": 3000, "glide": 25000, "total": 28000}
                self.assertEqual(summary["reserved_micro_usd"], held)
                rep = d.inspect(self.state)
                self.assertEqual(rep["errors"], [])
                self.assertTrue(rep["complete"])
                self.assertEqual(rep["stop_reason"], "TIME_LIMIT")
                self.assertEqual(rep["attempts"][1]["status"], "NOT_SENT_RESERVE_HELD")
                self.assertIs(rep["attempts"][1]["reserve_retained"], True)
                self.assertEqual(rep["counts"], {"attempted": 1, "valid": 1, "invalid": 0, "unknown": 0,
                                                 "not_sent": 1, "not_attempted": 31})
                self.assertEqual(rep["reserved_micro_usd"], held)

    def test_window_anchored_at_first_send_and_timeout_freshly_clamped(self):
        now = [1000.0]
        at_reserve = {0: 1050.0, 1: 1050.0 + 3599.5, 2: 1050.0 + 3600}

        def hook(rec):
            if rec["type"] == "RESERVE":
                now[0] = at_reserve.get(IDS.index(rec["id"]), now[0])
        with self.after_append(hook):
            summary, fake = self.run_fake(clock=lambda: now[0])
        # first send at 1050 (not the pre-reserve 1000); second send has 0.5 s left
        self.assertEqual([c["timeout"] for c in fake.calls], [300, 0.5])
        self.assertEqual(summary["outcomes"][-1], [IDS[2], "NOT_SENT_TIME_LIMIT"])
        self.assertEqual(summary["stop_reason"], "TIME_LIMIT")

    def test_late_response_is_never_valid_even_on_final_row(self):
        def per_call(now):
            return None, lambda i: now.__setitem__(0, now[0] + 300) if i == 31 else None

        def campaign(now):
            def hook(rec):
                if rec["type"] == "RESERVE" and rec["id"] == IDS[31]:
                    now[0] = 3500.0
            return hook, lambda i: now.__setitem__(0, now[0] + 100.5) if i == 31 else None
        for name, setup, timeout in (("per-call", per_call, 300), ("campaign", campaign, 100.0)):
            with self.subTest(name):
                self.setUp()
                now = [0.0]
                hook, tick = setup(now)
                with self.after_append(hook or (lambda rec: None)):
                    summary, fake = self.run_fake(clock=lambda: now[0], on_handoff=tick)
                self.assertEqual(len(fake.calls), 32)
                self.assertEqual(fake.calls[31]["timeout"], timeout)
                self.assertEqual(summary["outcomes"][-1], [IDS[31], "RESPONSE_LATE"])
                self.assertEqual(summary["stop_reason"], "TECHNICAL_FAILURE")
                self.assertEqual(summary["failure"], "RESPONSE_LATE")
                rep = d.inspect(self.state)
                self.assertEqual(rep["errors"], [])
                self.assertEqual(rep["stop_reason"], "TECHNICAL_FAILURE")
                self.assertEqual(rep["counts"]["valid"], 31)
                self.assertEqual(rep["attempts"][31]["status"], "INVALID")
                self.assertEqual(len(list((ledger_path(self.state).parent / "receipts").iterdir())), 31)

    def test_hung_transport_is_abandoned_at_timeout_without_resend(self):
        release = threading.Event()
        self.addCleanup(release.set)
        now = [0.0]

        def hook(rec):
            if rec["type"] == "RESERVE" and rec["id"] == IDS[1]:
                now[0] = 3600 - 0.2
        start = time.monotonic()
        with self.after_append(hook):
            summary, fake = self.run_fake(clock=lambda: now[0], on_handoff=lambda i: i == 1 and release.wait(10))
        self.assertLess(time.monotonic() - start, 5)
        self.assertEqual(len(fake.calls), 2)
        self.assertAlmostEqual(fake.calls[1]["timeout"], 0.2)
        self.assertEqual(summary["outcomes"][-1], [IDS[1], "TRANSPORT_TIMEOUT"])
        self.assertEqual(summary["stop_reason"], "TECHNICAL_FAILURE")
        self.assertEqual(summary["not_attempted"], IDS[2:])
        rep = d.inspect(self.state)
        self.assertEqual(rep["attempts"][1]["status"], "INVALID")
        self.assertEqual(rep["reserved_micro_usd"]["total"], 28000)


def raw(status=200, body=b"{}", headers=(("Content-Type", "application/json"),)):
    return lambda i, resp, h: (status, list(headers), body)


def at(idx, fn):
    def mutate(i, resp, headers):
        if i == idx:
            return fn(resp, headers)
    return mutate


def setp(q, k, v):
    def f(resp, h):
        resp["note"] = CANARY
        p = resp["answers"][q]["probabilities"]
        p[list(p)[k]] = v
    return f


def rejson(text):
    return lambda resp, h: (200, h, text.encode() if isinstance(text, str) else text)


def hdr(name, value):
    def f(resp, h):
        h[:] = [x for x in h if x[0].lower() != name.lower()]
        if value is not None:
            h.append((name, value))
    return f


def err(e):
    def f(resp, h):
        raise e
    return f


class HostileResponses(Base):
    def attack(self, idx, fn, code, handoffs=None):
        summary, fake = self.run_fake(mutate=at(idx, fn))
        self.assertEqual(len(fake.calls), handoffs or idx + 1)
        self.assertEqual(summary["stop_reason"], "TECHNICAL_FAILURE")
        self.assertEqual(summary["outcomes"][-1], [IDS[idx], code])
        self.assertEqual(summary["not_attempted"], IDS[idx + 1:])
        report = d.inspect(self.state)
        self.assertEqual(report["errors"], [])
        self.assertEqual(report["counts"]["invalid"], 1)
        self.assertEqual(report["attempts"][-1]["reserve_retained"], True)
        self.assert_no_canary(summary)
        return report

    def test_non_200_and_redirects_are_terminal_without_retry(self):
        for status in (201, 204, 301, 302, 307, 308, 400, 401, 403, 425, 429, 500, 502, 503, 504):
            with self.subTest(status):
                self.setUp()
                rep = self.attack(0, lambda r, h, s=status: (s, h + [("Location", "https://x/" + CANARY)],
                                                             json.dumps(r).encode()), "HTTP_STATUS")
                self.assertEqual(rep["attempts"][0]["http_status"], status)

    def test_transport_failures_are_terminal(self):
        cases = [(TimeoutError(CANARY), "TRANSPORT_TIMEOUT"),
                 (ConnectionResetError(CANARY), "TRANSPORT_ERROR"),
                 (ValueError(CANARY), "TRANSPORT_ERROR")]
        for e, code in cases:
            with self.subTest(code):
                self.setUp()
                self.attack(0, err(e), code)

    def test_malformed_transport_result(self):
        cases = {"bool status": lambda r, h: (True, h, b"{}"),
                 "str status": lambda r, h: ("200", h, b"{}"),
                 "str body": lambda r, h: (200, h, CANARY),
                 "dict headers": lambda r, h: (200, dict(h), json.dumps(r).encode()),
                 "short tuple": lambda r, h: (200, h)}
        for name, fn in cases.items():
            with self.subTest(name):
                self.setUp()
                self.attack(0, fn, "TRANSPORT_MALFORMED")

    def test_malformed_and_malicious_bodies(self):
        big = b'{"model":"' + b"x" * (d.MAX_RESPONSE_BYTES + 1) + b'"}'
        cases = {
            "not json": (rejson("not json " + CANARY), "JSON_INVALID"),
            "non utf8": (rejson(b'{"model":"\xff"}'), "JSON_INVALID"),
            "duplicate key": (lambda r, h: (200, h, json.dumps(r).encode()[:-1] + b',"model":"jev-1.14.0"}'), "JSON_INVALID"),
            "NaN literal": (rejson('{"model":NaN}'), "JSON_INVALID"),
            "overflow float": (rejson('{"x":1e400}'), "JSON_INVALID"),
            "huge int literal": (rejson('{"x":' + "9" * 5000 + "}"), "JSON_INVALID"),
            "33-digit int literal": (rejson('{"x":' + "9" * 33 + "}"), "JSON_INVALID"),
            "deep nesting": (rejson("[" * 200000 + "]" * 200000), "JSON_INVALID"),
            "top-level list": (rejson("[]"), "ANSWERS_INVALID"),
            "too large": (rejson(big), "RESPONSE_TOO_LARGE"),
            "content type": (hdr("Content-Type", "text/html"), "CONTENT_TYPE"),
            "header control char": (hdr("X-Request-Id", "a\r\nInjected: " + CANARY), "HEADER_INVALID"),
            "non-str header": (lambda r, h: h.append(("X-Request-Id", 5)), "HEADER_INVALID"),
        }
        for name, (fn, code) in cases.items():
            with self.subTest(name):
                self.setUp()
                self.attack(0, fn, code)

    def test_model_answers_probabilities_choice(self):
        def upd(fn):
            def f(resp, h):
                resp["note"] = CANARY
                fn(resp)
            return f
        q = "q01"
        cases = {
            "model drift": (upd(lambda r: r.update(model="jev-latest")), "MODEL_MISMATCH"),
            "model missing": (upd(lambda r: r.pop("model")), "MODEL_MISMATCH"),
            "missing answer": (upd(lambda r: r["answers"].pop(q)), "ANSWERS_INVALID"),
            "extra answer": (upd(lambda r: r["answers"].update(q09=r["answers"][q])), "ANSWERS_INVALID"),
            "answers list": (upd(lambda r: r.update(answers=[])), "ANSWERS_INVALID"),
            "wrong type": (upd(lambda r: r["answers"][q].update(type="score")), "ANSWERS_INVALID"),
            "missing option": (upd(lambda r: r["answers"][q]["probabilities"].popitem()), "PROBABILITY_INVALID"),
            "extra option": (upd(lambda r: r["answers"][q]["probabilities"].update(k9=0.0)), "PROBABILITY_INVALID"),
            "bool prob": (setp(q, 1, True), "PROBABILITY_INVALID"),
            "str prob": (setp(q, 1, "0"), "PROBABILITY_INVALID"),
            "negative prob": (setp(q, 1, -0.0001), "PROBABILITY_INVALID"),
            "negative prob, sum still 1": (upd(lambda r: r["answers"][q]["probabilities"].update(
                dict(zip([k for k, v in r["answers"][q]["probabilities"].items() if v == 0][:2], (-0.25, 0.25))))),
                "PROBABILITY_INVALID"),
            "prob above one": (setp(q, 1, 1.5), "PROBABILITY_INVALID"),
            "big int prob": (setp(q, 1, 10 ** 20), "PROBABILITY_INVALID"),
            "huge int prob": (setp(q, 1, 10 ** 300), "JSON_INVALID"),  # rejected at parse bound
            "sum drift": (setp(q, 1, 0.3), "PROBABILITY_INVALID"),
            "choice not argmax": (upd(lambda r: r["answers"][q].update(
                choice=next(k for k, v in r["answers"][q]["probabilities"].items() if v == 0))), "CHOICE_INVALID"),
            "invented choice": (upd(lambda r: r["answers"][q].update(choice=CANARY)), "CHOICE_INVALID"),
        }
        for name, (fn, code) in cases.items():
            with self.subTest(name):
                self.setUp()
                self.attack(0, fn, code)

    def test_usage(self):
        def u(**kw):
            def f(resp, h):
                resp["note"] = CANARY
                resp["usage"].update(kw)
            return f
        cases = {
            "missing usage": (lambda r, h: r.pop("usage") and None, "USAGE_INVALID"),
            "negative": (u(input_tokens=-1), "USAGE_INVALID"),
            "bool": (u(input_tokens=True), "USAGE_INVALID"),
            "float": (u(input_tokens=100.0), "USAGE_INVALID"),
            "string": (u(output_tokens="0"), "USAGE_INVALID"),
            "negative output": (u(output_tokens=-5), "USAGE_INVALID"),
            "overflow output": (u(output_tokens=2 ** 64), "USAGE_INVALID"),
            "jev input bound": (u(input_tokens=65537), "USAGE_BOUND"),
        }
        for name, (fn, code) in cases.items():
            with self.subTest(name):
                self.setUp()
                self.attack(0, fn, code)

    def test_jev_input_bound_is_inclusive(self):
        summary, _ = self.run_fake(mutate=at(0, lambda r, h: r["usage"].update(input_tokens=65536)))
        self.assertEqual(summary["outcomes"][0], [IDS[0], "VALID"])

    def test_glide_identity_retention_usage(self):
        def tu(v):
            return lambda r, h: r.update(token_usage=v)
        cases = {
            "glide model alias": (lambda r, h: r.update(model="fastino/GLiDE"), "MODEL_MISMATCH"),
            "retention stored": (hdr("X-Fastino-Data-Retention", "stored"), "RETENTION"),
            "retention missing": (hdr("X-Fastino-Data-Retention", None), "RETENTION"),
            "served unknown": (hdr("X-Fastino-Served-Model", "OTHER"), "CANONICAL_IDENTITY"),
            "served missing": (hdr("X-Fastino-Served-Model", None), "CANONICAL_IDENTITY"),
            "served duplicated": (lambda r, h: h.append(("x-fastino-served-model", "OTHER")), "HEADER_INVALID"),
            "token_usage mismatch": (tu(101), "USAGE_INVALID"),
            "token_usage bool": (tu(True), "USAGE_INVALID"),
            "token_usage missing": (lambda r, h: r.pop("token_usage") and None, "USAGE_INVALID"),
            "glide input bound": (lambda r, h: r["usage"].update(input_tokens=524289) or r.update(token_usage=524289), "USAGE_BOUND"),
        }
        for name, (fn, code) in cases.items():
            with self.subTest(name):
                self.setUp()
                self.attack(1, fn, code)

    def test_glide_served_identity_must_not_change_and_is_not_learned(self):
        def mutate(i, resp, h):
            if i == 2:
                hdr("X-Fastino-Served-Model", "FAKE_OTHER")(resp, h)
        summary, fake = self.run_fake(mutate=mutate, allow=(SERVED, "FAKE_OTHER"))
        self.assertEqual(len(fake.calls), 3)
        self.assertEqual(summary["outcomes"][-1], [IDS[2], "CANONICAL_IDENTITY"])

    def test_rate_metadata_headers_named_and_bounded(self):
        def mutate(i, resp, headers):
            headers += [("Retry-After", "30"), ("X-RateLimit-Scope", "endpoint"), ("X-RateLimit-Code", "rate_limited"),
                        ("X-RateLimit-Secret", CANARY), ("RateLimit-Policy", CANARY), ("x-ratelimit-" + CANARY, "1")]
        summary, fake = self.run_fake(mutate=mutate)
        self.assertEqual(summary["stop_reason"], "PLAN_COMPLETE")
        self.assert_no_canary(summary)
        res = [json.loads(x) for x in ledger_path(self.state).read_bytes().splitlines()]
        self.assertEqual(next(r for r in res if r["type"] == "RESULT")["safe_headers"],
                         {"content-type": "application/json", "x-request-id": "fake-01", "retry-after": "30",
                          "x-ratelimit-scope": "endpoint", "x-ratelimit-code": "rate_limited"})
        for name, value in (("Retry-After", CANARY), ("Retry-After", "9" * 7), ("X-RateLimit-Scope", "a" * 33),
                            ("X-RateLimit-Code", CANARY), ("X-RateLimit-Code", CANARY.lower())):
            with self.subTest(name=name, value=value[:8]):
                self.setUp()
                self.attack(0, hdr(name, value), "HEADER_INVALID")

    def test_empty_allowlist_rejects_first_glide_response(self):
        summary, fake = self.run_fake(allow=())
        self.assertEqual(len(fake.calls), 2)
        self.assertEqual(summary["outcomes"][-1], [IDS[1], "CANONICAL_IDENTITY"])


class Faults(Base):
    def test_reserve_fsync_failure_means_no_handoff(self):
        orig = d._append

        def bad(fd, chain, rec):
            if rec["type"] == "RESERVE":
                with mock.patch.object(d, "_fsync", side_effect=OSError(28, "No space")):
                    return orig(fd, chain, rec)
            return orig(fd, chain, rec)
        with mock.patch.object(d, "_append", bad):
            fake = FakeProvider(self.state)
            with self.assertRaises(d.Aborted) as cm:
                d.run(self.state, fake, served_allowlist=(SERVED,))
        self.assertEqual(cm.exception.code, "LEDGER_WRITE_FAILED")
        self.assertEqual(fake.calls, [])
        rep = d.inspect(self.state)
        self.assertFalse(rep["complete"])
        self.assertEqual(rep["counts"]["unknown"], 1)  # unsynced reserve is held, never released
        with self.assertRaises(d.Refused):
            d.run(self.state, FakeProvider(self.state), served_allowlist=(SERVED,))

    def test_marker_fsync_failure_means_no_handoff_and_no_retry(self):
        os.makedirs(os.path.join(self.state, "authorizations"))  # so the first fsync is the marker's
        os.makedirs(os.path.join(self.state, "runs"))
        with mock.patch.object(d, "_fsync", side_effect=OSError(5, "EIO")):
            fake = FakeProvider(self.state)
            with self.assertRaises(d.Aborted):
                d.run(self.state, fake, served_allowlist=(SERVED,))
        self.assertEqual(fake.calls, [])
        with self.assertRaises(d.Refused) as cm:
            d.run(self.state, FakeProvider(self.state), served_allowlist=(SERVED,))
        self.assertEqual(cm.exception.code, "AUTHORIZATION_CONSUMED")

    def test_full_fsync_hard_error_never_falls_back(self):
        def fcntl_failing(code):
            return types.SimpleNamespace(F_FULLFSYNC=51, fcntl=mock.Mock(side_effect=OSError(code, "x")))
        fd = os.open(os.path.join(self.tmp, "f"), os.O_WRONLY | os.O_CREAT, 0o600)
        self.addCleanup(os.close, fd)
        for code, falls_back in ((errno.EIO, False), (errno.ENOSPC, False),
                                 (errno.ENOTSUP, True), (errno.EOPNOTSUPP, True), (errno.ENOTTY, True)):
            with self.subTest(errno.errorcode[code]), mock.patch.object(d, "fcntl", fcntl_failing(code)), \
                    mock.patch.object(d.os, "fsync") as plain:
                if falls_back:
                    d._fsync(fd)
                    plain.assert_called_once_with(fd)
                else:
                    with self.assertRaises(OSError):
                        d._fsync(fd)
                    plain.assert_not_called()
        orig = d._append

        def bad(fd, chain, rec):
            if rec["type"] == "RESERVE":
                with mock.patch.object(d, "fcntl", fcntl_failing(errno.EIO)):
                    return orig(fd, chain, rec)
            return orig(fd, chain, rec)
        with mock.patch.object(d, "_append", bad):
            fake = FakeProvider(self.state)
            with self.assertRaises(d.Aborted) as cm:
                d.run(self.state, fake, served_allowlist=(SERVED,))
        self.assertEqual(cm.exception.code, "LEDGER_WRITE_FAILED")
        self.assertEqual(fake.calls, [])

    def test_state_dirs_made_by_racing_process_are_fsynced_before_first_handoff(self):
        for sub in ("authorizations", "runs"):  # visible but possibly not yet durable
            os.makedirs(os.path.join(self.state, sub))
        orig, synced, at_handoff = d._fsync_dir, [], []

        def record(path):
            orig(path)
            synced.append(os.path.realpath(path))

        def snapshot(i):
            if i == 0:
                at_handoff.extend(synced)
        with mock.patch.object(d, "_fsync_dir", record):
            self.run_fake(on_handoff=snapshot)
        want = {os.path.realpath(x) for x in (self.tmp, self.state, os.path.join(self.state, "authorizations"),
                                              os.path.join(self.state, "runs"), ledger_path(self.state).parent)}
        self.assertLessEqual(want, set(at_handoff))

    def test_receipt_write_failure_is_recorded_and_stops(self):
        with mock.patch.object(d, "_write_receipt", side_effect=OSError(28, "No space " + CANARY)):
            summary, fake = self.run_fake()
        self.assertEqual(len(fake.calls), 1)
        self.assertEqual(summary["outcomes"], [[IDS[0], "RECEIPT_PERSIST_FAILED"]])
        rep = d.inspect(self.state)
        self.assertEqual(rep["errors"], [])
        self.assertEqual(rep["reserved_micro_usd"]["total"], 3000)
        self.assert_no_canary(summary)

    def test_result_append_failure_leaves_unknown_reserved_attempt(self):
        orig = d._append

        def bad(fd, chain, rec):
            if rec["type"] == "RESULT":
                raise OSError(5, "EIO")
            return orig(fd, chain, rec)
        with mock.patch.object(d, "_append", bad):
            fake = FakeProvider(self.state)
            with self.assertRaises(d.Aborted):
                d.run(self.state, fake, served_allowlist=(SERVED,))
        self.assertEqual(len(fake.calls), 1)
        rep = d.inspect(self.state)
        self.assertEqual(rep["counts"]["unknown"], 1)
        self.assertEqual(rep["attempts"][0]["status"], "UNKNOWN_POTENTIALLY_BILLED")
        self.assertEqual(rep["orphan_receipts"], 1)

    def test_ledger_tampering_detected(self):
        self.run_fake()
        led = ledger_path(self.state)
        good = led.read_bytes()
        lines = good.splitlines(keepends=True)
        tampers = {
            "byte flip": good.replace(b'"VALID"', b'"VALIT"', 1),
            "delete middle": b"".join(lines[:3] + lines[4:]),
            "reorder": b"".join(lines[:2] + [lines[3], lines[2]] + lines[4:]),
            "truncate tail": b"".join(lines[:-1]),
            "partial line": good[:-10],
            "semantically neutral edit": good.replace(b'"fake-01"', b'"fake-99"', 1),
            "rehashed edit": None,
        }
        for name, data in tampers.items():
            with self.subTest(name):
                if data is None:
                    rec = json.loads(lines[2])
                    rec["reserve_micro_usd"] = 0
                    rec["hash"] = d._digest({k: v for k, v in rec.items() if k != "hash"})
                    data = b"".join(lines[:2] + [d._line(rec)] + lines[3:])
                led.write_bytes(data)
                rep = d.inspect(self.state)
                self.assertTrue(rep["errors"] or not rep["complete"], name)
                self.assertIs(rep["within_budget_verified"], False)
        led.write_bytes(good)
        rec_dir = led.parent / "receipts"
        first = sorted(rec_dir.iterdir())[0]
        first.write_bytes(first.read_bytes() + b" ")
        self.assertIn("RECEIPT_HASH_MISMATCH", d.inspect(self.state)["errors"])

    def test_rerun_refused_even_after_ledger_or_run_dir_removed(self):
        self.run_fake(mutate=at(3, raw(500)))
        led = ledger_path(self.state)
        for step in ("as is", "ledger removed", "ledger replaced", "run dir removed"):
            with self.subTest(step):
                if step == "ledger removed":
                    led.unlink()
                elif step == "ledger replaced":
                    led.write_bytes(b"")
                elif step == "run dir removed":
                    shutil.rmtree(led.parent)
                fake = FakeProvider(self.state)
                with self.assertRaises(d.Refused) as cm:
                    d.run(self.state, fake, served_allowlist=(SERVED,))
                self.assertEqual(cm.exception.code, "AUTHORIZATION_CONSUMED")
                self.assertEqual(fake.calls, [])
        rep = d.inspect(self.state)
        self.assertTrue(rep["authorization_consumed"])
        self.assertIn("LEDGER_MISSING", rep["errors"])


class Processes(Base):
    def spawn(self, mode, tag="a"):
        ready = os.path.join(self.tmp, "ready-" + tag)
        log = os.path.join(self.tmp, "handoffs.log")
        p = subprocess.Popen([sys.executable, "-B", str(HERE / "child.py"), self.state, mode, ready, log],
                             env=ENV, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        def cleanup():
            if p.poll() is None:
                p.kill()
            p.wait()
            p.stdout.close()
            p.stderr.close()
        self.addCleanup(cleanup)
        return p, ready, log

    def wait_ready(self, ready, procs=()):
        deadline = time.monotonic() + 30
        while not os.path.exists(ready):
            for p in procs:
                if p.poll() is not None and p.returncode != 3:
                    self.fail(p.stderr.read().decode())
            if time.monotonic() > deadline:
                self.fail("child never became ready")
            time.sleep(0.02)

    def handoffs(self, log):
        return Path(log).read_text().splitlines() if os.path.exists(log) else []

    def kill(self, p):
        p.send_signal(signal.SIGKILL)
        p.wait()
        self.assertEqual(p.returncode, -signal.SIGKILL)

    def assert_no_resume(self):
        fake = FakeProvider(self.state)
        with self.assertRaises(d.Refused) as cm:
            d.run(self.state, fake, served_allowlist=(SERVED,))
        self.assertEqual(cm.exception.code, "AUTHORIZATION_CONSUMED")
        self.assertEqual(fake.calls, [])

    def test_sigkill_during_transport_holds_unknown_reserve(self):
        p, ready, log = self.spawn("hang_transport_2")
        self.wait_ready(ready, [p])
        self.kill(p)
        self.assertEqual(len(self.handoffs(log)), 3)
        rep = d.inspect(self.state)
        self.assertEqual(rep["errors"], [])
        self.assertFalse(rep["complete"])
        self.assertEqual(rep["counts"], {"attempted": 3, "valid": 2, "invalid": 0, "unknown": 1,
                                         "not_sent": 0, "not_attempted": 29})
        self.assertEqual(rep["attempts"][2]["id"], IDS[2])
        self.assertEqual(rep["reserved_micro_usd"], {"jev": 3000, "glide": 50000, "total": 53000})
        self.assert_no_resume()
        ledger_path(self.state).unlink()
        self.assert_no_resume()

    def test_sigkill_before_reserve_cannot_have_sent(self):
        p, ready, log = self.spawn("hang_before_reserve")
        self.wait_ready(ready, [p])
        self.kill(p)
        self.assertEqual(self.handoffs(log), [])
        rep = d.inspect(self.state)
        self.assertEqual(rep["counts"]["attempted"], 0)
        self.assertEqual(rep["reserved_micro_usd"]["total"], 0)
        self.assertTrue(rep["authorization_consumed"])
        self.assert_no_resume()

    def test_sigkill_after_response_before_receipt(self):
        p, ready, log = self.spawn("hang_before_receipt")
        self.wait_ready(ready, [p])
        self.kill(p)
        self.assertEqual(len(self.handoffs(log)), 1)
        rep = d.inspect(self.state)
        self.assertEqual(rep["attempts"][0]["status"], "UNKNOWN_POTENTIALLY_BILLED")
        self.assertEqual(rep["reserved_micro_usd"]["total"], 3000)
        self.assert_no_resume()

    def test_competing_processes_exactly_one_dispatches(self):
        procs = [self.spawn("hang_transport_0", tag=str(n)) for n in range(4)]
        log = procs[0][2]
        deadline = time.monotonic() + 30
        while not any(os.path.exists(r) for _, r, _ in procs):
            self.assertLess(time.monotonic(), deadline)
            time.sleep(0.02)
        winners = [p for p, r, _ in procs if os.path.exists(r)]
        losers = [p for p, r, _ in procs if not os.path.exists(r)]
        self.assertEqual(len(winners), 1)
        for p in losers:
            self.assertEqual(p.wait(30), 3)
            self.assertIn(p.stdout.read().strip(), (b"AUTHORIZATION_CONSUMED", b"RUN_EXISTS"))
        self.kill(winners[0])
        self.assertEqual(len(self.handoffs(log)), 1)
        self.assert_no_resume()


class Surface(unittest.TestCase):
    SRC = Path(d.__file__).read_text()

    def test_no_network_credential_subprocess_or_env_code(self):
        allowed = {"argparse", "base64", "datetime", "errno", "fcntl", "hashlib", "json", "math", "os", "re",
                   "stat", "sys", "threading", "time", "pathlib"}
        tree = ast.parse(self.SRC)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                self.assertTrue({a.name.split(".")[0] for a in node.names} <= allowed, ast.dump(node))
            if isinstance(node, ast.ImportFrom):
                self.assertIn(node.module.split(".")[0], allowed)
            if isinstance(node, (ast.Attribute, ast.Name)):
                name = getattr(node, "attr", getattr(node, "id", ""))
                self.assertNotIn(name, {"environ", "getenv", "putenv", "system", "popen", "exec",
                                        "eval", "__import__", "import_module"})
        for word in ("socket", "urllib", "http.client", "import requests", "keychain", "Keychain",
                     "security find", "API_KEY", "Bearer"):
            self.assertNotIn(word, self.SRC)

    def test_cli_cannot_dispatch_or_choose_paths(self):
        script = str(Path(d.__file__))
        existed = os.path.exists(d.CLI_STATE_ROOT)
        r = subprocess.run([sys.executable, "-B", script, "run"], env=ENV, capture_output=True)
        self.assertEqual(r.returncode, 4, r.stderr)
        self.assertIn(b"LIVE_DISPATCH_DISABLED", r.stdout)
        for extra in (["--state-root", "/tmp/x"], ["--url", "https://x"], ["--live"], ["--allow", "X"]):
            r2 = subprocess.run([sys.executable, "-B", script, "run", *extra], env=ENV, capture_output=True)
            self.assertEqual(r2.returncode, 2, extra)
        self.assertEqual(os.path.exists(d.CLI_STATE_ROOT), existed)
        self.assertEqual(Path(d.CLI_STATE_ROOT).resolve(), (HERE.parent / "state").resolve())

    def test_cli_verify_and_inspect_are_read_only(self):
        script = str(Path(d.__file__))
        r = subprocess.run([sys.executable, "-B", script, "verify"], env=ENV, capture_output=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        out = json.loads(r.stdout)
        self.assertEqual(out["requests"], 32)
        self.assertEqual(out["live_dispatch"], "DISABLED")
        existed = os.path.exists(d.CLI_STATE_ROOT)
        r = subprocess.run([sys.executable, "-B", script, "inspect"], env=ENV, capture_output=True)
        self.assertIn(r.returncode, (0, 1))
        self.assertEqual(os.path.exists(d.CLI_STATE_ROOT), existed)


if __name__ == "__main__":
    unittest.main()
