"""Test oracle only. The fake transport calls observe BEFORE returning its reply.

Supply exact handed-off bytes and the last reservation independently read by the
test from disk at that instant, normalized to the four keys in the check below.
This verifies visible order, not physical persistence. SIGKILL/fsync tests and
independent review of the actual candidate are separately required.
"""
import hashlib
import json
from pathlib import Path

MANIFEST = Path(__file__).resolve().parents[2] / "docs/studies/s3/2026-10-26-v1/controls/wire-manifest.json"
WIRE_SHA = "48bc5e490e93ad398012364ca45c5fd1b002e36b3ca9fd1161687fb5662c9a31"
RESERVE_MICRO_USD = {"jev": 3000, "glide": 25000}


class UnexpectedHandoff(ValueError):
    pass


class HandoffOracle:
    def __init__(self):
        raw = MANIFEST.read_bytes()
        if hashlib.sha256(raw).hexdigest() != WIRE_SHA:
            raise UnexpectedHandoff("wire manifest digest mismatch")
        self.rows = json.loads(raw)["requests"]
        self.seen = 0

    def observe(self, attempt_id, provider, body_bytes, on_disk_reservation):
        if self.seen >= len(self.rows):
            raise UnexpectedHandoff("extra handoff")
        row = self.rows[self.seen]
        digest = hashlib.sha256(body_bytes).hexdigest()
        if (attempt_id, provider, digest) != (row["id"], row["provider"], row["body_sha256"]):
            raise UnexpectedHandoff("unexpected attempt, provider, or body")
        want = dict(id=attempt_id, provider=provider, body_sha256=digest,
                    reserve_micro_usd=RESERVE_MICRO_USD[provider])
        if type(on_disk_reservation) is not dict or on_disk_reservation != want or type(on_disk_reservation.get("reserve_micro_usd")) is not int:
            raise UnexpectedHandoff("matching on-disk reservation not visible at handoff")
        self.seen += 1

    def finish(self, expected_handoffs):
        # Expected count is chosen by the test scenario, never by the candidate.
        if self.seen != expected_handoffs:
            raise UnexpectedHandoff("wrong number of fake handoffs")
