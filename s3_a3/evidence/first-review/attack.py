import sys, os, json, tempfile, subprocess, hashlib, signal
from pathlib import Path
from unittest.mock import patch
ROOT=Path('/Users/parth/Projects/chatsense-s3-a3-sol-v1')
sys.path.insert(0,str(ROOT/'s3_a3'))
import dispatcher as d
F=d.load_frozen(); R=d.build_requests(F)
def reply(i):
 row=F['rows'][i]; p=row['provider']; answers={}
 for q,opts in row['serialized_option_keys'].items():
  correct=F['key'][row['card']][q]['correct']; win=row['canonical_to_wire'][q][correct]
  answers[q]={'type':'choice','choice':win,'probabilities':{k:int(k==win) for k in opts}}
 obj={'model':d.REPORTED_MODELS[p],'answers':answers,'usage':{'input_tokens':1,'output_tokens':0}}
 if p=='glide': obj['token_usage']=1
 headers=[('Content-Type','application/json')]
 if p=='glide': headers += [('X-Fastino-Served-Model','OFFLINE'),('X-Fastino-Data-Retention','zero')]
 return 200,headers,json.dumps(obj).encode()
def run(state, change=None):
 calls=[]
 def fake(url,h,b,t):
  i=len(calls); assert (url,h,b)==(R[i]['url'],R[i]['headers'],R[i]['body']); assert t<=300
  ledger=[json.loads(x) for x in d.paths(state)['ledger'].read_bytes().splitlines()]
  assert ledger[-1]['type']=='RESERVE' and ledger[-1]['id']==R[i]['id']
  calls.append(i); return change(i,reply(i)) if change else reply(i)
 return d.run(state,fake,served_allowlist=('OFFLINE',)),calls
if len(sys.argv)>1:
 state,stage=sys.argv[1:]; orig=d._append; receipt=d._write_receipt
 def crash(): os.kill(os.getpid(),signal.SIGKILL)
 def app(fd,c,r):
  if stage=='before_reserve' and r['type']=='RESERVE': crash()
  orig(fd,c,r)
  if stage=='after_reserve' and r['type']=='RESERVE': crash()
 def wr(*a):
  if stage=='before_receipt': crash()
  out=receipt(*a)
  if stage=='after_receipt': crash()
  return out
 d._append=app; d._write_receipt=wr
 if stage=='marker':
  origsync=d._fsync_dir
  def sync(p):
   origsync(p)
   if p==d.paths(state)['auth_dir']: crash()
  d._fsync_dir=sync
 if stage=='transport':
  def transport(*a):
   Path(state+'/handoff').write_text('fake only'); crash()
  d.run(state,transport,served_allowlist=('OFFLINE',))
 else: run(state)
 sys.exit()
results=[]
def record(name,details): results.append({'test':name,'result':details}); print(json.dumps(results[-1]))
with tempfile.TemporaryDirectory(prefix='sol-a3-') as tmp:
 base=Path(tmp)
 summary,calls=run(base/'full'); assert len(calls)==32 and summary['stop_reason']=='PLAN_COMPLETE'
 rep=d.inspect(base/'full'); assert rep['complete'] and not rep['errors']; assert rep['reserved_micro_usd']['total']==448000
 record('full plan, exact transport bytes, reserve on disk, intentional repeats',rep['counts'])
 for stage in ('marker','before_reserve','after_reserve','transport','before_receipt','after_receipt'):
  state=base/stage; p=subprocess.run([sys.executable,'-B',__file__,str(state),stage],capture_output=True)
  assert p.returncode==-signal.SIGKILL,(stage,p.stderr)
  rep=d.inspect(state)
  try: run(state); raise AssertionError('resumed')
  except d.Refused as e: assert e.code=='AUTHORIZATION_CONSUMED'
  if stage in ('after_reserve','transport','before_receipt','after_receipt'): assert rep['counts']['unknown']==1 and rep['reserved_micro_usd']['total']==3000
  record('SIGKILL '+stage,rep)
  if d.paths(state)['ledger'].exists(): d.paths(state)['ledger'].unlink()
  try: run(state); raise AssertionError('resumed lost ledger')
  except d.Refused as e: assert e.code=='AUTHORIZATION_CONSUMED'
  record('lost ledger '+stage,d.inspect(state)['errors'])
 for name,mutate in [('duplicate first',lambda rs:rs[:1]+rs[:1]+rs[2:]),('wrong provider',lambda rs:[{**rs[0],'provider':'glide'}]+rs[1:]),('wrong body',lambda rs:[{**rs[0],'body':b'{}'}]+rs[1:]),('duplicate before R',lambda rs:rs[:20]+[rs[0]]+rs[21:]),('duplicate after R',lambda rs:rs[:24]+[rs[20]]+rs[25:])]:
  with patch.object(d,'build_requests',return_value=mutate(R)):
   try: run(base/name); raise AssertionError('accepted')
   except d.Refused as e: assert e.code=='PLAN_MISMATCH'
  assert not (base/name).exists(); record(name,'refused before state')
 for name,change in [('unsupported status',lambda i,r:(425,r[1],r[2])),('malformed tuple',lambda i,r:[*r]),('hostile header',lambda i,r:(200,r[1]+[('X-Request-Id','x\r\ny')],r[2])),('invalid body',lambda i,r:(200,r[1],b'{"model":NaN}'))]:
  summary,calls=run(base/name,change); assert len(calls)==1 and summary['stop_reason']=='TECHNICAL_FAILURE'; record(name,summary)
 # Race two processes whose fake transport immediately kills its winner.
 state=base/'race'; ps=[subprocess.Popen([sys.executable,'-B',__file__,str(state),'transport'],stdout=subprocess.PIPE,stderr=subprocess.PIPE) for _ in range(2)]
 outs=[p.communicate() for p in ps]; assert sorted(p.returncode for p in ps)==[-9,1]
 rep=d.inspect(state); assert rep['counts']['attempted']==1; record('two-process race',rep)
print('ALL INDEPENDENT CHECKS PASSED')
