import os,sys,subprocess,json,hashlib,tempfile,signal
from pathlib import Path
root=Path(os.environ.get('REVIEW_REPO',os.getcwd())).resolve();sys.path.insert(0,str(root/'s3_a3'));import dispatcher as d
for args in [['git','rev-parse','HEAD'],['git','status','--porcelain'],['git','diff','HEAD^','HEAD','--name-only'],[sys.executable,'-B','s3_a3/dispatcher.py','verify'],[sys.executable,'-B','s3_a3/dispatcher.py','run']]:
 r=subprocess.run(args,cwd=root,capture_output=True,text=True);print(json.dumps({'command':args,'returncode':r.returncode,'stdout':r.stdout,'stderr':r.stderr}))
with tempfile.TemporaryDirectory() as t:
 state=Path(t)/'blocked';old=signal.pthread_sigmask(signal.SIG_BLOCK,{signal.SIGALRM})
 try:
  def fake(*args):raise AssertionError('sent')
  try:d.run(state,fake,served_allowlist=[]);raise AssertionError('accepted')
  except d.Refused as e:assert e.code=='TIMEOUT_UNAVAILABLE';print(json.dumps({'blocked_alarm':e.code,'state_exists':state.exists()}));assert not state.exists()
 finally:signal.pthread_sigmask(signal.SIG_SETMASK,old)
print(json.dumps({'dispatcher_sha256':hashlib.sha256((root/'s3_a3/dispatcher.py').read_bytes()).hexdigest()}))
