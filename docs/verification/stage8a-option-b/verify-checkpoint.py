"""Verify a blocked engineering checkpoint. This does not grant UX or study readiness."""
import hashlib
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parents[2]
checkpoint = json.loads((root / "CHECKPOINT.json").read_text())
assert checkpoint["decision"] == "BLOCKED"
assert checkpoint["ux_candidate_decision"] == "FAIL"
assert checkpoint["p0_v2_frozen"] is False
assert checkpoint["human_study_decision"] == "NOT_RUN"
assert checkpoint["human_observations"] == 0
entries = checkpoint["files"]
assert len(entries) == len({x["path"] for x in entries})
for entry in entries:
    p = repo / entry["path"]
    assert p.stat().st_size == entry["bytes"], entry["path"]
    assert hashlib.sha256(p.read_bytes()).hexdigest() == entry["sha256"], entry["path"]
inventory = "".join(f'{e["sha256"]}  {e["path"]}\n' for e in entries)
assert hashlib.sha256(inventory.encode()).hexdigest() == checkpoint["inventory_sha256"]
actual_evidence = {str(p.relative_to(repo)) for p in root.rglob("*") if p.is_file()
                   and p.name not in {"CHECKPOINT.json", ".DS_Store"}
                   and "__pycache__" not in p.parts and p.suffix not in {".pyc", ".pyo"}}
listed_evidence = {e["path"] for e in entries if e["path"].startswith("docs/verification/stage8a-option-b/")}
assert actual_evidence == listed_evidence
subprocess.run(["git", "diff", "--exit-code", checkpoint["source_candidate"], "--",
                "app", "components", "features", "packages", "contracts", "lib", "platform",
                "styles", "utils", "hooks", "public", "fixtures", "package.json", "package-lock.json"],
               cwd=repo, check=True, stdout=subprocess.PIPE)
print(f'Blocked checkpoint integrity verified: {len(entries)} files; inventory SHA-256 {checkpoint["inventory_sha256"]}')
print("CHECKPOINT.json SHA-256 " + hashlib.sha256((root / "CHECKPOINT.json").read_bytes()).hexdigest())
print("UX FAIL; P0 v2 not frozen; human study NOT_RUN. Integrity is not acceptance.")
