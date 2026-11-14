"""Read-only descriptive output; valid prefixes survive technical stops and crashes."""
import json
from .runtime import engine

def report(state):
 d=engine();fz=d.load_frozen();audit=d.inspect(state)
 if audit['errors']:raise d.Invalid('REPORT_LEDGER_INVALID')
 records=[json.loads(l) for l in d._read(d.paths(state)['ledger']).splitlines()]
 responses={};metadata={};served=body=None
 for r in records:
  if r['type']!='RESULT' or r['outcome']!='VALID':continue
  row=next(x for x in fz['rows'] if x['id']==r['id']);info={}
  raw=d._read(d.paths(state)['receipts']/r['receipt'])
  obj=d._check_response((r['http_status'],list(r['safe_headers'].items()),raw),row,(d.MODELS['glide'],),served,info,body)
  if row['provider']=='glide':served=info['safe_headers']['x-fastino-served-model'];body=obj['model']
  responses[row['id']]=obj;metadata[row['id']]={k:info[k] for k in ('usage','provisional_input_nano_usd')}
  if row['provider']=='glide':metadata[row['id']]['token_usage']=obj['token_usage']
 checkpoint=d.paths(state)['run_dir']/'cross-provider-accounting.json'
 for r in records:
  if r['type']=='RESERVE' and r['id']==fz['rows'][3]['id']:
   if not checkpoint.exists() or d._sha(d._read(checkpoint))!=r.get('checkpoint_sha256'):raise d.Invalid('CHECKPOINT_HASH_MISMATCH')
 attempts={a['id']:a for a in audit['attempts']};cells=[]
 for row in fz['rows']:
  a=attempts.get(row['id']);cell={'id':row['id'],'provider':row['provider'],'card':row['card'],'mode':row['mode'],'repeat':row['repeat'],'status':a['status'] if a else 'NOT_ATTEMPTED','outcome':a['outcome'] if a else None,'items':None}
  cell.update(body_sha256=row['body_sha256'],stimulus_sha256=row['decoded_stimulus_sha256'],usage_and_estimate=metadata.get(row['id']))
  if row['id'] in responses:
   obj=responses[row['id']];items={}
   for q,ans in obj['answers'].items():
    mapping=row['canonical_to_wire'][q];probs={c:ans['probabilities'][k] for c,k in mapping.items()};reference=fz['key'][row['card']][q]['correct'];m=max(probs.values())
    question=next(x for x in fz['bank'][row['card']] if x['id']==q)
    items[q]={'question':question['instructions'],'options':question['options'],'probabilities':probs,'reference':reference,'reference_probability':probs[reference],'argmax':[k for k,v in probs.items() if abs(v-m)<=1e-9]}
   cell['items']=items
  cells.append(cell)
 def contrast(a,b,kind):
  x,y=cells[a-1],cells[b-1];valid=x['items'] is not None and y['items'] is not None
  return {'kind':kind,'left':x['id'],'right':y['id'],'available':valid,'items':{q:{'tv':sum(abs(v-y['items'][q]['probabilities'][k]) for k,v in item['probabilities'].items())/2,'right_minus_left':{k:y['items'][q]['probabilities'][k]-v for k,v in item['probabilities'].items()}} for q,item in x['items'].items()} if valid else None}
 modality=[(1,2),(3,4),(5,9),(6,10),(8,12),(7,11),(16,13),(15,14)];repeat=[(1,16),(2,13),(3,15),(4,14)]
 contrasts=[contrast(a,b,'modality') for a,b in modality]+[contrast(a,b,'repeat') for a,b in repeat]
 return {'study':'S3 v2 descriptive only; not human comprehension','freeze_sha256':d.FREEZE_SHA256,'technical_complete':audit['complete'] and audit['stop_reason']=='PLAN_COMPLETE','terminal':audit['complete'],'stop_reason':audit['stop_reason'],'planned_requests':16,'planned_items':128,'valid_requests':len(responses),'valid_items':8*len(responses),'reserved_micro_usd':audit['reserved_micro_usd'],'settled_cost':'UNVERIFIED','cells':cells,'contrasts':contrasts,'modality_available':sum(c['available'] for c in contrasts[:8]),'modality_planned':8,'repeat_available':sum(c['available'] for c in contrasts[8:]),'repeat_planned':4}
