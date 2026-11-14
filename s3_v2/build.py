"""Offline deterministic science builder; never dispatches. Run only before freezing."""
import json, pathlib, shutil
from s3_a3 import dispatcher as base
INSTRUCTION='Read the supplied card and select the answer that best fits each question.'
ROOT=pathlib.Path(__file__).resolve().parent
PACKET=ROOT/'packet'
def dump(p,o):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(base._canon(o)+b'\n')
def render(fz,pair,provider):
 raw,headers=base._render(fz,pair,provider);body=json.loads(raw)
 for j,q in enumerate(fz['bank'][pair['card']]):
  if pair['card']=='A' and q['id'] in ('q02','q03','q07'):continue
  keys=list(q['options']);off=(ord(pair['card'])-65+j)%3;keys=keys[off:]+keys[:off]
  body['questions'][q['id']]['criteria']={'k'+str(int(k[1:])+1):q['options'][k] for k in keys}
 body["state"].insert(0,INSTRUCTION)
 return base._dumps(body),headers

def build():
 old=base.load_frozen();bank={};key={};card=None
 for line in (ROOT/'PROTOCOL.md').read_text().splitlines():
  if line.startswith('### ') and line[4] in 'ADE':card=line[4];bank[card]=[];key[card]={}
  if not line.startswith('| q') or card is None:continue
  qid,question,options,ref=[s.strip() for s in line.strip('|').split('|')]
  if card=='A' and qid in ('q02','q03','q07'):
   q=old['bank']['A'][int(qid[1:])-1];correct=old['key']['A'][qid]['correct']
  else:
   q={'id':qid,'instructions':question,'options':{'d'+str(i):v.strip() for i,v in enumerate(options.split(';'))}}
   correct='d'+str(ord(ref)-97)
  bank[card].append(q);key[card][qid]={'correct':correct}
 assert {c:len(v) for c,v in bank.items()}=={'A':8,'D':8,'E':8}
 schedule=[('jev','A','image'),('jev','A','text'),('glide','A','image'),('glide','A','text'),('jev','D','image'),('glide','D','image'),('glide','E','image'),('jev','E','image'),('jev','D','text'),('glide','D','text'),('glide','E','text'),('jev','E','text'),('jev','A','text'),('glide','A','text'),('glide','A','image'),('jev','A','image')]
 pairs=[dict(pair=i,card=c,mode=m,condition='T' if m=='text' else 'U',repeat=i>12,instruction_variant='instructions',providers_in_dispatch_order=[p]) for i,(p,c,m) in enumerate(schedule,1)]
 fz={**old,'bank':bank,'key':key,'plan':{'pairs':pairs}}
 dump(PACKET/'QUESTION-BANK.json',{'cards':bank});dump(PACKET/'EVALUATOR-KEY.json',{'cards':key});dump(PACKET/'CALL-PLAN.json',fz['plan'])
 for st in old['stim'].values():
  for mode in ('image','text'):
   path=PACKET/st[mode+'_path'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(old['files'][st[mode+'_path']])
 dump(PACKET/'stimuli/manifest.json',{'cards':list(old['stim'].values()),'source_freeze':base.FREEZE_SHA256})
 rows=[]
 for pair in pairs:
  provider=pair['providers_in_dispatch_order'][0];raw,headers=render(fz,pair,provider);body=json.loads(raw);i=pair['pair'];card=pair['card']
  ident=f'{i:02d}-{provider}-{pair["condition"]}-{card}'
  mappings={q['id']:{d:next(k for k,v in body['questions'][q['id']]['criteria'].items() if v==txt) for d,txt in q['options'].items()} for q in bank[card]}
  path='bodies/'+ident+'.json';(PACKET/'bodies').mkdir(exist_ok=True);(PACKET/path).write_bytes(raw)
  rows.append(dict(id=ident,provider=provider,pair=i,condition=pair['condition'],card=card,mode=pair['mode'],repeat=pair['repeat'],body_path=path,body_sha256=base._sha(raw),decoded_stimulus_sha256=old['stim'][card][pair['mode']+'_sha256'],nonsecret_headers=headers,canonical_to_wire=mappings,serialized_option_keys={q:list(v['criteria']) for q,v in body['questions'].items()}))
 dump(PACKET/'wire-manifest.json',{'requests':rows})
 dump(PACKET/'budget.json',{'requests':16,'per_provider':8,'reserve_micro_usd':base.RESERVE_MICRO_USD,'cap_micro_usd':base.CAP_MICRO_USD,'planned_reserved_micro_usd':224000,'input_nano_usd':base.NANO_USD_PER_INPUT_TOKEN,'rates':'dated assumptions, not settled charges'})
 shutil.copyfile(ROOT/'PROTOCOL.md',PACKET/'PROTOCOL.md')
 files={str(p.relative_to(PACKET)):base._sha(p.read_bytes()) for p in sorted(PACKET.rglob('*')) if p.is_file() and p.name!='FREEZE.json'}
 dump(PACKET/'FREEZE.json',{'version':'s3-v2-2026-11-14','source_v1':base.FREEZE_SHA256,'files':files})
 (ROOT/'pin.py').write_text('FREEZE_SHA256 = '+repr(base._sha((PACKET/'FREEZE.json').read_bytes()))+'\n')
if __name__=='__main__':build()
