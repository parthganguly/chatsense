"""Verify provider-derived settlement records for the counted first pair, before reserve 3."""
import json
import re
from s3_a3 import dispatcher as d


def checkpoint(read_settlements):
    def reconcile(run_dir, outcomes):
        records = [json.loads(line) for line in d._read(run_dir / "ledger.jsonl").splitlines()]
        results = [row for row in records if row["type"] == "RESULT"]
        expected = ("01-jev-U-A", "01-glide-U-A")
        if (tuple((r["id"], r["outcome"]) for r in results) != tuple((x, "VALID") for x in expected)
                or tuple(tuple(x) for x in outcomes) != tuple((x, "VALID") for x in expected)):
            raise ValueError("PAIR_INCOMPLETE")
        # Reader is a trusted, read-only account integration. It must correlate each settled
        # provider line item to this attempt, exclude other usage, and return exact dollar units.
        statements = read_settlements(results)
        if set(statements) != set(expected):
            raise ValueError("PAIR_UNSETTLED")
        receipt = {}
        for r in results:
            s = statements[r["id"]]
            provider = r["id"].split("-")[1]
            numeric = ("before_nano_usd", "after_nano_usd", "debit_nano_usd")
            if (any(type(s.get(k)) is not int or s[k] < 0 for k in numeric)
                    or s.get("state") != "settled" or s.get("attempt_body_sha256") != next(
                        rec["body_sha256"] for rec in records if rec["type"] == "RESERVE" and rec["id"] == r["id"])
                    or not re.fullmatch("[0-9a-f]{64}", s.get("account_evidence_sha256", ""))
                    or s["before_nano_usd"] - s["after_nano_usd"] != s["debit_nano_usd"]
                    or s["debit_nano_usd"] != r["provisional_input_nano_usd"]
                    or s["debit_nano_usd"] > d.RESERVE_MICRO_USD[provider] * 1000):
                raise ValueError("PAIR_DEBIT_MISMATCH")
            receipt[r["id"]] = {k: s[k] for k in (*numeric, "account_evidence_sha256", "attempt_body_sha256")}
        d._create(run_dir / "first-pair-settlement.json", d._canon(receipt))
    return reconcile


def run_with_checkpoint(state_root, transport, allowlist, read_settlements, rows):
    """Use A3's injected clock as a synchronous checkpoint, always returning true monotonic time.

    A3 samples it once before classifying response two, then before reserving row three.
    Only the latter has two durable VALID results. No background polling and no clock offset.
    A negative settlement decision unwinds A3 and closes its fd before writing a terminal
    STOP using the accepted chain format. It cannot write a reserve or resume a run.
    """
    import os
    import time
    done = False
    p = d.paths(state_root)
    reconcile = checkpoint(read_settlements)

    class PairStop(Exception):
        pass

    def monotonic():
        nonlocal done
        if transport.sent == 2 and not done:
            try:
                tail = d._strict_json(d._read(p["ledger"]).splitlines()[-1])
                if tail["type"] == "RESULT" and tail["outcome"] == "VALID" and tail["id"] == rows[1]["id"]:
                    reconcile(p["run_dir"], [(r["id"], "VALID") for r in rows[:2]])
                    done = True
            except Exception:
                raise PairStop from None
        return time.monotonic()

    try:
        return d.run(state_root, transport, served_allowlist=allowlist, clock=monotonic)
    except PairStop:
        # Terminal accounting only. If interrupted or damaged, keep the consumed marker and
        # leave the run incomplete rather than inferring any missing record.
        report = d.inspect(state_root)
        if (report["errors"] or report["complete"] or report["counts"]["valid"] != 2
                or report["counts"]["attempted"] != 2):
            raise d.Aborted("PAIR_CHECKPOINT_LEDGER_INVALID") from None
        ledger = d._read(p["ledger"]).splitlines()
        last = d._strict_json(ledger[-1])
        unseen = [r["id"] for r in rows[2:]]
        reason = "PAIR_RECONCILIATION_FAILED"
        stop = dict(type="STOP", reason="TECHNICAL_FAILURE", failure=reason, attempted=2,
                    not_attempted=unseen, reserved_micro_usd=report["reserved_micro_usd"], cost_status=d.COST_STATUS)
        fd = os.open(p["ledger"], os.O_WRONLY | os.O_APPEND | os.O_NOFOLLOW)
        try:
            d._append(fd, {"seq": len(ledger), "prev": last["hash"]}, stop)
        finally:
            os.close(fd)
        return dict(stop_reason=stop["reason"], failure=reason, handoffs=2,
                    outcomes=[[r["id"], "VALID"] for r in rows[:2]], not_attempted=unseen,
                    reserved_micro_usd=report["reserved_micro_usd"], cost_status=d.COST_STATUS)
