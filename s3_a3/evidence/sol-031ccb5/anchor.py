import sys,os,json,tempfile
from pathlib import Path
from unittest.mock import patch
root=Path(os.environ.get('REVIEW_REPO',os.getcwd())).resolve();sys.path.insert(0,str(root/'s3_a3'));import dispatcher as d
sys.path.insert(0,str(root/'s3_a3/tests'));import fakes
with tempfile.TemporaryDirectory() as t:
 state=Path(t)/'state';now=[0.];seen=[];orig=d._append
 def app(fd,ch,rec):
  orig(fd,ch,rec)
  if rec['type']=='RESERVE' and not seen:now[0]=10000.
 def fake(u,h,b,timeout):
  aid,_=fakes.disk_reservation(state);seen.append([now[0],timeout]);obj,hs=fakes.valid_response(aid,b);return 200,hs,json.dumps(obj).encode()
 with patch.object(d,'_append',app):out=d.run(state,fake,served_allowlist=[fakes.SERVED],clock=lambda:now[0])
 assert len(seen)==32 and out['stop_reason']=='PLAN_COMPLETE' and seen[0]==[10000.,300]
 print(json.dumps({'case':'first_entry_anchor_after_10000_setup_seconds','observed':seen,'result':out}))
