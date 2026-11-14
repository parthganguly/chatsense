import collections
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile

from s3_a3 import dispatcher as old
from s3_v2.runtime import PACKET, engine, run
from s3_v2.report import report
from s3_v2.test_v2 import Fake, unverified

sha = lambda data: hashlib.sha256(data).hexdigest()
d = engine()
fz = d.load_frozen()
freeze = json.loads((PACKET / "FREEZE.json").read_bytes())
assert set(freeze["files"]) == {p.relative_to(PACKET).as_posix() for p in PACKET.rglob("*") if p.is_file() and p.name != "FREEZE.json"}
assert sha((PACKET / "FREEZE.json").read_bytes()) == d.FREEZE_SHA256
assert freeze["source_v1"] == old.FREEZE_SHA256 and d is not old and d._decoded_stimulus is not old._decoded_stimulus
spec = pathlib.Path("/Users/parth/Projects/chatsense-s3-activation-20261114/S3-V2-PROPOSAL.md").read_text()
table = {}
for line in spec.splitlines():
    if line.startswith("### "):
        card = line[4]
    if line.startswith("| q"):
        qid, question, options, ref = map(str.strip, line.strip("|").split("|"))
        table[card, qid] = (question, options.split("; "), ref)

expected = "JAI JAT GAI GAT JDI GDI GEI JEI JDT GDT GET JET JATR GATR GAIR JAIR".split()
old_fz = old.load_frozen()
reqs = d.build_requests(fz)
d.verify_requests(reqs, fz)
assert len(table) == 24
assert len(reqs) == 16
for c in "ABCDE":
    for mode in ("text", "image"):
        key = mode + "_path"
        assert fz["files"][fz["stim"][c][key]] == old_fz["files"][old_fz["stim"][c][key]]
seen = {}
for index, (row, request, exp) in enumerate(zip(fz["rows"], reqs, expected)):
    card = row["card"]
    assert exp == row["provider"][0].upper() + card + row["mode"][0].upper() + ("R" if row["repeat"] else "")
    assert fz["files"][row["body_path"]] == request["body"]
    key = tuple(exp[:3])
    if index > 11:
        assert seen[key] == request["body"]
    seen[key] = request["body"]
    body = json.loads(request["body"])
    assert body["state"][0] == "Read the supplied card and select the answer that best fits each question."
    old_body = json.loads(old._render(old_fz, {"card": card, "mode": row["mode"], "condition": row["condition"], "instruction_variant": "instructions"}, row["provider"])[0])
    for n, item in enumerate(fz["bank"][card]):
        qid = item["id"]
        question, options, ref = table[card, qid]
        criteria = body["questions"][qid]["criteria"]
        if card == "A" and qid in ("q02", "q03", "q07"):
            assert item == old_fz["bank"]["A"][n]
            assert list(criteria.items()) == list(old_body["questions"][qid]["criteria"].items())
            assert fz["key"][card][qid]["correct"] == old_fz["key"]["A"][qid]["correct"]
        else:
            assert item["instructions"] == question
            assert list(item["options"].values()) == options
            assert fz["key"][card][qid]["correct"] == "d" + str(ord(ref) - ord("a"))
            rotation = (ord(card) - ord("A") + n) % 3
            keys = ["k1", "k2", "k3"]
            assert list(criteria) == keys[rotation:] + keys[:rotation]
            assert [criteria[key] for key in keys] == options
            assert row["canonical_to_wire"][qid] == {f"d{i}": key for i, key in enumerate(keys)}
print("Freeze inventory, isolated engine, 24 proposal items, 10 immutable stimuli, 16 exact rows and four exact repeats passed.")

def ledger(state):
    return [json.loads(line) for line in d.paths(state)["ledger"].read_bytes().splitlines()]

with tempfile.TemporaryDirectory() as tmp:
    fake = Fake()
    def settled(rows):
        records = ledger(tmp)
        assert fake.sent == 3 and [r["type"] for r in records] == ["RUN_START"] + ["RESERVE", "RESULT"] * 3
        assert records[-1]["outcome"] == "VALID" and len(list(d.paths(tmp)["receipts"].iterdir())) == 3
        assert [r["id"] for r in rows] == [r["id"] for r in fz["rows"][:3]]
        return {r["id"]: {"state": "settled", "before_nano_usd": 100000 + r["provisional_input_nano_usd"], "after_nano_usd": 100000, "debit_nano_usd": r["provisional_input_nano_usd"], "attempt_body_sha256": reqs[i]["body_sha256"], "account_evidence_sha256": str(i + 1) * 64} for i, r in enumerate(rows)}
    assert run(tmp, fake, settled)["handoffs"] == 16
    records = ledger(tmp)
    checkpoint = d.paths(tmp)["run_dir"] / "cross-provider-accounting.json"
    assert records[7]["checkpoint_sha256"] == sha(checkpoint.read_bytes())
    assert all(s["state"] == "settled" for s in json.loads(checkpoint.read_bytes()).values())
    r = report(tmp)
    assert (r["valid_items"], r["modality_available"], r["repeat_available"]) == (128, 8, 4)
    assert any(item["reference_probability"] == 0 for c in r["cells"] for item in c["items"].values())
    print("Matched settled branch ran through reserve 4 only after three durable valid results. Wrong answers retained through completion.")

with tempfile.TemporaryDirectory() as tmp:
    child = subprocess.run([sys.executable, "-B", "-c", "import os,sys; from s3_v2.runtime import run; from s3_v2.test_v2 import Fake; run(sys.argv[1], Fake(), lambda _: os._exit(73))", tmp])
    assert child.returncode == 73
    assert len(ledger(tmp)) == 7
    r = report(tmp)
    assert (r["valid_requests"], r["modality_available"], r["repeat_available"], r["terminal"]) == (3, 1, 0, False)
    assert all(c["status"] == "NOT_ATTEMPTED" and c["items"] is None for c in r["cells"][3:])
    print("Actual child crash at checkpoint retained three valid responses and held the fourth reserve.")

with tempfile.TemporaryDirectory() as tmp:
    fake = Fake()
    def mismatch(rows):
        return {**unverified(rows), rows[0]["id"]: {"state": "unverified", "debit_nano_usd": 0}}
    result = run(tmp, fake, mismatch)
    assert fake.sent == 3 and ledger(tmp)[-1]["failure"] == "CHECKPOINT_FAILED"
    r = report(tmp)
    print("Malformed unverified record stops before reserve 4. Report failure and cell reason:", r.get("failure"), r["cells"][3].get("reason"))
    if r.get("failure") is not None:
        assert r["failure"] == "CHECKPOINT_FAILED" and r["cells"][3].get("reason")

with tempfile.TemporaryDirectory() as tmp:
    def timeout(index, obj, headers):
        if index == 2:
            raise TimeoutError
    run(tmp, Fake(timeout), unverified)
    r = report(tmp)
    print("A handed-off transport timeout is reported as", r["cells"][2]["status"], "with outcome", r["cells"][2]["outcome"])
    assert r["cells"][2]["status"] == "UNKNOWN_POTENTIALLY_BILLED"
    assert r["cells"][2]["reason"] == r["failure"] == "TRANSPORT_TIMEOUT"

with tempfile.TemporaryDirectory() as tmp:
    def shift(index, obj, headers):
        if index == 1:
            a = obj["answers"]["q01"]
            a["choice"] = "k2"
            a["probabilities"] = {"k1": 0.2, "k2": 0.4, "k3": 0.4}
    run(tmp, Fake(shift), unverified)
    r = report(tmp)
    contrast = r["contrasts"][0]["items"]["q01"]
    assert contrast["selected_interpretation_changed"] and abs(contrast["tv"] - 0.8) < 1e-12
    assert contrast["right_minus_left"] == {"d0": -0.8, "d1": 0.4, "d2": 0.4}
    assert set(r["cells"][1]["items"]["q01"]["argmax"]) == {"d1", "d2"}
    comp = r["cells"][0]["items"]["q01"]["comparators_not_model_observations"]
    assert comp["deterministic_reference"] == {"d0": 1, "d1": 0, "d2": 0}
    assert comp["always_uncertain"] == {"d0": 0, "d1": 0, "d2": 1}
    assert r["cells"][4]["items"]["q01"]["comparators_not_model_observations"]["always_uncertain"] is None
    print("Nonzero contrast preserves signed differences, TV, tied argmax change and comparator vectors with explicit unavailable state.")
