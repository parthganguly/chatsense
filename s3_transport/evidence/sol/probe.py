"""Focused probes, synthetic credentials and loopback TLS only. Run from pinned checkout."""
import json, socket, sys, time, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path.cwd()))
from s3_transport import test_systemone as fixtures
from s3_transport import systemone as w
from s3_transport.settlement import run_with_checkpoint
from s3_a3 import dispatcher as d
OUT=Path(__file__).resolve().parent

def receipt(name, obj):
    (OUT/(name+'.json')).write_text(json.dumps(obj, indent=2))

class Probe(fixtures.WireTest):
    def test_unicode_reflection(self):
        raw=b'{"note":"'+''.join('\\u%04x'%ord(c) for c in fixtures.KEYS['jev']).encode()+b'"}'
        with self.assertRaises(w.TransportError):
            w._check_reflection(raw, [], tuple(fixtures.KEYS.values()))
        receipt('unicode-reflection', {'rejected':True,'synthetic_raw':raw.decode()})

    def test_tls_deadline_before_post(self):
        # Complete real local TLS, but return from connect after the deadline.
        original=w._https
        def slow(host, timeout):
            conn=original(host, timeout)
            connect=conn.connect
            def delayed():
                connect()
                time.sleep(0.08)
            conn.connect=delayed
            return conn
        transport=w._SystemOne(self.rows, fixtures.KEYS)
        row=self.rows[0]
        with patch.object(w,'_https',side_effect=slow):
            with self.assertRaises(TimeoutError):
                transport(row['url'],row['headers'],row['body'],0.04)
        self.assertEqual(self.posts,[])
        self.assertEqual(transport.sent,0)
        self.assertTrue(transport.closed)
        receipt('tls-deadline',{'posts':len(self.posts),'sent':transport.sent,'closed':transport.closed})

    def test_checkpoint_crash_is_consumed(self):
        class Crash(BaseException): pass
        def reader(_): raise Crash()
        with self.assertRaises(Crash): self.dispatch(reader)
        rep=d.inspect(self.state)
        self.assertTrue(rep['authorization_consumed'])
        self.assertFalse(rep['complete'])
        self.assertEqual(len(self.posts),2)
        with self.assertRaises(d.Refused): self.dispatch(self.settlement)
        receipt('checkpoint-crash',rep)

    def test_secondary_interlock(self):
        transport=w._SystemOne(self.rows, fixtures.KEYS)
        result=d.run(self.state,transport,served_allowlist=[fixtures.SERVED])
        self.assertEqual(len(self.posts),2)
        self.assertEqual(result['failure'],'TRANSPORT_ERROR')
        self.assertFalse(transport.pair_reconciled)
        receipt('secondary-interlock',result)

if __name__=='__main__':
    # Reject any accidental non-loopback connection, including proxies.
    connect=socket.socket.connect
    def guarded(sock,address):
        if not isinstance(address,tuple) or address[0] not in ('127.0.0.1','::1'):
            raise AssertionError('non-loopback connection denied')
        return connect(sock,address)
    with patch.object(socket.socket,'connect',guarded):
        unittest.main(verbosity=2)
