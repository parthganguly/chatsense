"""Independent replay of the sol-6d74855 counterexamples. Offline fakes only.

usage: python3 -B s3_a3/tests/receiver_gap_check.py [DISPATCHER_SOURCE]

DISPATCHER_SOURCE defaults to s3_a3/dispatcher.py; any other source text (e.g. the
reviewed 6d74855 version from `git show`) is executed as if it were that file, so it
reads the same frozen packet. Fakes are plain functions (the unit tests use a callable
object). The trace runs on every thread so a worker-thread handoff is traced too.

Injection points are found by source text, and every case asserts its hit count:
  caller   the dispatcher line that calls the transport (pre-receiver delay)
  body     the fake's first body line (after the receiver was entered)
Exit 0 only if every invariant holds.
"""
import json
import sys
import tempfile
import threading
import time
import types
from pathlib import Path
from unittest import mock

ROOT = Path(__import__("os").environ.get("REVIEW_REPO", __import__("os").getcwd())).resolve()
HERE = ROOT / "s3_a3/tests"
SRC = HERE.parent / "dispatcher.py"
sys.path.insert(0, str(HERE))
import fakes  # noqa: E402

TEXT = Path(sys.argv[1] if len(sys.argv) > 1 else SRC).read_text()
d = types.ModuleType("dispatcher_under_check")
d.__file__ = str(SRC)
exec(compile(TEXT, str(SRC), "exec"), d.__dict__)
CALL_LINES = [n + 1 for n, s in enumerate(TEXT.splitlines()) if "transport(snap[" in s]
assert len(CALL_LINES) == 1, CALL_LINES
CALL_LINE = CALL_LINES[0]
HANDOFF = ("_handoff", "work")  # 6d74855 called the transport from a nested worker
results = []


def in_handoff(frame):
    return frame.f_code.co_filename == str(SRC) and frame.f_code.co_name in HANDOFF


def case(name, ok, **detail):
    results.append(dict(case=name, ok=bool(ok), **detail))


def traced(fake, at, action):
    hits = []

    def tracer(frame, event, arg):
        if ((at == "frame" and event == "call" and frame.f_code is fake.__code__) or (event == "line" and ((at == "caller" and in_handoff(frame) and frame.f_lineno == CALL_LINE)
                                or (at == "body" and frame.f_code is fake.__code__
                                    and frame.f_lineno == fake.__code__.co_firstlineno + 1)))):
            hits.append(1)
            action(len(hits) - 1)
        return tracer if in_handoff(frame) or frame.f_code is fake.__code__ else None
    sys.settrace(tracer)
    threading.settrace(tracer)
    return hits


def untrace():
    sys.settrace(None)
    threading.settrace(None)


def clock_gap(at, jump):
    with tempfile.TemporaryDirectory() as tmp:
        state, now, seen = Path(tmp) / "state", [0.0], []

        def fake(url, headers, body, timeout):
            aid, _ = fakes.disk_reservation(state)
            seen.append([now[0], timeout])
            obj, hs = fakes.valid_response(aid, body)
            return 200, hs, json.dumps(obj).encode()
        hits = traced(fake, at, lambda n: n == 1 and now.__setitem__(0, jump))
        try:
            out = d.run(state, fake, served_allowlist=[fakes.SERVED], clock=lambda: now[0])
        finally:
            untrace()
        rep = d.inspect(state)
        if at in ("caller", "frame"):  # delay before the receiver: second body must never run
            ok = seen == [[0.0, 300]] and out["outcomes"][-1][1] == "NOT_SENT_TIME_LIMIT" and out["handoffs"] == 1
        else:  # receiver already entered: a sent, late attempt, never relabelled unsent
            ok = len(seen) == 2 and out["outcomes"][-1][1] == "RESPONSE_LATE" and out["handoffs"] == 2
        case("%s_gap_%g" % (at, jump), ok and len(hits) == 2 and not rep["errors"],
             hits=len(hits), observed=seen, outcomes=out["outcomes"], reserved=rep["reserved_micro_usd"])


def stall_before_receiver():  # sol cancel_gap: 120 ms real pause before the call, 30 ms timeout
    with tempfile.TemporaryDirectory() as tmp:
        state, sent, start = Path(tmp) / "state", [], time.monotonic()

        def fake(url, headers, body, timeout):
            sent.append(time.monotonic() - start)
            return 200, [], b"{}"
        hits = traced(fake, "caller", lambda n: time.sleep(0.12))
        try:
            with mock.patch.object(d, "MAX_TIMEOUT_S", 0.03):
                out = d.run(state, fake, served_allowlist=[])
        finally:
            untrace()
        at_return = len(sent)
        time.sleep(0.16)
        case("stall_before_receiver", len(hits) == 1 and at_return == 0 and sent == []
             and out["outcomes"] == [[fakes.ROWS[0]["id"], "NOT_SENT_HANDOFF_LATE"]],
             sends_at_return=at_return, sends_after=sent, outcomes=out["outcomes"])


def hung_fake(final):
    with tempfile.TemporaryDirectory() as tmp:
        state, now, ended, row = Path(tmp) / "state", [0.0], [], 31 if final else 1  # row 0 opens the window
        orig = d._append

        def append(fd, chain, rec):
            orig(fd, chain, rec)
            if rec["type"] == "RESERVE" and rec["id"] == fakes.ROWS[row]["id"]:
                now[0] = 3600 - 0.1

        def fake(url, headers, body, timeout):
            aid, _ = fakes.disk_reservation(state)
            if aid == fakes.ROWS[row]["id"]:
                try:
                    while True:
                        time.sleep(30)
                finally:
                    ended.append(time.monotonic())
            obj, hs = fakes.valid_response(aid, body)
            return 200, hs, json.dumps(obj).encode()
        threads = threading.active_count()
        with mock.patch.object(d, "_append", append):
            out = d.run(state, fake, served_allowlist=[fakes.SERVED], clock=lambda: now[0])
        returned = time.monotonic()
        case("hung_fake_row_%d" % (row + 1), len(ended) == 1 and ended[0] <= returned
             and threading.active_count() == threads and out["outcomes"][-1][1] == "TRANSPORT_TIMEOUT",
             body_unwound_before_return=bool(ended and ended[0] <= returned),
             extra_threads=threading.active_count() - threads, outcome=out["outcomes"][-1])


def header(name, value):  # sol metadata probes, verbatim values, on HTTP 429
    with tempfile.TemporaryDirectory() as tmp:
        state = Path(tmp) / "state"

        def fake(url, headers, body, timeout):
            return 429, [(name, value), ("arbitrary-secret-key", "SECRET_CANARY")], b"{}"
        d.run(state, fake, served_allowlist=[])
        text = d.paths(state)["ledger"].read_text()
        # exact JSON string for the probe value ("authorization" is also a prefix of the
        # ledger's own authorization_id key), plain substring for the distinctive canaries
        leaked = [s for s in ("secret_canary", "arbitrary-secret-key") if s in text.lower()]
        leaked += [value] if json.dumps(value).lower() in text.lower() else []
        case("metadata_" + name, not leaked, leaked=leaked)


for at in ("caller", "body", "frame"):
    for jump in (3600.0, 3601.0):
        clock_gap(at, jump)
stall_before_receiver()
hung_fake(False)
hung_fake(True)
for name, value in [("x-ratelimit-scope", "secret_canary"), ("x-ratelimit-code", "authorization"),
                    ("x-request-id", "Bearer SECRET_CANARY"), ("content-type", "application/json; secret=SECRET_CANARY")]:
    header(name, value)
for r in results:
    print(json.dumps(r))
failed = [r["case"] for r in results if not r["ok"]]
print(json.dumps({"source": sys.argv[1] if len(sys.argv) > 1 else str(SRC), "cases": len(results), "failed": failed}))
sys.exit(1 if failed else 0)
