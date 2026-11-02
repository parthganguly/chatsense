"""Mutation check: each safety property, deliberately broken, must fail some test.

Runs in-process tests against an in-memory mutant of dispatcher.py (the file on
disk is never modified). Subprocess tests are excluded: their child imports the
real module. Run: python3 -B s3_a3/tests/mutation_check.py
"""
import io
import subprocess
import sys
import types
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "dispatcher.py"
T = "test_dispatcher."
MUTANTS = {
    "no reservation before handoff": ('append({"type": "RESERVE",', '(lambda r: None)({"type": "RESERVE",', T + "Dispatch"),
    "no U+T factual stop": ("if i == FACTUAL_CHECKPOINT and not", "if False and not", T + "Dispatch"),
    "accept non-200": ("if status != 200:", "if status >= 400:", T + "HostileResponses.test_non_200_and_redirects_are_terminal_without_retry"),
    "marker not one-use": ([('if os.path.lexists(p["marker"]):\n        raise Refused("AUTHORIZATION_CONSUMED")', "pass"),
                            ('os.open(p["marker"], os.O_WRONLY | os.O_CREAT | os.O_EXCL', 'os.open(p["marker"], os.O_WRONLY | os.O_CREAT | os.O_TRUNC')],
                           None, T + "Faults.test_rerun_refused_even_after_ledger_or_run_dir_removed"),
    "time limit off by one": ("return not remaining > 0", "return not remaining >= 0", T + "Dispatch"),
    "no deadline recheck after reserve": ([('box = {"state": "not_sent"} if _expired(remaining) else _handoff(', "box = _handoff("),
                                           (" or _expired(TIME_LIMIT_S - (clock() - t0)):\n                box", ":\n                box")],
                                          None, T + "Deadline"),
    "late reply accepted": ('elif box["late"] or clock() - now >= timeout:', "elif False:", T + "Deadline"),
    "hung transport awaited": ("finished.wait(max(0.0, bound - time.monotonic()))", "finished.wait()",
                               T + "Deadline.test_hung_transport_is_abandoned_at_timeout_without_resend"),
    "hard full-fsync error falls back": ("                raise\n    os.fsync(fd)", "                pass\n    os.fsync(fd)", T + "Faults"),
    "racing state dirs not synced": ('_fsync_dir(p["root"].parent)\n        _fsync_dir(p["root"])', "pass", T + "Faults"),
    "rate headers unbounded": ('RATE_TOKEN = re.compile(r"[a-z_]{1,32}\\Z")', "RATE_TOKEN = SAFE_VALUE",
                               T + "HostileResponses.test_rate_metadata_headers_named_and_bounded"),
    "no mid-run inventory recheck": ("load_frozen(packet)  # packet", "pass  # packet", T + "FrozenInputs"),
    "no outbound check at handoff": ("validate_outbound(snap, row)\n            except", "pass\n            except", T + "FrozenInputs"),
    "served identity may change": ("or (served_seen is not None and served != served_seen)", "", T + "HostileResponses"),
    "bool usage accepted": ("type(v) is int and 0 <= v <= USAGE_MAX", "isinstance(v, int) and 0 <= v <= USAGE_MAX", T + "HostileResponses.test_usage"),
    "negative probability accepted": ("_number(v) and 0 <= v <= 1", "_number(v) and v <= 1", T + "HostileResponses"),
    "duplicate JSON keys accepted": ("if k in out:", "if False:", T + "HostileResponses.test_malformed_and_malicious_bodies"),
    "inspect ignores hash chain": ('rec["hash"] != _digest(body) or ', "", T + "Faults.test_ledger_tampering_detected"),
    "persist any header": ("if name in SAFE_HEADERS:\n            if name in safe or not SAFE_HEADERS[name].match(item[1]):",
                           "if True:\n            if name in safe:", T + "Dispatch.test_unsafe_headers_never_persisted"),
    "receipt failure ignored": ('outcome = "RECEIPT_PERSIST_FAILED"', "pass", T + "Faults"),
    "reserve released on failure": ('"reserve_retained": True, "cost_status"', '"reserve_retained": outcome == "VALID", "cost_status"', T + "HostileResponses.test_usage"),
    "plan reorder accepted": ([('for r, row in zip(reqs, rows):\n            validate_outbound(r, row)', "for r, row in []:\n            pass"),
                               ("if _digest(_order(reqs)) != ORDER_SHA256:", "if False:")], None, T + "FrozenInputs"),
}


def one(name):
    old, new, selector = MUTANTS[name]
    src = SRC.read_text()
    for old, new in (old if new is None else [(old, new)]):
        assert src.count(old) == 1, name
        src = src.replace(old, new)
    mod = types.ModuleType("dispatcher")
    mod.__file__ = str(SRC)
    sys.modules["dispatcher"] = mod
    exec(compile(src, str(SRC), "exec"), mod.__dict__)
    sys.path.insert(0, str(HERE))
    result = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromName(selector))
    print("KILLED" if not result.wasSuccessful() else "SURVIVED")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        one(sys.argv[1])
        sys.exit(0)
    survived = 0
    for name in MUTANTS:
        out = subprocess.run([sys.executable, "-B", __file__, name], capture_output=True, text=True)
        verdict = out.stdout.strip().splitlines()[-1] if out.stdout.strip() else "ERROR " + out.stderr[-300:]
        survived += verdict != "KILLED"
        print("%-32s %s" % (name, verdict))
    print("mutants=%d survived=%d" % (len(MUTANTS), survived))
    sys.exit(1 if survived else 0)
