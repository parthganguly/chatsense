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
