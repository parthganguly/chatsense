import os,sys,json,tempfile,time,signal,errno
from pathlib import Path
from unittest.mock import patch
ROOT=Path(os.environ.get('REVIEW_REPO',os.getcwd())).resolve()
sys.path.insert(0,str(ROOT/'s3_a3')); import dispatcher as d
sys.path.insert(0,str(Path(__file__).parent)); import attack as a
print(json.dumps({'source':str(Path(d.__file__).resolve()),'sha':__import__('hashlib').sha256(Path(d.__file__).read_bytes()).hexdigest()}))
with tempfile.TemporaryDirectory() as tmp:
 base=Path(tmp)
 for jump in (3600,3601):
  now=[0.]; original=d._append; observed=[]
  def app(fd,ch,r):
   original(fd,ch,r)
   if r['type']=='RESERVE' and r['id']==a.R[1]['id']: now[0]=jump
  def fake(u,h,b,t):
   observed.append([now[0],t]);return a.reply(len(observed)-1)
  with patch.object(d,'_append',app): out=d.run(base/str(jump),fake,served_allowlist=['OFFLINE'],clock=lambda:now[0])
  rep=d.inspect(base/str(jump));assert len(observed)==1 and rep['counts']['not_sent']==1 and rep['reserved_micro_usd']['total']==28000
  print(json.dumps({'case':'reservation_crossing','jump':jump,'seen':observed,'result':out,'inspection':rep}))
 # Real elapsed timing: window 0.5 s / maximum per-call timeout 0.3 s.
 # First response takes 0.25 s, leaving < max timeout, without virtual jumps.
 state=base/'real';observed=[];start=time.monotonic()
 def real(u,h,b,t):
  observed.append([time.monotonic()-start,t]);
  if len(observed)==1:time.sleep(.25)
  return a.reply(len(observed)-1)
 with patch.object(d,'TIME_LIMIT_S',.5),patch.object(d,'MAX_TIMEOUT_S',.3):out=d.run(state,real,served_allowlist=['OFFLINE'])
 assert len(observed)==1 and out['outcomes'][-1][1]=='NOT_SENT_HANDOFF_LATE'
 print(json.dumps({'case':'scaled_real_window_last_max_timeout','seen':observed,'elapsed':time.monotonic()-start,'result':out}))
 state=base/'blocked';old=signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGALRM})
 try:
  try:a.run(state);raise AssertionError('accepted')
  except d.Refused as e:assert e.code=='TIMEOUT_UNAVAILABLE'
  assert not state.exists();print(json.dumps({'case':'inherited_blocked_alarm','refused_before_state':True}))
 finally:signal.pthread_sigmask(signal.SIG_SETMASK,old)
 for target in ('_fsync','_fsync_dir'):
  state=base/target; calls=[]
  def fail(*args):raise OSError(errno.EIO,'injected hard sync failure')
  def fake(*args):calls.append(1);return a.reply(0)
  with patch.object(d,target,fail):
   try:d.run(state,fake,served_allowlist=['OFFLINE']);raise AssertionError('accepted')
   except (d.Aborted,d.Refused) as e:code=e.code
  assert not calls;print(json.dumps({'case':'hard_sync_'+target,'code':code,'sends':len(calls)}))
print('NEW CHECKS PASSED')
