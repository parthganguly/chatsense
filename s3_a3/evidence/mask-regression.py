import signal,sys,tempfile,time
from pathlib import Path
from unittest.mock import patch
sys.path[:0]=[str(Path('s3_a3').resolve()),str(Path('s3_a3/tests').resolve())]
import dispatcher as d
from fakes import SERVED
signal.signal(signal.SIGALRM,signal.SIG_IGN)
signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGALRM})
events=[]
def fake(*args):
    events.append('entered')
    time.sleep(.18)
    events.append('continued_after_timeout')
    return (500,[],b'')
with tempfile.TemporaryDirectory() as tmp, patch.object(d,'MAX_TIMEOUT_S',.035):
    try:r=d.run(tmp,fake,served_allowlist=(SERVED,))
    except d.Refused as e:r={'refused':e.code}
print('events',events,'terminal', r.get('failure') or r.get('refused'))
assert 'continued_after_timeout' not in events
