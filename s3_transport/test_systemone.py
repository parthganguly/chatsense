"""Local TLS only. Test DNS is replaced by a connection to the loopback server."""
import http.client
import http.server
import json
from pathlib import Path
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from s3_a3 import dispatcher as d
from s3_transport import systemone as wire
from s3_transport.settlement import run_with_checkpoint

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "s3_a3/tests"))
from fakes import SERVED, valid_response

KEYS = {"jev": "synthetic-jev-auth-token", "glide": "synthetic-glide-auth-token"}


class WireTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.certs = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.certs.cleanup)
        root = Path(cls.certs.name)
        (root/"config").write_text("[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\nCN=local fixture\n[ext]\nsubjectAltName=DNS:api.typesafe.ai,DNS:api.fastino.ai\nbasicConstraints=CA:TRUE\n")
        subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes","-days","1","-config",str(root/"config"),"-keyout",str(root/"key"),"-out",str(root/"cert")],check=True,capture_output=True)
        cls.server_tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        cls.server_tls.load_cert_chain(root/"cert", root/"key")
        cls.client_tls = ssl.create_default_context(cafile=str(root/"cert"))
        cls.rows = d.build_requests(d.load_frozen())

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.state = Path(tmp.name)/"state"
        self.posts = []
        self.mode = "normal"
        outer = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_POST(self):
                idx = len(outer.posts)
                row = outer.rows[idx]
                body = self.rfile.read(int(self.headers["Content-Length"]))
                outer.posts.append((self.path, dict(self.headers), body))
                ledger = [json.loads(x) for x in d.paths(outer.state)["ledger"].read_bytes().splitlines()]
                self.server.reservations.append((ledger[-1]["type"], ledger[-1]["id"]))
                if outer.mode == "drop":
                    self.connection.shutdown(socket.SHUT_RDWR)
                    return
                obj, headers = valid_response(row["id"],body)
                if outer.mode == "echo":
                    obj["note"] = KEYS[row["provider"]]
                status = 307 if outer.mode == "redirect" else (429 if idx == 2 else 200)
                self.send_response(status)
                if status == 307:self.send_header("Location","/must-not-follow")
                for k,v in headers:self.send_header(k,v)
                payload=json.dumps(obj).encode()
                self.send_header("Content-Length",str(len(payload) + (7 if outer.mode == "truncated" else 0)))
                self.end_headers()
                self.wfile.write(payload)

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
        self.server.socket=self.server_tls.wrap_socket(self.server.socket,server_side=True)
        self.server.reservations=[]
        t=threading.Thread(target=self.server.serve_forever,daemon=True)
        t.start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        def connect_local(host,timeout):
            c=http.client.HTTPSConnection(host,context=self.client_tls,timeout=timeout)
            c._create_connection=lambda address,*args: socket.create_connection(self.server.server_address,*args)
            return c
        self.local=patch.object(wire,"_https",side_effect=connect_local)
        self.local.start()
        self.addCleanup(self.local.stop)

    def settlement(self, results):
        self.assertEqual(2,len(self.posts))
        self.assertEqual(2,len(results))
        return {r["id"]:{"state":"settled","before_nano_usd":1000000000,
                          "after_nano_usd":1000000000-r["provisional_input_nano_usd"],
                          "debit_nano_usd":r["provisional_input_nano_usd"],
                          "account_evidence_sha256":"a"*64,"attempt_body_sha256":row["body_sha256"]}
                for row,r in zip(self.rows,results)}

    def dispatch(self,reader):
        return run_with_checkpoint(self.state, wire._SystemOne(self.rows,KEYS), [SERVED], reader, self.rows)

    def check_no_secrets(self):
        for p in self.state.rglob("*"):
            if p.is_file():
                for key in KEYS.values():self.assertNotIn(key.encode(),p.read_bytes())

    def test_valid_pair_then_counted_third_error(self):
        result=self.dispatch(self.settlement)
        self.assertEqual(result["handoffs"],3)
        self.assertEqual(result["failure"],"HTTP_STATUS")
        for row,(path,headers,body),res in zip(self.rows,self.posts,self.server.reservations):
            self.assertEqual(res,("RESERVE",row["id"]))
            self.assertEqual(path,"/v1/systemone")
            self.assertEqual(headers["Host"],row["url"].split("/")[2])
            self.assertEqual(body,row["body"])
            for k,v in row["headers"].items():self.assertEqual(headers[k],v)
            if row["provider"]=="jev":
                self.assertEqual(headers["Authorization"],"Bearer "+KEYS["jev"])
                self.assertNotIn("X-API-Key",headers)
            else:
                self.assertEqual(headers["X-API-Key"],KEYS["glide"])
                self.assertNotIn("Authorization",headers)
        self.assertTrue((d.paths(self.state)["run_dir"]/"first-pair-settlement.json").is_file())
        self.assertEqual(d.inspect(self.state)["errors"],[])
        self.check_no_secrets()

    def test_unknown_settlement_no_third_reservation(self):
        result=self.dispatch(lambda results:{})
        self.assertEqual(result["failure"],"PAIR_RECONCILIATION_FAILED")
        self.assertEqual((result["handoffs"],len(self.posts),len(result["not_attempted"])),(2,2,30))
        self.assertEqual(result["reserved_micro_usd"]["total"],28000)
        with self.assertRaises(d.Refused):self.dispatch(self.settlement)

    def test_balance_mismatch_stops_at_pair(self):
        def bad(rows):
            data=self.settlement(rows)
            data[rows[1]["id"]]["after_nano_usd"]-=1
            return data
        self.assertEqual(self.dispatch(bad)["failure"],"PAIR_RECONCILIATION_FAILED")
        self.assertEqual(len(self.posts),2)

    def test_redirect(self):
        self.mode="redirect"
        self.assertEqual(self.dispatch(self.settlement)["failure"],"HTTP_STATUS")
        self.assertEqual(len(self.posts),1)

    def test_response_lost_no_retry(self):
        self.mode="drop"
        self.assertEqual(self.dispatch(self.settlement)["failure"],"TRANSPORT_ERROR")
        self.assertEqual(len(self.posts),1)
        self.assertEqual(d.inspect(self.state)["reserved_micro_usd"]["total"],3000)

    def test_reflected_secret_never_archived(self):
        self.mode="echo"
        self.assertEqual(self.dispatch(self.settlement)["failure"],"TRANSPORT_ERROR")
        self.check_no_secrets()

    def test_json_escaped_credential_refused(self):
        self.mode="echo"
        with patch.dict(KEYS, {"jev": 'synthetic-jev-"-secret'}):
            self.assertEqual(self.dispatch(self.settlement)["failure"],"TRANSPORT_ERROR")
            self.assertEqual(list(d.paths(self.state)["receipts"].iterdir()),[])

    def test_truncated_valid_json_refused(self):
        self.mode="truncated"
        self.assertEqual(self.dispatch(self.settlement)["failure"],"TRANSPORT_ERROR")
        self.assertEqual(len(self.posts),1)

    def test_missing_financial_clearance_consumes_nothing(self):
        with patch.object(wire,"STATE_ROOT",self.state):
            with self.assertRaisesRegex(d.Refused,"FINANCIAL_PREFLIGHT_INCOMPLETE"):
                wire.run_counted(KEYS,[SERVED],self.settlement)
        self.assertEqual(self.posts,[])
        self.assertFalse(self.state.exists())
