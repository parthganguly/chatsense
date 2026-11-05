"""New independent real-advancing offset-clock campaign-window probes. No network."""
import os,sys,time,json,tempfile,hashlib,signal
from pathlib import Path
from unittest.mock import patch
ROOT=Path(os.environ.get('REVIEW_REPO',os.getcwd())).resolve()
sys.path.insert(0,str(ROOT/'s3_a3')); import dispatcher as d
F=d.load_frozen();R=d.build_requests(F)
def reply(i):
 r=F['rows'][i]; answers={}
 for q,keys in r['serialized_option_keys'].items():
  win=r['canonical_to_wire'][q][F['key'][r['card']][q]['correct']]
  answers[q]={'type':'choice','choice':win,'probabilities':{k:int(k==win) for k in keys}}
 obj={'model':d.REPORTED_MODELS[r['provider']],'answers':answers,'usage':{'input_tokens':1,'output_tokens':0}}
 hs=[('Content-Type','application/json')]
 if r['provider']=='glide':obj['token_usage']=1;hs += [('X-Fastino-Served-Model','OFFLINE'),('X-Fastino-Data-Retention','zero')]
 return 200,hs,json.dumps(obj).encode()
results=[]
with tempfile.TemporaryDirectory() as tmp:
 for elapsed,stall,late in [(3299,False,False),(3300,False,False),(3301,False,False),(3350,False,False),(3590,False,False),(3350,True,False),(3350,False,True)]:
  state=Path(tmp)/str(len(results)); offset=[0.];seen=[]; origin=[None];hits=[];append=d._append
  def clock():return time.monotonic()+offset[0]
  def app(fd,chain,r):
   append(fd,chain,r)
   if r['type']=='RESERVE' and r['id']==R[1]['id']:offset[0]=elapsed
  def fake(url,headers,body,timeout):
   now=clock()
   if origin[0] is None:origin[0]=now
   left=3600-(now-origin[0]); assert timeout<=left,(timeout,left)
   i=len(seen);seen.append({'row':i+1,'elapsed':now-origin[0],'timeout':timeout,'remaining':left})
   if late and i==31:offset[0]=3601
   return reply(i)
  def trace(frame,event,arg):
   if event=='call' and frame.f_code is fake.__code__:
    hits.append(1)
    if stall and len(hits)==2:time.sleep(.02)
   return trace
  sys.settrace(trace)
  try:
   with patch.object(d,'_append',app):out=d.run(state,fake,served_allowlist=['OFFLINE'],clock=clock)
  finally:sys.settrace(None)
  rep=d.inspect(state);assert not rep['errors'],rep
  if stall:assert len(seen)==1 and out['outcomes'][-1][1]=='NOT_SENT_HANDOFF_LATE' and rep['reserved_micro_usd']['total']==28000
  elif late:assert len(seen)==32 and out['outcomes'][-1][1]=='RESPONSE_LATE' and out['stop_reason']=='TECHNICAL_FAILURE'
  else:assert len(seen)==32 and out['stop_reason']=='PLAN_COMPLETE'
  rec={'elapsed_offset':elapsed,'stall':stall,'late_final':late,'entry_receipts':seen,'out':out,'inspection':rep};results.append(rec);print(json.dumps(rec))
 # Exact original reservation crossings, retaining the original reserve.
 for crossing in (3600,3601):
  now=[0.];seen=[];state=Path(tmp)/str(crossing);append=d._append
  def app(fd,ch,r):
   append(fd,ch,r)
   if r['type']=='RESERVE' and r['id']==R[1]['id']:now[0]=crossing
  def fake(u,h,b,t):seen.append([now[0],t]);return reply(len(seen)-1)
  with patch.object(d,'_append',app):out=d.run(state,fake,served_allowlist=['OFFLINE'],clock=lambda:now[0])
  rep=d.inspect(state);assert len(seen)==1 and rep['reserved_micro_usd']['total']==28000 and out['outcomes'][-1][1]=='NOT_SENT_TIME_LIMIT'
  print(json.dumps({'exact_crossing':crossing,'seen':seen,'out':out,'inspection':rep}))
print('NEW WINDOW CHECKS PASSED')
