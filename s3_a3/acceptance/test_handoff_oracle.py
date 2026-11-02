"""Astra's pre-implementation oracle self-tests; these do not run a dispatcher."""
import hashlib
import json
import unittest

from handoff_oracle import HandoffOracle, MANIFEST, RESERVE_MICRO_USD, UnexpectedHandoff


def fixtures():
    # Only the test uses the frozen renderer; authenticate its bytes before exec.
    p = MANIFEST.with_name("offline_contract.py")
    src = p.read_bytes()
    if hashlib.sha256(src).hexdigest() != "5a2f2b2d11b5193e2757d2e714a5d0f5ccdbdd1179021f299184e3b949a4aa88":
        raise ValueError("fixture renderer changed")
    scope = {"__file__": str(p), "__name__": "fixture_builder"}
    exec(compile(src, str(p), "exec"), scope)
    rows = json.loads(MANIFEST.read_bytes())["requests"]
    for row in rows:
        pair = scope["PLAN"]["pairs"][row["pair"] - 1]
        body, _, _ = scope["render"](pair, row["provider"])
        yield (row["id"], row["provider"], scope["dumps"](body),
               dict(id=row["id"], provider=row["provider"], body_sha256=row["body_sha256"],
                    reserve_micro_usd=RESERVE_MICRO_USD[row["provider"]]))


class ObserverTest(unittest.TestCase):
    def test_frozen_repeats_are_legal_at_their_positions_only(self):
        o = HandoffOracle()
        for item in fixtures():
            o.observe(*item)
        o.finish(32)
        with self.assertRaises(UnexpectedHandoff):
            o.observe(*next(fixtures()))

    def test_first_handoff_replayed_after_valid_first(self):
        o = HandoffOracle()
        item = next(fixtures())
        o.observe(*item)
        with self.assertRaises(UnexpectedHandoff):
            o.observe(*item)

    def test_no_missing_stale_underreserved_or_float_reservation(self):
        i,p,b,r = next(fixtures())
        for bad in (None, {**r,"id":"other"}, {**r,"reserve_micro_usd":1},
                    {**r,"reserve_micro_usd":float(r["reserve_micro_usd"])}):
            with self.subTest(bad=bad), self.assertRaises(UnexpectedHandoff):
                HandoffOracle().observe(i,p,b,bad)

    def test_swapped_provider_and_body_changed_after_preflight(self):
        i,p,b,r = next(fixtures())
        for other,wire in (("glide",b),(p,b+b" ")):
            with self.subTest(other=other), self.assertRaises(UnexpectedHandoff):
                HandoffOracle().observe(i,other,wire,r)

    def test_silent_early_exit_is_not_a_completed_run(self):
        with self.assertRaises(UnexpectedHandoff):
            HandoffOracle().finish(32)
