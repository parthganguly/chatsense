"""Pure in-process FAKE provider for offline tests. No sockets, no credentials.

The fake identifies each handoff independently of the dispatcher: provider from
its own URL table, attempt from an independent read of the on-disk ledger tail,
bytes from the handed-off body. Astra's HandoffOracle then checks all three.
"""
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
sys.path.insert(0, str(HERE.parent / "acceptance"))
from handoff_oracle import HandoffOracle  # noqa: E402

PACKET = HERE.parents[1] / "docs/studies/s3/2026-10-26-v1"
ROWS = json.loads((PACKET / "controls/wire-manifest.json").read_bytes())["requests"]
KEY = json.loads((PACKET / "EVALUATOR-KEY.json").read_bytes())["cards"]
URL_TO_PROVIDER = {"https://api.typesafe.ai/v1/systemone": "jev",
                   "https://api.fastino.ai/v1/systemone": "glide"}
SERVED = "FAKE_OFFLINE_ID"
CANARY = "SECRET-CANARY-7f3a"


def ledger_path(state_root):
    return Path(state_root) / "runs" / "s3-v1-957b6c70fc910398" / "ledger.jsonl"


def disk_reservation(state_root):
    lines = ledger_path(state_root).read_bytes().splitlines()
    rec = json.loads(lines[-1]) if lines else {}
    if rec.get("type") != "RESERVE":
        return None, None
    return rec["id"], {k: rec[k] for k in ("id", "provider", "body_sha256", "reserve_micro_usd")}


def valid_response(attempt_id, body):
    row = next(r for r in ROWS if r["id"] == attempt_id)
    req = json.loads(body)
    answers = {}
    for q in req["questions"]:
        wire = row["canonical_to_wire"][q][KEY[row["card"]][q]["correct"]]
        probs = {k: (1.0 if k == wire else 0.0) for k in req["questions"][q]["criteria"]}
        answers[q] = {"type": "choice", "choice": wire, "probabilities": probs}
    resp = {"model": "jev-1.14.0" if row["provider"] == "jev" else "glide", "answers": answers,
            "usage": {"input_tokens": 100, "output_tokens": 0}}
    headers = [("Content-Type", "application/json")]
    if row["provider"] == "glide":
        resp["token_usage"] = 100
        headers += [("X-Fastino-Served-Model", SERVED), ("X-Fastino-Data-Retention", "not-stored")]
    else:
        headers.append(("X-Request-Id", "fake-%02d" % (ROWS.index(row) + 1)))
    return resp, headers


class FakeProvider:
    def __init__(self, state_root, mutate=None, hang_at=None, ready=None, log=None, on_handoff=None):
        self.state_root, self.mutate, self.hang_at = state_root, mutate, hang_at
        self.ready, self.log, self.on_handoff = ready, log, on_handoff
        self.oracle = HandoffOracle()
        self.calls, self.errors = [], []

    def __call__(self, url, headers, body, timeout):
        i = len(self.calls)
        attempt_id, reservation = disk_reservation(self.state_root)
        self.calls.append(dict(url=url, headers=dict(headers), timeout=timeout, id=attempt_id))
        if self.log:
            with open(self.log, "a") as f:
                f.write("%s %s\n" % (os.getpid(), attempt_id))
                f.flush()
                os.fsync(f.fileno())
        try:
            self.oracle.observe(attempt_id, URL_TO_PROVIDER.get(url), body, reservation)
        except Exception as e:
            self.errors.append(repr(e))
            raise
        if self.on_handoff:
            self.on_handoff(i)
        if self.hang_at == i:
            Path(self.ready).write_text("ready")
            time.sleep(600)
        resp, rheaders = valid_response(attempt_id, body)
        if self.mutate:
            raw = self.mutate(i, resp, rheaders)
            if raw is not None:
                return raw
        return 200, rheaders, json.dumps(resp).encode()
