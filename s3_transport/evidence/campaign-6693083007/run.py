"""One operator invocation of the reviewed live entry point. No retry or resume."""
import datetime
import json
import os
import subprocess
import sys
from pathlib import Path
from s3_a3 import dispatcher
from s3_transport import systemone

os.umask(0o077)
private = Path(__file__).resolve().parent
# Operator-only namespace for the separately authorized third campaign.
systemone.STATE_ROOT = Path.home() / "Library" / "Application Support" / "ChatSense-S3-6693083007"
if systemone.STATE_ROOT.exists():
    raise dispatcher.Refused("CAMPAIGN_STATE_ALREADY_EXISTS")
def key(provider):
    cmd = ["security", "find-generic-password", "-s", "chatsense-" + provider, "-w"]
    value = subprocess.run(cmd, capture_output=True, check=True).stdout.decode("ascii").strip()
    if not value or not all(33 <= ord(c) <= 126 for c in value):
        raise ValueError("Invalid credential format")
    return value

def account_review(rows):
    print("First pair passed technical checks. Waiting for the operator's billing observation.", flush=True)
    print(json.dumps([{k:r[k] for k in ("id","outcome","usage","provisional_input_nano_usd","safe_headers")} for r in rows]), flush=True)
    return json.loads(input())

keys = {provider: key(provider) for provider in ("jev", "glide")}
hosts = {"api.typesafe.ai":"jev", "api.fastino.ai":"glide"}
# Count HTTPS write attempts separately from entry into the reserved transport.
# The audit hook never logs request headers, request bodies, credentials or URLs.
def observe(event, args):
    if event == "http.client.send":
        conn, payload = args
        if conn.host in hosts and isinstance(payload, bytes) and payload.startswith(b"POST /v1/systemone HTTP/"):
            stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
            with (private/"http-attempts.jsonl").open("a") as out:
                out.write(json.dumps({"provider": hosts[conn.host], "utc": stamp})+"\n")
                out.flush()
                os.fsync(out.fileno())
sys.addaudithook(observe)
result = systemone.run_counted(keys, ["fastino/GLiDE"], account_review)
with (private/"dispatch-result.json").open("x") as output:
    json.dump(result, output, indent=2)
    output.write("\n")
print(json.dumps({k:result[k] for k in ("handoffs","failure","stop_reason","outcomes")}), flush=True)
