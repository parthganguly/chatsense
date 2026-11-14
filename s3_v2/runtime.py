"""Isolated v2 policy over unchanged A3 durability, deadlines and response validation.
No credentials or live launcher. Each engine owns its globals; v1 is never patched.
"""
import importlib.util,json,os,time
from pathlib import Path
from s3_a3 import dispatcher as base
from .build import render,INSTRUCTION
from .pin import FREEZE_SHA256
PACKET=Path(__file__).resolve().parent/'packet'

def engine():
 spec=importlib.util.spec_from_file_location('_s3_v2_engine',base.__file__);d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
 d.FREEZE_SHA256=FREEZE_SHA256;d.AUTH_ID='s3-v2-'+FREEZE_SHA256[:16];d.FACTUAL_CHECKPOINT=17
 def load(packet=PACKET):
  packet=Path(packet);raw=d._read(packet/'FREEZE.json')
  if d._sha(raw)!=FREEZE_SHA256:raise d.Refused('FREEZE_MISMATCH')
  inventory=json.loads(raw)['files'];files={rel:d._read(packet/rel) for rel in inventory}
  if any(d._sha(files[k])!=v for k,v in inventory.items()):raise d.Refused('INVENTORY_MISMATCH')
  j=lambda k:json.loads(files[k])
  return dict(files=files,bank=j('QUESTION-BANK.json')['cards'],key=j('EVALUATOR-KEY.json')['cards'],plan=j('CALL-PLAN.json'),stim={s['card']:s for s in j('stimuli/manifest.json')['cards']},rows=j('wire-manifest.json')['requests'])
 def decoded(body,text_mode,provider):
  if type(body["state"]) is not list or len(body["state"])!=2 or body["state"][0]!=INSTRUCTION:raise ValueError("INSTRUCTION_MISMATCH")
  return base._decoded_stimulus({**body,"state":body["state"][1:]},text_mode,provider)
 d._decoded_stimulus=decoded
 d.load_frozen=load;d._render=render
 fz=load();d.WIRE_SHA256=d._sha(fz['files']['wire-manifest.json']);d.INVENTORY_SHA256=d._digest(json.loads(d._read(PACKET/'FREEZE.json'))['files'])
 d.ORDER_SHA256=d._digest(d._order(d.build_requests(fz)))
 def verify(reqs,fz):
  if len(reqs)!=16 or len(fz['rows'])!=16 or d._digest(d._order(reqs))!=d.ORDER_SHA256:raise d.Refused('PLAN_MISMATCH')
  for r,row in zip(reqs,fz['rows']):d.validate_outbound(r,row)
  for a,b in [(1,12),(3,13),(2,14),(0,15)]:
   if reqs[a]['body']!=reqs[b]['body']:raise d.Refused('REPEAT_MISMATCH')
 d.verify_requests=verify
 return d

class CheckpointStop(BaseException):pass

def reconcile(d,state,reader):
 audit=d.inspect(state)
 if audit['errors'] or audit['counts']['valid']!=3 or audit['counts']['attempted']!=3:raise ValueError('CHECKPOINT_LEDGER_INVALID')
 records=[json.loads(l) for l in d._read(d.paths(state)['ledger']).splitlines()]
 results=[r for r in records if r['type']=='RESULT'];rows=d.load_frozen()['rows'][:3]
 if [(r['id'],r['outcome']) for r in results]!=[(r['id'],'VALID') for r in rows]:raise ValueError('CHECKPOINT_INCOMPLETE')
 statements=reader(results)
 if type(statements) is not dict or set(statements)!={r['id'] for r in rows}:raise ValueError('CHECKPOINT_UNSETTLED')
 out={}
 for r,row in zip(results,rows):
  s=statements[r['id']]
  if s=={'state':'unverified'}:
   out[r['id']]={'state':'settled_debit_unverified','estimated_input_nano_usd':r['provisional_input_nano_usd']};continue
  numeric=('before_nano_usd','after_nano_usd','debit_nano_usd')
  reserve=next(x for x in records if x['type']=='RESERVE' and x['id']==r['id'])
  if (type(s) is not dict or any(type(s.get(k)) is not int or s[k]<0 for k in numeric) or s.get('state')!='settled' or s.get('attempt_body_sha256')!=reserve['body_sha256'] or not d.re.fullmatch('[0-9a-f]{64}',s.get('account_evidence_sha256','')) or s['before_nano_usd']-s['after_nano_usd']!=s['debit_nano_usd'] or s['debit_nano_usd']!=r['provisional_input_nano_usd'] or s['debit_nano_usd']>d.RESERVE_MICRO_USD[row['provider']]*1000):raise ValueError('CHECKPOINT_DEBIT_MISMATCH')
  out[r['id']]={k:s[k] for k in (*numeric,'state','account_evidence_sha256','attempt_body_sha256')}
 d._create(d.paths(state)['run_dir']/'cross-provider-accounting.json',d._canon(out))

def run(state,transport,reader,clock=time.monotonic):
 d=engine();rows=d.load_frozen()['rows'];checked=False
 if transport is None or not callable(reader):raise d.Refused('LIVE_DISPATCH_DISABLED')
 original_append=d._append
 def append(fd,chain,record):
  nonlocal checked
  if record["type"]=="RESERVE" and record["id"]==rows[3]["id"]:
   if not checked:raise CheckpointStop
   record["checkpoint_sha256"]=d._sha(d._read(d.paths(state)["run_dir"]/"cross-provider-accounting.json"))
  original_append(fd,chain,record)
  if record['type']=='RESULT' and record['id']==rows[2]['id'] and record['outcome']=='VALID':
   try:reconcile(d,state,reader)
   except Exception:raise CheckpointStop from None
   checked=True
   if hasattr(transport,'pair_reconciled'):transport.pair_reconciled=True
 d._append=append
 # A3 wraps ordinary ledger exceptions; use a BaseException to leave its fd closed,
 # then append a terminal stop only after auditing the durable three-result prefix.
 try:return d.run(state,transport,served_allowlist=(d.MODELS['glide'],),clock=clock,packet=PACKET)
 except (CheckpointStop,d.Aborted) as exc:
  if not isinstance(exc,CheckpointStop):raise
  audit=d.inspect(state)
  if audit['errors'] or audit['counts']['valid']!=3:raise d.Aborted('CHECKPOINT_LEDGER_INVALID')
  p=d.paths(state);lines=d._read(p['ledger']).splitlines();last=json.loads(lines[-1]);unseen=[r['id'] for r in rows[3:]]
  stop=dict(type='STOP',reason='TECHNICAL_FAILURE',failure='CHECKPOINT_FAILED',attempted=3,not_attempted=unseen,reserved_micro_usd=audit['reserved_micro_usd'],cost_status=d.COST_STATUS)
  fd=os.open(p['ledger'],os.O_WRONLY|os.O_APPEND|os.O_NOFOLLOW)
  try:original_append(fd,{'seq':len(lines),'prev':last['hash']},stop)
  finally:os.close(fd)
  return dict(stop_reason='TECHNICAL_FAILURE',failure='CHECKPOINT_FAILED',handoffs=3)
