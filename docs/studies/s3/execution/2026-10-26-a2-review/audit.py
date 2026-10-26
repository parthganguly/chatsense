#!/usr/bin/env python3
"""Offline immutable-evidence audit. Never imports or executes the collector."""
import argparse, ast, hashlib, json, struct, subprocess
from functools import lru_cache
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', type=Path, default=Path('/Users/parth/.codex/worktrees/s3-execution-a2/whatsapp-analytics-ui'))
parser.add_argument('--output-dir', type=Path, default=Path('/tmp/chatsense-s3-a2-sol'))
args=parser.parse_args()
R=args.repo.resolve()
E='b664bc814eb5e37812b43e989cc4f9e98ba41789'; F='7ed874b7a3963e560d399b7c0046f5625a2e0757'
P='docs/studies/s3/2026-10-26-v1'; A='docs/studies/s3/execution/2026-10-26-a2'
O=args.output_dir.resolve(); O.mkdir(parents=True,exist_ok=True); checks={}
def git(*args): return subprocess.check_output(['git','-C',str(R),*args])
@lru_cache(maxsize=None)
def blob(c,p): return git('show',c+':'+p)
def sha(b): return hashlib.sha256(b).hexdigest()
def read(p): return blob(E,A+'/'+p)
def j(p): return json.loads(read(p))
def check(k,v):
 checks[k]=v
 assert v,k
check('exact_commit',git('rev-parse','HEAD').decode().strip()==E)
paths=git('ls-tree','-r','--name-only',F,'--',P).decode().splitlines()
check('80_frozen_files',len(paths)==80)
check('frozen_blobs_and_worktree_identical',all(blob(F,p)==blob(E,p)==(R/p).read_bytes() for p in paths))
for inventory,base in [(blob(E,P+'/SHA256SUMS'),P),(read('A2-EVIDENCE-SHA256SUMS'),A)]:
 rows=inventory.decode().splitlines()
 for row in rows:
  h,p=row.split(None,1); p=p.strip().lstrip('*'); full=base+'/'+p
  check('hash:'+full,sha(blob(E,full))==h and (R/full).read_bytes()==blob(E,full))
 checks['inventory_count:'+base]=len(rows)
check('78_protocol_inventory_entries',checks['inventory_count:'+P]==78)
imgs=[]
for p in paths:
 if p.endswith('.png'):
  b=blob(E,p); check('PNG_signature:'+p,b[:8]==b'\x89PNG\r\n\x1a\n'); w,h=struct.unpack('>II',b[16:24])
  check('PNG_limits:'+p,280<=w<=1568 and 280<=h<=1568 and 78400<=w*h<=2458624 and len(b)<=16*1024*1024 and len(b)<=3932160 and w*h<=25000000)
  imgs.append({'file':p,'width':w,'height':h,'bytes':len(b),'sha256':sha(b)})
check('five_pngs',len(imgs)==5)
for x,y in zip(imgs,j('image-eligibility.json')):
 check('image_receipt:'+x['file'],all(y[k]==v for k,v in x.items()))
sources=j('public-sources.json')
for s in sources:
 b=read('public/'+s['file']); check('public_source:'+s['file'],sha(b)==s['sha256'] and len(b)==s['bytes'])
for c in j('source-comparison.json'):
 s=next(s for s in sources if s['url']==c['url']); check('comparison_current:'+c['url'],s['sha256']==c['current_source_sha256'])
 check('comparison_frozen:'+c['url'],c['frozen_source_sha256'] in {sha(blob(F,p)) for p in paths})
 check('comparison_equality:'+c['url'],c['byte_identical']==(c['current_source_sha256']==c['frozen_source_sha256']))
g=j('public/glide-openapi.json'); jev=j('public/jev-openapi.json'); schemas=g['components']['schemas']; cat=j('authenticated-catalogs.json'); model=cat[1]['models'][0]
check('optional_catalog_auth',g['paths']['/v1/base-models']['get']['security']==[] and 'Authentication is optional' in g['paths']['/v1/base-models']['get']['description'])
check('canonical_catalog_fields',model['id']=='fastino/GLiDE' and model['supports_image_input'] is False and model['supports_zdr'] is True and model['supports_inference'] is True and model['deprecated'] is False and model['max_input_tokens']==65536 and model['input_price_per_million']==.04 and model['output_price_per_million']==0)
check('compat_image_flag_scope','compat inference APIs' in schemas['BaseModelResponse']['properties']['supports_image_input']['description'])
check('systemone_images_documented','image_url' in schemas['SystemOneRequest']['properties']['state']['description'])
check('store_contract','error reports and traces' in schemas['SystemOneRequest']['properties']['store']['description'])
check('billed_wording_persists','input plus output' in schemas['SystemOneResponse']['properties']['token_usage']['description'])
for provider,api in [('jev',jev),('glide',g)]:
 check('GET_inventory:'+provider,sorted(p for p,v in api['paths'].items() if 'get' in v)==j('endpoint-discovery.json')[provider]['all_published_GET_paths'])
collector=read('catalog_check.py').decode(); tree=ast.parse(collector)
check('collector_single_GET_callsite',sum(isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='request' for n in ast.walk(tree))==1 and 'conn.request("GET", path' in collector)
check('collector_fixed_targets', '/v1/models' in collector and '/v1/base-models?supports_inference=true' in collector and '/systemone' not in collector)
check('collector_exclusive_output','destination.open("x")' in collector)
inventory={p:sha(blob(E,p)) for p in git('ls-tree','-r','--name-only',E,'--',A).decode().splitlines()}
(O/'EVIDENCE-SHA256SUMS').write_text(''.join(h+'  '+p+'\n' for p,h in inventory.items()))
result={'identity':'Independent Sol audit subagent; task assigned as Sol 6.1; runtime identifies as GPT-6 (no independently queryable model build ID).','audited_commit':E,'frozen_commit':F,'verdict':'PASS-for-BLOCKED-report','not_dispatcher_or_launch_PASS':True,'checks':checks,'boolean_assertion_count':sum(type(v) is bool for v in checks.values()),'inventory_count_records':sum(type(v) is int for v in checks.values()),'command':['python3',str(Path(__file__).resolve()),'--repo',str(R),'--output-dir',str(O)],'audit_script_sha256':sha(Path(__file__).read_bytes()),'pngs':imgs,'evidence_inventory_sha256':sha((O/'EVIDENCE-SHA256SUMS').read_bytes()),'limitations':['Offline review; raw authenticated bodies were intentionally not persisted, so their recorded hashes and historical execution cannot independently be replayed or authenticated.','Owner comment authorization supplied by parent task; no live GitHub verification.','No credential access, network/provider calls, collector execution, inference, or evidence mutations.']}
(O/'receipt.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'verdict':result['verdict'],'checks':len(checks),'inventory_files':len(inventory),'inventory_sha256':result['evidence_inventory_sha256'],'pngs':imgs},indent=2))
