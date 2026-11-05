"""Single-POST SystemOne transport; no command-line launcher or credential lookup."""
import hashlib
import http.client
import math
from pathlib import Path
import ssl
import time
from urllib.parse import urlsplit

from s3_a3 import dispatcher as d


# The amendment forbids a live send until both providers' no-external-charge
# restrictions are verified. No qualifying TypeSafe settlement evidence exists yet.
# Pin the reviewed, current, redacted evidence file only after that gate passes.
FINANCIAL_RECEIPT_SHA256 = None
STATE_ROOT = Path.home() / "Library" / "Application Support" / "ChatSense-S3"
FINANCIAL_RECEIPT = STATE_ROOT.parent / "ChatSense-S3-financial-preflight.json"


def _require_financial_receipt():
    import json
    if FINANCIAL_RECEIPT_SHA256 is None:
        raise d.Refused("FINANCIAL_PREFLIGHT_INCOMPLETE")
    raw = d._read(FINANCIAL_RECEIPT)
    if hashlib.sha256(raw).hexdigest() != FINANCIAL_RECEIPT_SHA256:
        raise d.Refused("FINANCIAL_PREFLIGHT_MISMATCH")
    reviewed_at = json.loads(raw)["verified_epoch"]
    if type(reviewed_at) is not int or not 0 <= time.time() - reviewed_at <= 900:
        raise d.Refused("FINANCIAL_PREFLIGHT_EXPIRED")


class TransportError(Exception):
    """Fixed, non-sensitive failure code."""


def _https(host, timeout):
    return http.client.HTTPSConnection(host, timeout=timeout, context=ssl.create_default_context())


class _SystemOne:
    def __init__(self, requests, credentials):
        self.rows = requests
        self.credentials = credentials
        self.sent = 0
        self.closed = False
        self.deadline = None

    def __call__(self, url, headers, body, timeout):
        if self.closed or self.sent >= len(self.rows):
            raise TransportError("TRANSPORT_CLOSED")
        self.closed = True  # Any exception or rejected response permanently closes this instance.
        start = time.monotonic()
        if self.deadline is None:
            self.deadline = start + d.TIME_LIMIT_S
        if not math.isfinite(timeout) or not 0 < timeout <= d.MAX_TIMEOUT_S:
            raise TransportError("INVALID_TIMEOUT")
        bound = min(self.deadline, start + timeout)

        def remaining():
            value = bound - time.monotonic()
            if value <= 0:
                raise TimeoutError("TIME_LIMIT")
            return value

        row = self.rows[self.sent]
        if (url != row["url"] or url != d.PROVIDER_URLS[row["provider"]]
                or headers != row["headers"] or type(body) is not bytes
                or hashlib.sha256(body).hexdigest() != row["body_sha256"]):
            raise TransportError("WIRE_MISMATCH")
        key = self.credentials[row["provider"]]
        if type(key) is not str or not key or not key.isascii() or any(not 33 <= ord(c) <= 126 for c in key):
            raise TransportError("INVALID_AUTH")
        auth = {"Authorization": "Bearer " + key} if row["provider"] == "jev" else {"X-API-Key": key}
        target = urlsplit(url)
        conn = _https(target.hostname, remaining())
        try:
            conn.set_debuglevel(0)
            conn.auto_open = 0
            conn.connect()  # TLS only. No HTTP request or authorization header yet.
            conn.sock.settimeout(remaining())
            # http.client's buffer contains a single exact POST. No redirect or retry machinery.
            conn.putrequest("POST", target.path, skip_accept_encoding=True)
            for name, value in {**headers, **auth, "Content-Length": str(len(body)), "Connection": "close"}.items():
                conn.putheader(name, value)
            conn.sock.settimeout(remaining())
            self.sent += 1
            conn.endheaders(body)
            conn.sock.settimeout(remaining())
            response = conn.getresponse()
            raw = response.read(d.MAX_RESPONSE_BYTES + 1)
            remaining()
            if len(raw) > d.MAX_RESPONSE_BYTES:
                raise TransportError("RESPONSE_TOO_LARGE")
            received = response.getheaders()
            # Valid response bodies are archived by A3. Refuse a reflected credential
            # before either the raw body or any response header reaches that boundary.
            if any(token.encode("ascii") in raw or any(token in k or token in v for k, v in received)
                   for token in self.credentials.values()):
                raise TransportError("CREDENTIAL_REFLECTION")
            result = (response.status, received, raw)
            self.closed = response.status != 200
            return result
        except TimeoutError:
            raise TimeoutError("TRANSPORT_TIMEOUT") from None
        except Exception:
            raise TransportError("TRANSPORT_FAILED") from None
        finally:
            conn.close()


def run_counted(credentials, served_allowlist, reconcile_first_pair):
    """Operator entry, only after separate verified financial preflight. Single fixed state root."""
    _require_financial_receipt()
    if not callable(reconcile_first_pair) or not served_allowlist:
        raise d.Refused("PREFLIGHT_INCOMPLETE")
    frozen = d.load_frozen()
    rows = d.build_requests(frozen)
    d.verify_requests(rows, frozen)
    transport = _SystemOne(rows, dict(credentials))
    from .settlement import checkpoint
    return d.run(STATE_ROOT, transport, served_allowlist=served_allowlist,
                 after_first_pair=checkpoint(reconcile_first_pair))
