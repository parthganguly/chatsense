import os, sys, ssl, socket, unittest, unittest.mock, tempfile, subprocess, types, json, copy, itertools
from pathlib import Path
ROOT=Path('/Users/parth/Projects/chatsense-s3-counted-transport')
OUT=Path('/Users/parth/Projects/chatsense-s3-transport-coordination/usage-compat-20261107/sol')
os.environ['TMPDIR']=str(OUT/'tmp'); tempfile.tempdir=str(OUT/'tmp')
sys.path.insert(0,str(ROOT)); os.chdir(ROOT)
from s3_a3 import dispatcher as d
from s3_transport.test_usage_compatibility import UsageCompatibility
old_src=subprocess.check_output(['git','show','c9fe8cc56c653bde4d7563cb7b7d329afc9ff6a9:s3_a3/dispatcher.py'],text=True)
old=types.ModuleType('old_dispatcher'); old.__file__=d.__file__; exec(compile(old_src,'old_dispatcher.py','exec'),old.__dict__)
def denied(*a,**kw): raise AssertionError('NETWORK DISABLED')
socket.socket=denied; socket.create_connection=denied; socket.getaddrinfo=denied
suite=unittest.defaultTestLoader.loadTestsFromNames(['s3_transport.test_usage_compatibility','s3_transport.test_model_compatibility','s3_transport.test_postrun_compatibility'])
result=unittest.TextTestRunner(verbosity=2).run(suite)
assert result.wasSuccessful()
UsageCompatibility.setUpClass(); fixture=UsageCompatibility()
obj,headers,row=fixture.response()
def outcome(mod,obj,row=row):
    info={}
    try: mod._check_response((200,headers,json.dumps(obj).encode()),row,('fastino/GLiDE',),None,info); return 'VALID',info
    except mod.Invalid as e: return e.code,info
values=[None,True,False,0.0,1.0,'PRIVATE_INDEPENDENT_CANARY',[],{},-1,0,1,137,d.INPUT_BOUND['glide'],d.INPUT_BOUND['glide']+1,d.USAGE_MAX,d.USAGE_MAX+1]
comparisons=0
for a,b,c in itertools.product(values,repeat=3):
    sample=copy.deepcopy(obj); sample['usage']={'input_tokens':a,'output_tokens':b}; sample['token_usage']=c
    before=outcome(old,sample)[0]; after=outcome(d,sample)[0]
    assert before==after,(a,b,c,before,after)
    comparisons+=1
for field in ['usage','input_tokens','output_tokens','token_usage']:
    sample=copy.deepcopy(obj)
    del (sample if field in ('usage','token_usage') else sample['usage'])[field]
    assert outcome(old,sample)[0]==outcome(d,sample)[0]
    comparisons+=1
with unittest.mock.patch.object(d,'GLIDE_INDEPENDENT_TOKEN_USAGE',True):
    status,info=outcome(d,obj); assert status=='VALID' and info['provisional_input_nano_usd']==5480
    proposal_cases=0
    for field in ['input_tokens','output_tokens','token_usage']:
        for val in values:
            sample=copy.deepcopy(obj); target=sample if field=='token_usage' else sample['usage']; target[field]=val
            status,info=outcome(d,sample)
            maximum=d.INPUT_BOUND['glide'] if field=='input_tokens' else d.USAGE_MAX
            expected=type(val) is int and 0<=val<=maximum
            assert (status=='VALID')==expected,(field,val,status)
            if not expected:
                assert 'PRIVATE_INDEPENDENT_CANARY' not in json.dumps(info)
                assert all(k not in info for k in ['usage','token_usage','provisional_input_nano_usd'])
            proposal_cases+=1
    # Durable diagnostics and rejection permanence, using only generated fake states.
    for field in ['input_tokens','output_tokens','token_usage']:
        def mutate(i,body,hs):
            if body['model']=='glide':
                hs[:]=[(k,'fastino/GLiDE' if k.lower()=='x-fastino-served-model' else v) for k,v in hs]
                (body if field=='token_usage' else body['usage'])[field]='PRIVATE_INDEPENDENT_CANARY'
        from s3_a3.tests.fakes import FakeProvider
        from s3_transport.postrun import validate_recorded_responses
        with tempfile.TemporaryDirectory() as tmp:
            state=Path(tmp)/'state'; run=d.run(state,FakeProvider(state,mutate=mutate),served_allowlist=('fastino/GLiDE',))
            assert run['failure']=='USAGE_INVALID'
            files={str(p.relative_to(state)):p.read_bytes() for p in state.rglob('*') if p.is_file()}
            assert all(b'PRIVATE_INDEPENDENT_CANARY' not in raw for raw in files.values())
            accepted=validate_recorded_responses(state); assert len(accepted)==1
            assert files=={str(p.relative_to(state)):p.read_bytes() for p in state.rglob('*') if p.is_file()}
            proposal_cases+=1
print(json.dumps({'reviewed_head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'suite_tests':result.testsRun,'default_old_new_comparisons':comparisons,'additional_proposal_challenges':proposal_cases,'historical_triple_cost_nano_usd':5480,'network':'socket construction, connection and DNS denied','result':'PASS'},indent=2))
