"""Independent, offline falsification of frozen S3 candidate. No inference.

Run with python3 -B. Only this directory receives written artifacts.
Reads candidate inputs through git show and verifies working copies before import.
Does not run the author's main(), which would rewrite canonical control files.
"""
import base64
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct
import subprocess
import sys
from decimal import Decimal

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
PACKET = HERE.parent.parent
REPO = PACKET.parents[3]
REL = PACKET.relative_to(REPO).as_posix()
CANDIDATE = 'ef435ace5ed7275b51027a46f09e430b7973f943'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)

def frozen(path):
    return git('show', f'{CANDIDATE}:{REL}/{path}')

def sha(b):
    return hashlib.sha256(b).hexdigest()

def emit_json(path, data):
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + '\n')

paths = git('ls-tree', '-r', '--name-only', CANDIDATE, REL).decode().splitlines()
inventory = []
for path in paths:
    b = git('show', f'{CANDIDATE}:{path}')
    assert (REPO/path).read_bytes() == b, f'Working copy diverged: {path}'
    inventory.append({'path': path, 'sha256': sha(b), 'bytes': len(b)})

bank = json.loads(frozen('QUESTION-BANK.json'))['cards']
key = json.loads(frozen('EVALUATOR-KEY.json'))['cards']
plan = json.loads(frozen('CALL-PLAN.json'))
stimuli = json.loads(frozen('stimuli/manifest.json'))
wire = json.loads(frozen('controls/wire-manifest.json'))['requests']
by_card = {s['card']: s for s in stimuli['cards']}

spec = importlib.util.spec_from_file_location('candidate_contract', PACKET/'controls/offline_contract.py')
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)

checks = []
def check(name, predicate, detail=None):
    assert predicate, name
    checks.append({'name': name, 'result': 'PASS', 'detail': detail})

def record(name, fn):
    try:
        value = fn()
        result = {'name': name, 'returned': value}
    except Exception as exc:
        result = {'name': name, 'raised': type(exc).__name__, 'message': str(exc)}
    checks.append(result)
    return result

for folder in ('provider-docs','provider-docs-opus'):
    for source in json.loads(frozen(f'evidence/{folder}/SOURCES.json')):
        b=frozen(f"evidence/{folder}/{source['file']}")
        check(folder+'/'+source['file']+' source receipt integrity',sha(b)==source['sha256'] and ('bytes' not in source or len(b)==source['bytes']))

check('Jev conditional arithmetic',Decimal(65536)*Decimal('.042')/Decimal(1000000)==Decimal('.002752512') and Decimal('.003')*16==Decimal('.048'))
check('GLiDE conditional arithmetic',Decimal(8*65536)*Decimal('.04')/Decimal(1000000)==Decimal('.02097152') and Decimal('.025')*16==Decimal('.400'))

for s in stimuli['cards']:
    for mode in ('image', 'text'):
        b = frozen(s[f'{mode}_path'])
        canonical = git('show', f"{stimuli['source_packet_commit']}:{s['canonical_'+mode]}")
        check(f"{s['card']} {mode}: hash, size, canonical source bytes", b == canonical and sha(b) == s[f'{mode}_sha256'] and len(b) == s[f'{mode}_bytes'])
    w, h = struct.unpack('>II', frozen(s['image_path'])[16:24])
    check(s['card']+' dimension envelope', 280 <= w <= 1568 and 280 <= h <= 1568 and 78400 <= w*h <= 2458624, [w,h])

# Independently calculate the wire map/order; then compare all manifest and renderer bytes.
independent_bodies = {}
for pair in plan['pairs']:
    card, condition = pair['card'], pair['condition']
    s = by_card[card]
    payload = frozen(s[pair['mode']+'_path'])
    c = list(bank).index(card)
    questions, maps = {}, {}
    for j, item in enumerate(bank[card]):
        ds = list(item['options'])
        n = len(ds)
        m = {d: 'k'+str((int(d[1:])+c+j)%n+1) for d in ds}
        order = [ds[(i+c+2*j)%n] for i in range(n)]
        if condition == 'O':
            order = order[::-1]
        questions[item['id']] = {'type':'choice', 'instructions':item[pair['instruction_variant']], 'criteria':{m[d]:item['options'][d] for d in order}}
        maps[item['id']] = m
    for provider in pair['providers_in_dispatch_order']:
        body = {'model': {'jev':'jev-1.14.0','glide':'fastino/GLiDE'}[provider], 'state':None, 'questions':questions}
        if pair['mode'] == 'text':
            body['state'] = [payload.decode()]
        elif provider == 'jev':
            ref = 's3-'+sha(payload)[:32]
            body['state'] = [ref]
            body['assets'] = {ref:{'type':'image','format':'png','data_base64':base64.b64encode(payload).decode()}}
        else:
            body['state'] = [{'type':'image_url','image_url':{'url':'data:image/png;base64,'+base64.b64encode(payload).decode()}}]
        if provider == 'glide':
            body['store'], body['thinking'] = False, False
        independent_bodies[(provider, condition, card)] = body
        actual, _, actual_maps = contract.render(pair,provider)
        mine = json.dumps(body,ensure_ascii=False,separators=(',',':')).encode()
        row = next(w for w in wire if w['pair']==pair['pair'] and w['provider']==provider)
        check(f"{pair['pair']:02d}-{provider} independent wire", mine == contract.dumps(actual) and sha(mine) == row['body_sha256'] and maps == actual_maps == row['canonical_to_wire'])

check('32 cells, 256 decisions', len(independent_bodies)==32 and sum(len(b['questions']) for b in independent_bodies.values())==256)
check('40 literal bank items, 40 evaluator records', sum(map(len,bank.values())) == sum(map(len,key.values())) == 40)
check('alternating provider first', all(pair['providers_in_dispatch_order']==(['jev','glide'] if pair['pair']%2 else ['glide','jev']) for pair in plan['pairs']))
for provider in ('jev','glide'):
    check(provider+' denominators', sum(k[0]==provider for k in independent_bodies)==16)
    for card in ('D','E'):
        u = independent_bodies[(provider,'U',card)]
        r = independent_bodies[(provider,'R',card)]
        w = independent_bodies[(provider,'W',card)]
        o = independent_bodies[(provider,'O',card)]
        check(provider+card+' R byte identity', contract.dumps(u)==contract.dumps(r))
        wc = copy.deepcopy(w)
        for q in wc['questions']:
            wc['questions'][q]['instructions']=u['questions'][q]['instructions']
        check(provider+card+' W only eight instruction strings', contract.dumps(wc)==contract.dumps(u) and all(w['questions'][q]['instructions'] != u['questions'][q]['instructions'] for q in u['questions']))
        check(provider+card+' O reverse only option positions', u == o and all(list(o['questions'][q]['criteria'])==list(u['questions'][q]['criteria'])[::-1] for q in u['questions']))

# Use independently authored distributions, not rule() or fake_response().
truth = {'q01':'d0','q02':'d0','q03':'d1','q04':'d2','q05':'d2','q06':'d2','q07':'d0','q08':'d0'}
def clean_rows():
    return {cell:{q['id']:{d:float(d==truth[q['id']]) for d in q['options']} for q in bank[cell[2]]} for cell in independent_bodies}

def shift(rows, providers, conditions, card, question, mass, target='d0'):
    for p in providers:
        for condition in conditions:
            row=rows[(p,condition,card)][question]
            start=truth[question]
            row[start]-=mass
            row[target]+=mass

record('clean rows', lambda:contract.classify(clean_rows(), technical_ok=True))
for question in ('q01','q08'):
    rows=clean_rows()
    shift(rows,('jev','glide'),('T',),'A',question,.30,'d1')
    record('F1 secondary-only '+question+' modality shift',lambda rows=rows:contract.classify(rows, technical_ok=True))
    rows=clean_rows()
    shift(rows,('jev','glide'),('W',),'D',question,.30,'d1')
    record('F1 secondary-only '+question+' wording shift',lambda rows=rows:contract.classify(rows, technical_ok=True))

for mass in (.249999,.25,.250001):
    rows=clean_rows();shift(rows,('jev','glide'),('U','T'),'A','q04',mass)
    record('support threshold '+str(mass),lambda rows=rows:contract.classify(rows, technical_ok=True))
for mass in (.199999,.20,.200001):
    rows=clean_rows();shift(rows,('jev','glide'),('T',),'A','q04',mass)
    record('TV modality threshold '+str(mass),lambda rows=rows:contract.classify(rows, technical_ok=True))
for mass in (.099999,.10,.100001):
    rows=clean_rows();shift(rows,('jev',),('R',),'D','q04',mass)
    record('repeat threshold '+str(mass),lambda rows=rows:contract.classify(rows, technical_ok=True))
for correct in (.799999,.80,.800001):
    rows=clean_rows()
    rows[('jev','U','A')]['q02']={'d0':correct,'d1':1-correct,'d2':0.}
    record('control threshold '+str(correct),lambda rows=rows:contract.classify(rows, technical_ok=True))

rows=clean_rows(); rows.pop(('jev','R','D'))
record('missing planned request',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows(); rows[('jev','U','A')].pop('q04')
record('missing inner decision',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows(); rows[('jev','T','A')].pop('q08')
record('missing secondary T decision',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows()
for row in rows.values():
    for q in row:
        row[q]={d:float(d=='d2') for d in row[q]}
record('blanket abstention',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows(); shift(rows,('jev','glide'),('U',),'A','q05',.9)
record('fabricated future promise, technically complete',lambda:contract.classify(rows, technical_ok=True))
record('fabricated promise plus technical veto',lambda:contract.classify(rows,False))

# Probe the classifier's validation precondition separately from raw-response validator.
rows=clean_rows()
for p in ('jev','glide'):
    rows[(p,'U','A')]['q04']={'d0':.3,'d1':0.,'d2':1.}
record('unvalidated probabilities sum 1.3',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows()
for p in ('jev','glide'):
    rows[(p,'U','A')]['q04']={'d0':True,'d1':False,'d2':False}
record('unvalidated boolean probabilities',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows()
for p in ('jev','glide'):
    for condition in ('U','T'):
        rows[(p,condition,'A')]['q04']={'d0':.3,'d1':-.1,'d2':.8}
record('unvalidated negative canonical probabilities',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows();shift(rows,('jev','glide'),('U','T'),'A','q04',.3)
rows[('jev','T','A')]['q08']['d0']=float('nan')
record('canonical NaN plus otherwise valid signal',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows()
for p in ('jev','glide'):
    for condition in ('U','T'):
        rows[(p,condition,'A')]['q04']={'d0':.3,'d1':.7}
record('canonical missing option plus signal',lambda:contract.classify(rows, technical_ok=True))
rows=clean_rows();shift(rows,('jev','glide'),('U','T'),'A','q04',.3)
rows[('jev','T','A')]['q09']={'d0':1.}
record('canonical extra item plus signal',lambda:contract.classify(rows, technical_ok=True))

def response(provider='jev'):
    body=independent_bodies[(provider,'U','A')]
    answers={}
    for item in bank['A']:
        q=item['id']
        prob={k:float(desc==item['options'][truth[q]]) for k,desc in body['questions'][q]['criteria'].items()}
        answers[q]={'type':'choice','choice':max(prob,key=prob.get),'probabilities':prob}
    result={'model':'jev-1.14.0' if provider=='jev' else 'glide','answers':answers,'usage':{'input_tokens':100,'output_tokens':10}}
    if provider=='glide': result['token_usage']=110
    return result,body

r,b=response()
record('valid independent raw response',lambda:contract.validate_answer(r,b,'jev'))
mutations={
    'missing raw question': lambda v:v['answers'].pop('q04'),
    'missing raw option': lambda v:v['answers']['q04']['probabilities'].pop('k1'),
    'raw NaN': lambda v:v['answers']['q04']['probabilities'].update(k1=float('nan')),
    'raw Infinity': lambda v:v['answers']['q04']['probabilities'].update(k1=float('inf')),
    'raw boolean': lambda v:v['answers']['q04']['probabilities'].update(k1=True),
    'raw numeric string': lambda v:v['answers']['q04']['probabilities'].update(k1='0'),
    'raw negative': lambda v:v['answers']['q04']['probabilities'].update(k1=-.2),
    'raw wrong choice': lambda v:v['answers']['q04'].update(choice='invented'),
    'missing usage': lambda v:v.pop('usage'),
    'unknown model': lambda v:v.update(model='unknown'),
    'usage boolean': lambda v:v['usage'].update(input_tokens=True),
    'usage negative': lambda v:v['usage'].update(output_tokens=-1),
    'usage string': lambda v:v['usage'].update(input_tokens='100'),
}
for name,mutate in mutations.items():
    v=copy.deepcopy(r);mutate(v)
    record(name,lambda v=v:contract.validate_answer(v,b,'jev'))
for provider in ('jev','glide'):
    v,body=response(provider)
    first=next(iter(body['questions']['q04']['criteria']))
    v['answers']['q04'].update(choice=first,probabilities={k:1/3 for k in body['questions']['q04']['criteria']})
    record('valid tie '+provider,lambda v=v,body=body,provider=provider:contract.validate_answer(v,body,provider,{'X-Fastino-Data-Retention':'zero','X-Fastino-Served-Model':'FAKE'},('FAKE',)))
v,body=response('glide')
for name,headers,allowlist in [
    ('missing retention',{'X-Fastino-Served-Model':'FAKE'},('FAKE',)),
    ('stored retention',{'X-Fastino-Served-Model':'FAKE','X-Fastino-Data-Retention':'stored'},('FAKE',)),
    ('unallowlisted identity',{'X-Fastino-Served-Model':'NEW','X-Fastino-Data-Retention':'zero'},('FAKE',))]:
    record(name,lambda headers=headers,allowlist=allowlist:contract.validate_answer(v,body,'glide',headers,allowlist))
v['token_usage']=111
record('inconsistent token total',lambda:contract.validate_answer(v,body,'glide',{'X-Fastino-Data-Retention':'zero','X-Fastino-Served-Model':'FAKE'},('FAKE',)))

# Receipts describe the requested selected model; no API identity inference is made.
emit_json(HERE/'receipt.json', {'selected_model':'gpt-6.1-sol','model_identity_evidence':'parent task routing designation; no independent backend attestation available','task_id':'/root/sol_s3_falsification','candidate_commit':CANDIDATE,'provider_inference_calls':0,'network_requests':0,'credentials_accessed':False,'author_main_executed':False,'scope':'offline protocol falsification only','candidate_files':inventory})
emit_json(HERE/'independent-results.json',{'candidate_commit':CANDIDATE,'checks':checks,'new_dispatcher_tested':False})
print(json.dumps({'recorded_checks':len(checks),'candidate_files':len(inventory),'provider_calls':0,'output_directory':str(HERE)}))
