import pathlib,sys,tempfile,time
from unittest.mock import patch
sys.path[:0]=[str(pathlib.Path('s3_a3').resolve()),str(pathlib.Path('s3_a3/tests').resolve())]
import dispatcher as d
from fakes import FakeProvider,SERVED
with tempfile.TemporaryDirectory() as tmp, patch.object(d,'TIME_LIMIT_S',1.0),patch.object(d,'MAX_TIMEOUT_S',.95):
 fake=FakeProvider(tmp)
 def transport(*args):
    out=fake(*args)
    if len(fake.calls)==1:time.sleep(.08)
    return out if len(fake.calls)==1 else (429,[],b'')
 r=d.run(tmp,transport,served_allowlist=(SERVED,))
 print('handoffs',len(fake.calls),'timeouts',[row['timeout'] for row in fake.calls],'outcomes',r['outcomes'])
 assert len(fake.calls)==2
