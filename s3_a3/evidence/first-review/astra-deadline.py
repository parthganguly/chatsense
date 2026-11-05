"""Astra probe. Simulated pre-handoff fsync takes longer than the remaining window."""
import sys, tempfile
from pathlib import Path
from unittest.mock import patch
sys.path[:0] = [str(Path('s3_a3').resolve()), str(Path('s3_a3/tests').resolve())]
import dispatcher as d
from fakes import FakeProvider, SERVED
with tempfile.TemporaryDirectory() as temp:
    state = Path(temp) / 'state'
    t=[0.0]
    fake=FakeProvider(state)
    observed=[]
    original=d._append
    def append(fd, chain, rec):
        original(fd, chain, rec)
        if rec.get('type')=='RESERVE' and fake.calls:
            t[0]=3601.0
    def send(*args):
        observed.append([t[0],args[-1]])
        return fake(*args)
    with patch.object(d,'_append',append):
        rep=d.run(state,send,served_allowlist=(SERVED,),clock=lambda:t[0])
    print('handoff [elapsed_s, timeout_s]',observed,'stop',rep['stop_reason'])
    assert all(at<3600 and timeout<=3600-at for at,timeout in observed)
