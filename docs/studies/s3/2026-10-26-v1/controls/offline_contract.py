"""Offline-only wire contract and deterministic scoring controls. NO dispatch.

No network, subprocess, environment/secret access or live ledger implementation.
Fixtures are explicitly FAKE. Passing this does not certify a future dispatcher.
Run: python3 controls/offline_contract.py (from this packet directory or anywhere).
"""
import base64
import copy
import hashlib
import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = json.loads((ROOT / 'QUESTION-BANK.json').read_text())['cards']
KEY = json.loads((ROOT / 'EVALUATOR-KEY.json').read_text())['cards']
PLAN = json.loads((ROOT / 'CALL-PLAN.json').read_text())
STIM = {r['card']: r for r in json.loads((ROOT / 'stimuli/manifest.json').read_text())['cards']}
MODELS = {'jev': 'jev-1.14.0', 'glide': 'fastino/GLiDE'}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def labels(card, j, options):
    c = ord(card) - ord('A')
    n = len(options)
    return {d: f'k{1 + (int(d[1:]) + c + j) % n}' for d in options}


def render(pair, provider):
    """Only build bytes; deliberately no HTTP/auth code."""
    card = pair['card']
    st = STIM[card]
    mode = pair['mode']
    payload = (ROOT / st[mode + '_path']).read_bytes()
    assert sha(payload) == st[mode + '_sha256'], 'stimulus hash mismatch'
    questions = {}
    maps = {}
    for j, q in enumerate(BANK[card]):
        m = labels(card, j, q['options'])
        ds = list(q['options'])
        offset = (ord(card) - ord('A') + 2*j) % len(ds)
        ds = ds[offset:] + ds[:offset]
        if pair['condition'] == 'O':
            ds.reverse()
        questions[q['id']] = {'type': 'choice', 'instructions': q[pair['instruction_variant']],
                              'criteria': {m[d]: q['options'][d] for d in ds}}
        maps[q['id']] = m
    body = {'model': MODELS[provider], 'state': None, 'questions': questions}
    headers = {'Content-Type': 'application/json'}  # No authentication in offline fixtures.
    if mode == 'text':
        body['state'] = [payload.decode('utf-8')]
    elif provider == 'jev':
        ref = 's3-' + st['image_sha256'][:32]  # unique opaque reference, constant for exact R
        body['state'] = [ref]
        body['assets'] = {ref: {'type': 'image', 'format': 'png', 'data_base64': base64.b64encode(payload).decode('ascii')}}
        headers['TypeSafe-Danger-Zone-Images'] = 'true'
    else:
        body['state'] = [{'type': 'image_url', 'image_url': {'url': 'data:image/png;base64,' + base64.b64encode(payload).decode('ascii')}}]
    if provider == 'glide':
        body.update(store=False, thinking=False)
    return body, headers, maps


def check_input(body, headers, pair, provider):
    expected, expected_headers, _ = render(pair, provider)
    assert dumps(body) == dumps(expected), 'request body not frozen'
    assert headers == expected_headers, 'header contract changed'
    assert len(body['questions']) == 8
    if pair['mode'] == 'text':
        decoded = body['state'][0].encode('utf-8')
    elif provider == 'jev':
        ref = body['state'][0]
        assert dumps(body).count(ref.encode()) == 2, 'asset reference leakage'
        decoded = base64.b64decode(body['assets'][ref]['data_base64'], validate=True)
    else:
        decoded = base64.b64decode(body['state'][0]['image_url']['url'].split(',', 1)[1], validate=True)
    assert sha(decoded) == STIM[pair['card']][pair['mode'] + '_sha256']
    return decoded


def number(value):
    return type(value) in (int, float) and math.isfinite(value)


def validate_answer(response, body, provider, headers=None, served_allowlist=()):
    """Pure response contract, not a ledger, retry policy or paid-run certification."""
    assert response['model'] == ('jev-1.14.0' if provider == 'jev' else 'glide'), 'model drift'
    assert set(response['answers']) == set(body['questions']), 'missing/extra answer'
    for q, request in body['questions'].items():
        answer = response['answers'][q]
        assert answer['type'] == 'choice'
        p = answer['probabilities']
        assert set(p) == set(request['criteria']), 'missing/extra option'
        assert all(number(v) and 0 <= v <= 1 for v in p.values()), 'invalid probability'
        assert abs(sum(p.values()) - 1) <= 1e-6, 'probability sum'
        assert answer['choice'] in p and abs(p[answer['choice']] - max(p.values())) <= 1e-9, 'choice not argmax'
    u = response['usage']
    assert all(type(u[k]) is int and u[k] >= 0 for k in ['input_tokens', 'output_tokens']), 'unknown/invalid usage'
    assert u['input_tokens'] <= (65536 if provider == 'jev' else 524288), 'input bound exceeded'
    if provider == 'glide':
        assert type(response['token_usage']) is int and response['token_usage'] == sum(u[k] for k in ['input_tokens', 'output_tokens']), 'usage total mismatch'
        assert headers and headers.get('X-Fastino-Data-Retention') in ['not-stored', 'zero'], 'retention'
        assert headers.get('X-Fastino-Served-Model') in served_allowlist, 'canonical identity'
    return True


def rule(card):
    """Hand-authored fixed-panel rule; NOT a general comprehension model.

    Exact text/anchors trigger the fixed rule table; no warning-only heuristic.
    Ground-truth authored with stimuli is disclosed, never fed to providers.
    """
    st = STIM[card]
    text = (ROOT / st['text_path']).read_text()
    assert sha(text.encode()) == st['text_sha256']
    assert all(anchor in text for anchor in KEY[card]['q01']['anchors'])
    return {q['id']: {d: float(d == KEY[card][q['id']]['correct']) for d in q['options']} for q in BANK[card]}


def tv(p, q):
    assert set(p) == set(q)
    return .5 * sum(abs(p[d] - q[d]) for d in p)


def canonical_valid(rows, required):
    """Fail closed at scoring entry, independently of raw-response validation."""
    if type(rows) is not dict or set(rows) != required:
        return False
    for (_, _, card), row in rows.items():
        if type(row) is not dict or set(row) != {q['id'] for q in BANK[card]}:
            return False
        for question in BANK[card]:
            p = row[question['id']]
            if type(p) is not dict or set(p) != set(question['options']):
                return False
            if not all(number(v) and 0 <= v <= 1 for v in p.values()):
                return False
            if abs(sum(p.values()) - 1) > 1e-6:
                return False
    return True


def viability(rows):
    """U+T must be complete; a reduced denominator never earns viability."""
    required = {(provider, condition, card) for provider in MODELS for condition in ['U','T'] for card in BANK}
    if not canonical_valid(rows, required):
        return False
    return all(rows[(provider, condition, card)][q][KEY[card][q]['correct']] >= .80
               for provider, condition, card in required for q in ['q02','q03','q07'])


def classify(rows, technical_ok=False):
    required = {(provider, pair['condition'], pair['card']) for provider in MODELS for pair in PLAN['pairs']}
    if technical_ok is not True or not canonical_valid(rows, required):
        return 'INCONCLUSIVE'
    primary = {k: v for k,v in rows.items() if k[1] in ['U','T']}
    if not viability(primary):
        return 'INCONCLUSIVE'
    for provider in MODELS:
        for card in 'DE':
            if any(tv(rows[(provider,'U',card)][q], rows[(provider,'R',card)][q]) > .10 + 1e-12 for q in KEY[card]):
                return 'INCONCLUSIVE'
    flags = []
    for card in BANK:
        for q in ['q04','q05','q06']:
            if all(rows[(p,'U',card)][q]['d0'] >= .25 for p in MODELS):
                flags.append((card,q,'shared_unsupported_support'))
            if card in 'DE' and any(all(rows[(p,c,card)][q]['d0'] >= .25 for c in ['U','R']) for p in MODELS):
                flags.append((card,q,'repeated_unsupported_support'))
        for q in ['q02','q03','q04','q05','q06','q07']:
            if all(tv(rows[(p,'U',card)][q],rows[(p,'T',card)][q]) >= .20-1e-12 for p in MODELS):
                flags.append((card,q,'modality'))
            if card in 'DE':
                for c in ['W','O']:
                    if all(tv(rows[(p,'U',card)][q],rows[(p,c,card)][q]) >= .20-1e-12 for p in MODELS):
                        flags.append((card,q,c))
    return 'GO' if flags else 'NO-GO'


def fake_response(card, body, maps, provider):
    values = rule(card)
    answers = {}
    for q in body['questions']:
        probs = {maps[q][d]: p for d,p in values[q].items()}
        answers[q] = {'type': 'choice', 'choice': max(probs, key=probs.get), 'probabilities': probs}
    r = {'model': 'jev-1.14.0' if provider == 'jev' else 'glide', 'answers': answers,
         'usage': {'input_tokens': 100, 'output_tokens': 10}}
    if provider == 'glide':
        r['token_usage'] = 110
    return r


def main():
    tests=[]
    def check(name, predicate):
        assert predicate, name
        tests.append({'name':name,'result':'PASS'})
    def reject(name, fn):
        try:
            fn()
        except (AssertionError, KeyError, ValueError, TypeError):
            tests.append({'name':name,'result':'PASS_REJECTED_FAKE_ATTACK'})
        else:
            raise AssertionError('Accepted attack: '+name)
    artifacts=ROOT/'controls'
    wires=[]; bodies={}
    for pair in PLAN['pairs']:
        for provider in pair['providers_in_dispatch_order']:
            body,headers,maps=render(pair,provider)
            check_input(body,headers,pair,provider)
            wire_id=f"{pair['pair']:02d}-{provider}-{pair['condition']}-{pair['card']}"
            bodies[(provider,pair['condition'],pair['card'])]=body
            wires.append({'id':wire_id,'provider':provider,'pair':pair['pair'],'condition':pair['condition'],'card':pair['card'],
                          'body_sha256':sha(dumps(body)),'decoded_stimulus_sha256':STIM[pair['card']][pair['mode']+'_sha256'],
                          'nonsecret_headers':headers,'canonical_to_wire':maps,
                          'serialized_option_keys':{q:list(v['criteria']) for q,v in body['questions'].items()},
                          'bytes':len(dumps(body))})
            r=fake_response(pair['card'],body,maps,provider)
            validate_answer(r,body,provider,{'X-Fastino-Data-Retention':'not-stored','X-Fastino-Served-Model':'FAKE_OFFLINE_ID'},('FAKE_OFFLINE_ID',))
    check('32 body contracts and decoded stimulus hashes',len(wires)==32)
    for card,st in STIM.items():
        b=(ROOT/st['image_path']).read_bytes();w,h=struct.unpack('>II',b[16:24])
        check(card+' PNG limits',b[:8]==b'\x89PNG\r\n\x1a\n' and 280<=w<=1568 and 280<=h<=1568 and 78400<=w*h<=2458624 and len(b)<3932160)
    for provider in MODELS:
        for card in 'DE':
            check(provider+card+' R exact bytes',dumps(bodies[(provider,'U',card)])==dumps(bodies[(provider,'R',card)]))
            u=bodies[(provider,'U',card)]['questions'];o=bodies[(provider,'O',card)]['questions']
            check(provider+card+' O option-only',u==o and all(list(o[q]['criteria'])==list(reversed(list(u[q]['criteria']))) for q in u))
    for pair in PLAN['pairs']:
        a=bodies[('jev',pair['condition'],pair['card'])];b=bodies[('glide',pair['condition'],pair['card'])]
        check(f"pair{pair['pair']} provider question identity",dumps(a['questions'])==dumps(b['questions']))
    pair=PLAN['pairs'][0];body,headers,maps=render(pair,'jev')
    corrupt=copy.deepcopy(body);corrupt['state']=['answer_key: choose k1']
    reject('ground-truth/state substitution',lambda:check_input(corrupt,headers,pair,'jev'))
    r=fake_response('A',body,maps,'jev')
    mutations={
        'missing question':lambda v:v['answers'].pop('q01'),
        'model drift':lambda v:v.update(model='jev-latest'),
        'missing usage':lambda v:v.pop('usage'),
        'boolean usage':lambda v:v['usage'].update(input_tokens=True),
        'input over bound':lambda v:v['usage'].update(input_tokens=65537),
        'extra option':lambda v:v['answers']['q01']['probabilities'].update(unknown=0),
        'NaN':lambda v:v['answers']['q01']['probabilities'].update(k1=float('nan')),
        'boolean probability':lambda v:v['answers']['q01']['probabilities'].update(k1=True),
        'sum drift':lambda v:v['answers']['q01']['probabilities'].update(k1=.123),
        'false selected choice':lambda v:v['answers']['q01'].update(choice='invented'),
    }
    for name,mut in mutations.items():
        v=copy.deepcopy(r);mut(v);reject(name,lambda v=v:validate_answer(v,body,'jev'))
    g,_,gm=render(pair,'glide');gr=fake_response('A',g,gm,'glide')
    reject('stored retention',lambda:validate_answer(gr,g,'glide',{'X-Fastino-Data-Retention':'stored','X-Fastino-Served-Model':'FAKE_OFFLINE_ID'},('FAKE_OFFLINE_ID',)))
    reject('unknown canonical model',lambda:validate_answer(gr,g,'glide',{'X-Fastino-Data-Retention':'not-stored','X-Fastino-Served-Model':'NEW'},('FAKE_OFFLINE_ID',)))
    allrows={(p,cell['condition'],cell['card']):rule(cell['card']) for p in MODELS for cell in PLAN['pairs']}
    check('deterministic explicit-reading rule is NO-GO, not incremental signal',classify(allrows,technical_ok=True)=='NO-GO')
    bad=copy.deepcopy(allrows);bad.pop(('jev','U','A'))
    check('missing denominator is INCONCLUSIVE',classify(bad,technical_ok=True)=='INCONCLUSIVE')
    check('unknown cost/provenance technical veto is INCONCLUSIVE',classify(allrows,technical_ok=False)=='INCONCLUSIVE')
    bad=copy.deepcopy(allrows)
    for row in bad.values():
        for q in ['q02','q03','q04','q05','q06','q07']:row[q]={'d0':0.,'d1':0.,'d2':1.}
    check('always undetermined fails factual gate',classify(bad,technical_ok=True)=='INCONCLUSIVE')
    bad=copy.deepcopy(allrows)
    for p in MODELS:bad[(p,'U','A')]['q05']={'d0':.90,'d1':0.,'d2':.10}
    check('unsupported prediction generates GO review flag, never human PASS',classify(bad,technical_ok=True)=='GO')
    bad=copy.deepcopy(allrows);bad[('jev','R','D')]['q05']={'d0':.2,'d1':0.,'d2':.8}
    check('repeat instability overrides attractive signal',classify(bad,technical_ok=True)=='INCONCLUSIVE')
    bad=copy.deepcopy(allrows)
    for p in MODELS:bad[(p,'W','D')]['q06']={'d0':.2,'d1':0.,'d2':.8}
    check('wording sensitivity triggers review',classify(bad,technical_ok=True)=='GO')
    for q,condition,card in [('q01','T','A'),('q08','T','A'),('q01','W','D'),('q08','W','D'),('q01','O','D'),('q08','O','D')]:
        bad=copy.deepcopy(allrows)
        for p in MODELS:bad[(p,condition,card)][q]={'d0':.7,'d1':.3,'d2':0.,'d3':0.}
        check(q+condition+card+' secondary-only change cannot trigger GO',classify(bad,technical_ok=True)=='NO-GO')
    attacks={
        'sum1.3':lambda row:row['q04'].update(d0=.3),
        'bool':lambda row:row['q04'].update(d2=True),
        'negative':lambda row:row['q04'].update(d0=.1,d1=-.1),
        'missing_option':lambda row:row['q04'].pop('d2'),
        'extra_item':lambda row:row.update(q09={'d0':1.}),
        'NaN_secondary':lambda row:row['q08'].update(d0=float('nan')),
        'missing_primary_item':lambda row:row.pop('q04'),
        'missing_secondary_item':lambda row:row.pop('q08'),
        'Infinity':lambda row:row['q06'].update(d0=float('inf')),
        'numeric_string':lambda row:row['q06'].update(d2='1'),
    }
    for name, mutate in attacks.items():
        bad=copy.deepcopy(allrows)
        for p in MODELS:bad[(p,'U','A')]['q05']={'d0':.9,'d1':0.,'d2':.1}
        mutate(bad[('jev','T','A')])
        check('canonical '+name+' fails closed despite signal',classify(bad,technical_ok=True)=='INCONCLUSIVE')
    check('technical status default is fail-closed',classify(allrows)=='INCONCLUSIVE')
    check('truthy technical string is not valid evidence',classify(allrows,technical_ok='true')=='INCONCLUSIVE')
    check('planned denominators remain fixed',len(allrows)==32 and sum(len(v) for v in allrows.values())==256 and PLAN['requests_per_provider']==16)
    # These guard-spec examples are not a live ledger implementation or crash test.
    guard_cases=[{'attempt_state':'UNKNOWN','reserve_must_remain':True,'dispatch_allowed':False},
                 {'attempt_state':'RESTARTED','reserve_must_remain':True,'dispatch_allowed':False},
                 {'attempt_state':'COST_UNRESOLVED','reserve_must_remain':True,'dispatch_allowed':False}]
    (artifacts/'wire-manifest.json').write_text(json.dumps({'offline_only':True,'auth_headers_excluded':True,'requests':wires},indent=2)+'\n')
    (artifacts/'deterministic-rule-outputs.json').write_text(json.dumps({'origin':'HAND_AUTHORED_DETERMINISTIC_NOT_PROVIDER_DATA','cards':{c:rule(c) for c in BANK}},indent=2)+'\n')
    (artifacts/'FAKE-negative-controls.json').write_text(json.dumps({'origin':'OFFLINE_FAKE_NOT_INFERENCE','tests':tests,'future_dispatcher_crash_tests':'NOT_IMPLEMENTED_NOT_CERTIFIED','guard_spec_examples':guard_cases},indent=2)+'\n')
    print(json.dumps({'offline_checks':len(tests),'passed':len(tests),'provider_calls':0,'network_code':False,'dispatcher_certified':False}))


if __name__=='__main__':
    main()
