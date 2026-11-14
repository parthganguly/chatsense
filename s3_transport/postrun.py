"""Read-only validation of accepted receipts before unchanged canonical scoring.

Uses the live response contract and the original recorded body bytes. Never
reconsiders rejected attempts, rewrites receipts, dispatches, or scores a study.
"""
from s3_a3 import dispatcher as d


def validate_recorded_responses(state_root):
    """Return {attempt_id: response} for VALID receipts in a finished ledger.

    The ledger/receipt integrity check is separate from semantic validation.
    As with A3 inspect, authentic local run-generated evidence is the trust
    boundary; this is not authentication against wholesale evidence rewriting.
    """
    audit = d.inspect(state_root)
    if audit["errors"] or not audit["complete"]:
        raise d.Invalid("POSTRUN_LEDGER_INVALID")
    paths = d.paths(state_root)
    rows = {row["id"]: row for row in d.load_frozen()["rows"]}
    responses = {}
    served_seen = body_model_seen = None
    for line in d._read(paths["ledger"]).splitlines():
        record = d._strict_json(line)
        if record["type"] != "RESULT" or record["outcome"] != "VALID":
            continue
        row = rows[record["id"]]
        raw = d._read(paths["receipts"] / record["receipt"])
        if d._sha(raw) != record["response_sha256"]:
            raise d.Invalid("RECEIPT_HASH_MISMATCH")
        info = {}
        response = d._check_response(
            (record["http_status"], list(record["safe_headers"].items()), raw),
            row, (d.MODELS["glide"],), served_seen, info, body_model_seen)
        responses[row["id"]] = response
        if row["provider"] == "glide":
            served_seen = info["safe_headers"]["x-fastino-served-model"]
            body_model_seen = response["model"]
    return responses
