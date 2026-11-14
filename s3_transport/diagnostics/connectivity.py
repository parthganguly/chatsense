#!/usr/bin/env python3
"""S3 macOS connectivity-only probe. DNS, TCP/443 and TLS. No HTTP or credentials.

Run: python3 -B s3_transport/diagnostics/connectivity.py
All output excludes network addresses, request bodies, headers and secrets.
"""
import http.client
import json
import socket
import ssl
import subprocess
import sys
import time
from pathlib import Path

HOSTS = ("api.fastino.ai", "api.typesafe.ai")
MODES = ("adapter", "ipv4", "ipv6")
CONNECT_TIMEOUT_S = 6.0
CHILD_TIMEOUT_S = 12.0

def elapsed_ms(start):
    return round(1000 * (time.monotonic() - start), 1)

def worker(host, mode):
    result = {"host": host, "path": mode, "status": "error", "stage": "start"}
    start = time.monotonic()
    try:
        if mode == "adapter":
            # Mirrors HTTPSConnection.connect() in the reviewed SystemOne
            # transport, without any HTTP request or provider authentication.
            result["stage"] = "https_connect"
            conn = http.client.HTTPSConnection(
                host, timeout=CONNECT_TIMEOUT_S, context=ssl.create_default_context())
            try:
                conn.connect()
            finally:
                conn.close()
            result["https_connect_ms"] = elapsed_ms(start)
        else:
            family = socket.AF_INET if mode == "ipv4" else socket.AF_INET6
            result["stage"] = "dns"
            addresses = socket.getaddrinfo(host, 443, family, socket.SOCK_STREAM)
            result["dns_ms"] = elapsed_ms(start)
            if not addresses:
                raise OSError("No address for this IP family")
            last_error = None
            for af, kind, proto, _, address in addresses:
                sock = socket.socket(af, kind, proto)
                try:
                    sock.settimeout(CONNECT_TIMEOUT_S)
                    result["stage"] = "tcp"
                    t = time.monotonic()
                    sock.connect(address)
                    result["tcp_ms"] = elapsed_ms(t)
                    result["stage"] = "tls"
                    t = time.monotonic()
                    with ssl.create_default_context().wrap_socket(
                            sock, server_hostname=host) as tls:
                        result["tls_ms"] = elapsed_ms(t)
                        result["tls_version"] = tls.version()
                    last_error = None
                    break
                except (OSError, ssl.SSLError) as err:
                    last_error = err
                finally:
                    sock.close()
            if last_error is not None:
                raise last_error
        result["status"] = "ok"
        result["stage"] = "complete"
    except BaseException as err:
        # No exception message: OS failures may disclose IP addresses.
        result["error_class"] = type(err).__name__
        if isinstance(err, OSError):
            result["errno"] = err.errno
    result["total_ms"] = elapsed_ms(start)
    print(json.dumps(result, sort_keys=True))

def main():
    if len(sys.argv) == 4 and sys.argv[1] == "--worker":
        host, mode = sys.argv[2:]
        if host not in HOSTS or mode not in MODES:
            raise SystemExit("unsupported host or mode")
        worker(host, mode)
        return
    if len(sys.argv) != 1:
        raise SystemExit("usage: python3 -B s3_transport/diagnostics/connectivity.py")
    print("S3 diagnostic: no HTTP, API keys, inference or billing")
    script = str(Path(__file__).resolve())
    for host in HOSTS:
        for mode in MODES:
            try:
                p = subprocess.run(
                    [sys.executable, "-B", script, "--worker", host, mode],
                    capture_output=True, text=True,
                    timeout=CHILD_TIMEOUT_S, check=False)
                try:
                    row = json.loads(p.stdout.strip())
                except (ValueError, TypeError):
                    row = {"host": host, "path": mode,
                           "status": "worker_error", "exit_code": p.returncode}
            except subprocess.TimeoutExpired:
                row = {"host": host, "path": mode,
                       "status": "wall_timeout", "limit_s": CHILD_TIMEOUT_S}
            print(json.dumps(row, sort_keys=True), flush=True)

if __name__ == "__main__":
    main()
