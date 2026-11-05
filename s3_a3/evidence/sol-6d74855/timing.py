import sys,pathlib,importlib.util,tempfile,json,time,threading
from unittest.mock import patch
root=pathlib.Path(sys.argv[1]).resolve(); spec=importlib.util.spec_from_file_location('reviewed',root/'s3_a3/dispatcher.py'); d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
sys.path.insert(0,str(root/'s3_a3/tests'));import fakes
print(json.dumps({'import':str(d.__file__)}))
for mode in ['reserve3600','reserve3601','hung','late']:
 with tempfile.TemporaryDirectory() as tmp:
  state=pathlib.Path(tmp)/'state'; clock=[0.]; sends=[]; orig=d._append; release=threading.Event()
  def append(fd,ch,rec):
   orig(fd,ch,rec)
   if mode.startswith('reserve') and rec['type']=='RESERVE' and rec['provider']=='glide':clock[0]=float(mode[7:])
  def fake(url,h,b,t):
   aid,_=fakes.disk_reservation(state);sends.append({'id':aid,'time':clock[0],'timeout':t})
   if mode=='hung':release.wait(2)
   if mode=='late':time.sleep(.06)
   obj,hs=fakes.valid_response(aid,b);return 200,hs,json.dumps(obj).encode()
  start=time.monotonic()
  with patch.object(d,'_append',append),patch.object(d,'MAX_TIMEOUT_S',.03):out=d.run(state,fake,served_allowlist=[fakes.SERVED],clock=lambda:clock[0])
  elapsed=time.monotonic()-start
  before=d.paths(state)['ledger'].read_bytes();release.set();time.sleep(.09);assert before==d.paths(state)['ledger'].read_bytes()
  print(json.dumps({'case':mode,'sends':sends,'elapsed':elapsed,'result':out,'inspection':d.inspect(state)}))
