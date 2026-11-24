"""Offline read-only reporting checks using synthetic replies and disposable ledgers."""

import json
import tempfile

from s3_v2.report import report
from s3_v2.runtime import engine, run
from s3_v2.test_v2 import Fake, unverified


def test_prefix(valid_count, expected_modalities, expected_repeats):
    with tempfile.TemporaryDirectory() as namespace:
        def break_next(index, response, _headers):
            if index == valid_count:
                del response["answers"]["q08"]

        fake = Fake(break_next)
        run(namespace, fake, unverified)
        observed = report(namespace)
        assert fake.sent == valid_count + 1
        assert observed["valid_requests"] == valid_count
        assert observed["valid_items"] == 8 * valid_count
        assert observed["modality_available"] == expected_modalities
        assert observed["repeat_available"] == expected_repeats
        assert observed["cells"][valid_count]["items"] is None
        print(f"{valid_count}/16 valid, {expected_modalities}/8 modality, {expected_repeats}/4 repeat")


for counts in ((0, 0, 0), (1, 0, 0), (2, 1, 0), (3, 1, 0), (15, 7, 3)):
    test_prefix(*counts)

with tempfile.TemporaryDirectory() as namespace:
    def eof(_rows):
        raise EOFError()

    fake = Fake()
    run(namespace, fake, eof)
    records = engine().paths(namespace)["ledger"].read_text()
    assert fake.sent == 3
    reserves = [json.loads(line) for line in records.splitlines()]
    assert [record["id"] for record in reserves if record["type"] == "RESERVE"] == [
        "01-jev-U-A", "02-jev-T-A", "03-glide-U-A"
    ]
    print("Accounting EOF stopped after three handoffs and before reserve 4.")
