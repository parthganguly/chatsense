import os,sys,json,tempfile,errno
from pathlib import Path
from unittest.mock import patch
root=Path(os.environ.get('REVIEW_REPO',os.getcwd())).resolve();sys.path.insert(0,str(root/'s3_a3'));import dispatcher as d
with tempfile.TemporaryDirectory() as t:
 for target in ('_fsync','_fsync_dir'):
  for nth in (1,4,8):
   state=Path(t)/(target+str(nth));hits=[];calls=[];orig=getattr(d,target)
   def interrupted(*args):
    hits.append(1)
    if len(hits)==nth:raise InterruptedError(errno.EINTR,'independent interrupted sync')
    return orig(*args)
   def fake(*args):calls.append(1);return 500,[],b'{}'
   with patch.object(d,target,interrupted):
    try:out=d.run(state,fake,served_allowlist=[]);code=out['failure']
    except (d.Refused,d.Aborted) as e:code=e.code
   assert len(hits)>=nth and not calls,(target,nth,hits,calls)
   # If marker exists, process cannot retry, even when ledger setup never finished.
   if d.paths(state)['marker'].exists():
    try:d.run(state,fake,served_allowlist=[]);raise AssertionError('resumed')
    except d.Refused as e:assert e.code=='AUTHORIZATION_CONSUMED'
   print(json.dumps({'case':target,'interrupted_at':nth,'sends':len(calls),'code':code,'consumed':d.paths(state)['marker'].exists()}))
