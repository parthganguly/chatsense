"""Verify v2 scientific invariants against the fixed v1 evidence hashes.
No participant records are accepted or written.
"""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
rules = json.loads((root / "SCIENCE-INVARIANTS.json").read_text())
assert rules["target_participants"] == 10
assert rules["comprehension_min_correct"] == 8
assert rules["history_confirmed_promise_max"] == 0
assert rules["history_no_promise_required"] == 10
assert rules["usefulness_min_card_median"] == 4
assert rules["usefulness_min_qualifying_cards"] == 2
assert rules["creepiness_max"] == 2
assert rules["own_chat_interest_min"] == 5
for field in ("reduced_n_pass", "missing_core_allows_pass", "ambiguous_history_allows_pass",
              "participant_replacement_after_exposure"):
    assert rules[field] is False, field
assert rules["creepiness_aggregation"] == "median of ten participant medians over five cards"
assert rules["own_chat_interest_aggregation"] == "distinct participants with at least one unambiguous yes"
assert rules["human_study_decision"] == "NOT_RUN"
assert not rules["participant_recruitment_authorized"]
assert not rules["stage8b_authorized"]
for entry in rules["unchanged_files"]:
    actual = hashlib.sha256((root / entry["path"]).read_bytes()).hexdigest()
    assert actual == entry["v1_sha256"] == entry["v2_sha256"], entry["path"]
for entry in rules["version_only_files"]:
    content = (root / entry["path"]).read_text().replace("2026-10-26-v2", "2026-10-24-v1").replace("urn:chatsense:stage8a:raw-response:v2", "urn:chatsense:stage8a:raw-response:v1")
    assert hashlib.sha256(content.encode()).hexdigest() == entry["v1_sha256"] == entry["normalized_v2_sha256"]
protocol = (root / "PREREGISTRATION.md").read_text()
tail = "## Sample and stopping" + protocol.split("## Sample and stopping", 1)[1]
assert hashlib.sha256(tail.encode()).hexdigest() == rules["v1_scientific_methods_tail_sha256"]
for path, version in [("materials/BLANK-RESPONSE.json", "2026-10-26-v2"),
                      ("materials/response.schema.json", "2026-10-26-v2")]:
    obj = json.loads((root / path).read_text())
    actual = obj.get("protocol_version") if "BLANK" in path else obj["properties"]["protocol_version"]["const"]
    assert actual == version
print("Scientific preservation PASS: methods from Sample and stopping onward and 8 instrument/material files are byte-identical to v1; version identifiers are v2.")
print("N=10; comprehension>=8; zero history promises; usefulness>=4 on>=2; participant-median creepiness<=2; distinct-person interest>=5.")
print("Human study NOT_RUN; recruitment unauthorized; Stage8B blocked.")
