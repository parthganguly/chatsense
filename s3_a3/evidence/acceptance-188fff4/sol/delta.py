"""Verify immutable test-only delta and corrected targeted mutation in disposable archive."""
import subprocess,tempfile,hashlib,os,sys,json,tarfile,io
from pathlib import Path
ROOT=Path(os.environ.get('REVIEW_REPO',os.getcwd())).resolve()
OLD='e8a4efa9967f5832513298ff1f217170ae7abc82';NEW='188fff410e35dfaaf9961b6f7cbe12bf6d20fba3'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
changed=git('diff','--name-only',OLD,NEW).decode().splitlines();assert changed==['s3_a3/tests/mutation_check.py'],changed
old=git('show',OLD+':s3_a3/dispatcher.py');new=git('show',NEW+':s3_a3/dispatcher.py');assert old==new
print(json.dumps({'old':OLD,'new':NEW,'changed':changed,'identical_dispatcher_sha256':hashlib.sha256(new).hexdigest(),'diff':git('diff',OLD,NEW).decode()}),flush=True)
with tempfile.TemporaryDirectory(prefix='sol-delta-') as tmp:
 with tarfile.open(fileobj=io.BytesIO(git('archive',NEW))) as ar:ar.extractall(tmp,filter='data')
 commands=[[sys.executable,'-B','-m','unittest','test_dispatcher.ReceiverEntry.test_window_opens_at_first_receiver_entry'],[sys.executable,'-B','mutation_check.py','window anchored before receiver']]
 for i,cmd in enumerate(commands):
  r=subprocess.run(cmd,cwd=Path(tmp)/'s3_a3/tests',capture_output=True,text=True)
  print(json.dumps({'command':cmd,'returncode':r.returncode,'stdout':r.stdout,'stderr':r.stderr}),flush=True)
  assert r.returncode==0
  if i==1:assert r.stdout.strip()=='KILLED'
print('DELTA CHECK PASSED')
