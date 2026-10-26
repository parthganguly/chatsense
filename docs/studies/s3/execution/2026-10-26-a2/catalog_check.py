"""Read-only A2 catalog evidence. No inference, SDK, retries, or raw secret output.

The only authenticated destinations are the two documented catalog GETs below.
Credentials remain in memory. Account identifiers and unselected fields are not saved.
"""
import datetime
import hashlib
import http.client
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
TARGETS = (
    ("jev", "chatsense-jev", "api.typesafe.ai", "/v1/models", "Authorization"),
    ("glide", "chatsense-glide", "api.fastino.ai", "/v1/base-models?supports_inference=true", "X-API-Key"),
)
FIELDS = {
    "jev": {"name", "description", "release_date"},
    "glide": {"id", "label", "description", "task_type", "supports_inference",
              "supports_image_input", "supports_zdr", "context_window", "max_input_tokens",
              "max_output_tokens", "input_price_per_million", "output_price_per_million",
              "cache_read_price_per_million", "cache_write_price_per_million",
              "deprecated", "sunset_date"},
}

def main():
    destination = ROOT / "authenticated-catalogs.json"
    # A rerun requires a consciously new evidence file; never overwrite an observation.
    with destination.open("x") as out:
        receipts = []
        for provider, service, host, path, header in TARGETS:
            rec = {"provider": provider, "method": "GET", "url": "https://" + host + path,
                   "retrieved_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                   "credential_source": "existing macOS Keychain scoped service",
                   "redirects": False, "application_retries": 0, "inference": False}
            key = None
            conn = None
            try:
                p = subprocess.run(["security", "find-generic-password", "-a", os.environ["USER"],
                                    "-s", service, "-w"], capture_output=True, check=False)
                rec["credential_available"] = p.returncode == 0 and bool(p.stdout.strip())
                if not rec["credential_available"]:
                    rec["status"] = "CREDENTIAL_UNAVAILABLE"
                    receipts.append(rec)
                    continue
                key = p.stdout.decode().strip()
                del p
                conn = http.client.HTTPSConnection(host, timeout=30)
                conn.request("GET", path, headers={header: ("Bearer " if provider == "jev" else "") + key,
                                                   "Accept": "application/json"})
                response = conn.getresponse()
                data = response.read(2_000_001)
                rec.update(http_status=response.status, response_bytes=len(data),
                           raw_response_sha256=hashlib.sha256(data).hexdigest())
                rec["headers"] = {h: v for h, v in response.getheaders()
                                  if h.lower() in {"content-type", "date", "x-fastino-served-model",
                                                   "x-fastino-data-retention"}}
                if response.status == 200 and len(data) <= 2_000_000:
                    body = json.loads(data)
                    rows = body.get("models", []) if isinstance(body, dict) else []
                    rec["models"] = [{k: v for k, v in row.items() if k in FIELDS[provider]}
                                     for row in rows if isinstance(row, dict) and
                                     (provider == "jev" or "glide" in str(row.get("id", "")).lower())]
                    rec["projection"] = "allowlisted model-contract fields only; other models omitted for GLiDE"
                else:
                    rec["body"] = "not persisted; no error body or credential echoed"
            except Exception as e:
                rec["error_type"] = type(e).__name__  # Never stringify exceptions containing headers.
            finally:
                key = None
                if conn:
                    conn.close()
            receipts.append(rec)
        json.dump(receipts, out, indent=2)
        out.write("\n")
    print(destination.read_text())

if __name__ == "__main__":
    main()
