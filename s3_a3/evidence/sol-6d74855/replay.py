#!/usr/bin/env python3
"""Offline independent fault probes; repo argument required. No sockets/credentials."""
import sys, pathlib, importlib.util, tempfile, json, threading, inspect, errno
from unittest.mock import patch
root=pathlib.Path(sys.argv[1]).resolve()
spec=importlib.util.spec_from_file_location('reviewed_dispatcher',root/'s3_a3/dispatcher.py'); d=importlib.util.module_from_spec(spec); spec.loader.exec_module(d)
sys.path.insert(0,str(root/'s3_a3/tests')); import fakes
results={'imported':str(pathlib.Path(d.__file__).resolve()),'cases':[]}
def record(name,**kw): results['cases'].append(dict(case=name,**kw))
def run_case(name,setup):
 with tempfile.TemporaryDirectory() as tmp: setup(pathlib.Path(tmp)/'state')
def gap(state,target):
 clock=[0.0]; seen=[]; hits=[0]
 # Trace models scheduler preemption AFTER worker deadline check, BEFORE ordinary callback call.
 line=inspect.getsourcelines(d._handoff)[1]+next(i for i,s in enumerate(inspect.getsourcelines(d._handoff)[0]) if 'out = ("result", transport(' in s)
 def tracer(frame,event,arg):
  if event=='line' and frame.f_code.co_filename==d.__file__ and frame.f_lineno==line:
   hits[0]+=1
   if hits[0]==2: clock[0]=target
  return tracer
 def fake(url,headers,body,timeout):
  aid,_=fakes.disk_reservation(state); seen.append({'id':aid,'time':clock[0],'timeout':timeout})
  obj,hs=fakes.valid_response(aid,body); return 200,hs,json.dumps(obj).encode()
 threading.settrace(tracer)
 try: out=d.run(state,fake,served_allowlist=[fakes.SERVED],clock=lambda:clock[0])
 finally: threading.settrace(None)
 record('post_final_check_gap_'+str(target),observed=seen,result=out,inspection=d.inspect(state),invariant_pass=len(seen)==1)
for t in [3600,3601]: run_case('gap',lambda s,t=t:gap(s,t))
for header,value in [('x-ratelimit-scope','secret_canary'),('x-ratelimit-code','authorization'),('x-request-id','Bearer SECRET_CANARY'),('content-type','application/json; secret=SECRET_CANARY')]:
 def probe(state,header=header,value=value):
  def fake(url,headers,body,timeout): return 429,[(header,value),('arbitrary-secret-key','SECRET_CANARY')],b'{}'
  out=d.run(state,fake,served_allowlist=[]); text=d.paths(state)['ledger'].read_text()
  record('metadata_'+header,value_persisted=value in text,arbitrary_key_persisted='arbitrary-secret-key' in text,result=out)
 run_case('header',probe)
for function in ['_fsync','_fsync_dir']:
 def probe(state,function=function):
  orig=getattr(d,function); calls=[0]; sends=[]
  def interrupted(*a):
   calls[0]+=1
   if calls[0]==1: raise InterruptedError(errno.EINTR,'offline injected interruption')
   return orig(*a)
  with patch.object(d,function,interrupted):
   try: d.run(state,lambda *a:sends.append(1),served_allowlist=[]); outcome='returned'
   except BaseException as e: outcome=type(e).__name__+':'+str(e)
  record('interrupted_'+function,outcome=outcome,sends=len(sends),inspection=d.inspect(state))
 run_case('sync',probe)
print(json.dumps(results,indent=2))
