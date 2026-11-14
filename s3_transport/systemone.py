"""Single-POST SystemOne transport; no command-line launcher or credential lookup."""
import hashlib
import http.client
import math
from pathlib import Path
import socket
import ssl
import time
from urllib.parse import urlsplit

from s3_a3 import dispatcher as d


# Owner decision #6686504920 grants a separate one-use campaign with the accepted account snapshot.
FINANCIAL_RECEIPT_SHA256 = "f92df97aaace87b80f9e5aaef84ed0a0799b5c48403471ce421dcbc75030bcda"
STATE_ROOT = Path.home() / "Library" / "Application Support" / "ChatSense-S3-6686504920"
FINANCIAL_RECEIPT = Path(__file__).resolve().parent / "evidence" / "account-preflight.json"


def _require_financial_receipt():
    raw = d._read(FINANCIAL_RECEIPT)
    if hashlib.sha256(raw).hexdigest() != FINANCIAL_RECEIPT_SHA256:
        raise d.Refused("FINANCIAL_PREFLIGHT_MISMATCH")


class TransportError(Exception):
    """Fixed, non-sensitive failure code."""


FASTINO_HOST = urlsplit(d.PROVIDER_URLS["glide"]).hostname


def _connect_ipv4_first(address, timeout, source_address=None):
    """TCP only: IPv4 candidates first, then IPv6, within one shared `timeout` budget."""
    deadline = time.monotonic() + timeout
    infos = socket.getaddrinfo(*address, 0, socket.SOCK_STREAM)
    infos.sort(key=lambda info: info[0] != socket.AF_INET)  # stable: resolver order kept per family
    error = OSError("NO_ADDRESS")
    for i, (family, kind, proto, _, sockaddr) in enumerate(infos):
        left = deadline - time.monotonic()
        if left <= 0:
            raise TimeoutError("CONNECT_TIMEOUT")
        try:
            sock = socket.socket(family, kind, proto)
            try:
                # Leave time for each remaining address, including IPv6 fallback.
                sock.settimeout(left / (len(infos) - i))
                if source_address:
                    sock.bind(source_address)
                sock.connect(sockaddr)
                left = deadline - time.monotonic()
                if left <= 0:
                    raise TimeoutError("CONNECT_TIMEOUT")
                sock.settimeout(left)  # TLS uses the remaining budget.
                return sock
            except BaseException:
                sock.close()
                raise
        except OSError as exc:
            error = exc
    raise error


def _https(host, timeout):
    conn = http.client.HTTPSConnection(host, timeout=timeout, context=ssl.create_default_context())
    if host == FASTINO_HOST:
        # Mac resolver lists unreachable IPv6 first; TLS still wraps with server_hostname=host.
        conn._create_connection = _connect_ipv4_first
    return conn


def _json_strings(value):
    pending = [value]
    while pending:
        item = pending.pop()
        if isinstance(item, str):
            yield item
        elif isinstance(item, dict):
            pending.extend(item.keys())
            pending.extend(item.values())
        elif isinstance(item, list):
            pending.extend(item)


def _check_reflection(raw, received, tokens):
    if any(token.encode("ascii") in raw or any(token in k or token in v for k, v in received)
           for token in tokens):
        raise TransportError("CREDENTIAL_REFLECTION")
    if b"\\" in raw:
        # The on-disk JSON would disclose the decoded text even if escaped in transit.
        try:
            obj = d._strict_json(raw)
        except (ValueError, UnicodeError, RecursionError):
            return  # the dispatcher will refuse malformed JSON and cannot archive it
        if any(token in field for field in _json_strings(obj) for token in tokens):
            raise TransportError("CREDENTIAL_REFLECTION")


class _SystemOne:
    def __init__(self, requests, credentials):
        self.rows = requests
        self.credentials = credentials
        self.sent = 0
        self.pair_reconciled = False
        self.closed = False
        self.deadline = None

    def __call__(self, url, headers, body, timeout):
        if self.closed or self.sent >= len(self.rows) or (self.sent >= 2 and not self.pair_reconciled):
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
            lengths = response.headers.get_all("Content-Length", [])
            encodings = response.headers.get_all("Transfer-Encoding", [])
            if (len(lengths) > 1 or len(encodings) > 1 or (lengths and encodings)
                    or (encodings and encodings[0].lower() != "chunked")
                    or (lengths and (not lengths[0].isascii() or not lengths[0].isdecimal()
                                     or int(lengths[0]) > d.MAX_RESPONSE_BYTES))):
                raise TransportError("INVALID_RESPONSE_FRAMING")
            raw = response.read(d.MAX_RESPONSE_BYTES + 1)
            if lengths and len(raw) != int(lengths[0]):
                raise TransportError("TRUNCATED_RESPONSE")
            remaining()
            if len(raw) > d.MAX_RESPONSE_BYTES:
                raise TransportError("RESPONSE_TOO_LARGE")
            received = response.getheaders()
            # Valid response bodies are archived by A3. Refuse a reflected credential
            # before either the raw body or any response header reaches that boundary.
            _check_reflection(raw, received, tuple(self.credentials.values()))
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
    from .settlement import run_with_checkpoint
    return run_with_checkpoint(STATE_ROOT, transport, served_allowlist, reconcile_first_pair, rows)
