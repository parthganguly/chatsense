"""Fastino connect order. Mocked sockets plus one loopback TLS handshake; no real DNS or hosts."""
from pathlib import Path
import socket
import ssl
import subprocess
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from s3_transport import systemone as wire

V6 = [(socket.AF_INET6, socket.SOCK_STREAM, 6, "", ("2001:db8::%d" % i, 443, 0, 0)) for i in range(4)]
V4 = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.0.2.%d" % i, 443)) for i in range(4)]


class FakeSocket:
    """Records every attempt; `outcome(sockaddr, timeout)` raises or returns."""
    log = []

    def __init__(self, family, kind, proto):
        self.family, self.timeout, self.closed = family, None, False
        self.timeouts = []
        FakeSocket.log.append(self)

    def settimeout(self, value):
        self.timeout = value
        self.timeouts.append(value)
    def close(self): self.closed = True

    def connect(self, sockaddr):
        self.sockaddr = sockaddr
        FakeSocket.outcome(sockaddr, self.timeout)


class OrderTest(unittest.TestCase):
    def run_connect(self, infos, outcome, timeout=5):
        FakeSocket.log, FakeSocket.outcome = [], staticmethod(outcome)
        with patch.object(wire.socket, "getaddrinfo", return_value=list(infos)) as gai, \
                patch.object(wire.socket, "socket", FakeSocket):
            try:
                return wire._connect_ipv4_first(("api.fastino.ai", 443), timeout, None)
            finally:
                gai.assert_called_once_with("api.fastino.ai", 443, 0, socket.SOCK_STREAM)

    def test_ipv4_tried_before_ipv6_in_resolver_order(self):
        def outcome(addr, _):
            if addr[0] != "192.0.2.2":
                raise ConnectionRefusedError
        sock = self.run_connect(V6 + V4, outcome)
        self.assertEqual([s.sockaddr[0] for s in FakeSocket.log], ["192.0.2.0", "192.0.2.1", "192.0.2.2"])
        self.assertFalse(sock.closed)
        self.assertTrue(all(s.closed for s in FakeSocket.log[:-1]))
        self.assertTrue(all(0 < s.timeout <= 5 for s in FakeSocket.log))
        self.assertGreater(sock.timeouts[-1], sock.timeouts[0])

    def test_ipv6_fallback_and_ipv6_only(self):
        def outcome(addr, _):
            if addr[0] != "2001:db8::1":
                raise OSError("unreachable")
        sock = self.run_connect(V6 + V4, outcome)
        self.assertEqual(sock.sockaddr[0], "2001:db8::1")
        self.assertEqual(len(FakeSocket.log), 6)  # four IPv4 failures, then IPv6 in order
        sock = self.run_connect(V6, outcome)
        self.assertEqual([s.sockaddr[0] for s in FakeSocket.log], ["2001:db8::0", "2001:db8::1"])

    def test_total_budget_bounds_all_attempts(self):
        def hang(_, timeout):
            time.sleep(timeout)
            raise socket.timeout
        start = time.monotonic()
        with self.assertRaises(TimeoutError):  # mapped to TRANSPORT_TIMEOUT by _SystemOne
            self.run_connect(V6 + V4, hang, timeout=0.05)
        self.assertLess(time.monotonic() - start, 1)
        self.assertTrue(all(sock.closed for sock in FakeSocket.log))

    def test_all_refused_raises_last_error_and_closes(self):
        def outcome(*_): raise ConnectionRefusedError("last")
        with self.assertRaisesRegex(ConnectionRefusedError, "last"):
            self.run_connect(V6 + V4, outcome)
        self.assertEqual(len(FakeSocket.log), 8)
        self.assertTrue(all(s.closed for s in FakeSocket.log))

    def test_only_fastino_uses_ipv4_first(self):
        self.assertIs(wire._https("api.fastino.ai", 1)._create_connection, wire._connect_ipv4_first)
        self.assertIs(wire._https("api.typesafe.ai", 1)._create_connection, socket.create_connection)


class LoopbackTlsTest(unittest.TestCase):
    def test_fastino_tls_verified_with_original_hostname(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/"config").write_text("[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=local fixture\n[ext]\nsubjectAltName=DNS:api.fastino.ai\nbasicConstraints=CA:TRUE\n")
            subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-config",
                            str(root/"config"), "-keyout", str(root/"key"), "-out", str(root/"cert")],
                           check=True, capture_output=True)
            server_tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            server_tls.load_cert_chain(root/"cert", root/"key")
            client_tls = ssl.create_default_context(cafile=str(root/"cert"))
        seen = []
        server_tls.sni_callback = lambda _s, name, _c: seen.append(name)
        listener = socket.create_server(("127.0.0.1", 0))
        self.addCleanup(listener.close)
        port = listener.getsockname()[1]

        def serve():
            conn, _ = listener.accept()
            with server_tls.wrap_socket(conn, server_side=True) as tls:
                try:
                    tls.recv(1)
                except OSError:
                    pass  # client close after handshake
        threading.Thread(target=serve, daemon=True).start()
        infos = [(socket.AF_INET6, socket.SOCK_STREAM, 6, "", ("::1", port, 0, 0)),
                 (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port))]
        with patch.object(wire.socket, "getaddrinfo", return_value=infos), \
                patch.object(wire.ssl, "create_default_context", return_value=client_tls):
            conn = wire._https("api.fastino.ai", 5)
            start = time.monotonic()
            try:
                conn.connect()
                self.assertEqual(conn.sock.getpeername()[0], "127.0.0.1")
                self.assertEqual(conn.sock.server_hostname, "api.fastino.ai")
                self.assertIsNotNone(conn.sock.getpeercert())  # verified chain + hostname
            finally:
                conn.close()
        self.assertLess(time.monotonic() - start, 1)
        self.assertEqual(seen, ["api.fastino.ai"])
        self.assertTrue(client_tls.check_hostname)
        self.assertEqual(client_tls.verify_mode, ssl.CERT_REQUIRED)


if __name__ == "__main__":
    unittest.main()
