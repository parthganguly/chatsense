import copy,json,socket,sys,tempfile
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'/Users/parth/Projects/chatsense-s3-counted-transport')
from s3_a3 import dispatcher as d
from s3_a3.tests.fakes import FakeProvider
ROOT=Path(__file__).resolve().parent
tempfile.tempdir=str(ROOT)
socket.socket=lambda *a,**k: (_ for _ in ()).throw(AssertionError('network forbidden'))
row=d.load_frozen()['rows'][1]
canonical='fastino/GLiDE'
base={'model':'glide','answers':{},'usage':{'input_tokens':7,'output_tokens':3},'token_usage':10}
for q, keys in row['serialized_option_keys'].items():
    base['answers'][q]={'type':'choice','choice':keys[0], 'probabilities':{k:float(i==0) for i,k in enumerate(keys)}}
headers=[('Content-Type','application/json'),('X-Fastino-Served-Model',canonical),('X-Fastino-Data-Retention','not-stored')]
count=0
def check(obj, hs=headers, previous=None, served=None, expected=None):
    global count
    info={}
    try: d._check_response((200,hs,json.dumps(obj).encode()),row,(canonical,),served,info,previous)
    except d.Invalid as exc: assert exc.code==expected,(exc.code,expected)
    else: assert expected is None,expected
    assert 'PRIVATE_SENTINEL' not in json.dumps(info)
    count+=1
    return info
assert d.GLIDE_BODY_MODELS==('glide',)
check(base)
x=copy.deepcopy(base); x['model']='glide_v2';check(x,expected='MODEL_MISMATCH')
with patch.object(d,'GLIDE_BODY_MODELS',('glide','glide_v2')):
    for label in ('glide','glide_v2'):
        obj=copy.deepcopy(base);obj['model']=label
        assert check(obj)['body_model_class']==label
        check(obj,previous=label)
        check(obj,previous=('glide_v2' if label=='glide' else 'glide'),expected='BODY_MODEL_CHANGED')
        check(obj,served='different',expected='CANONICAL_IDENTITY')
        for ret in ('zero','not-stored'):
            check(obj,hs=headers[:2]+[('X-Fastino-Data-Retention',ret)])
    for label in (None,True,False,1,0,1.5,[],{},['glide'],'fastino/GLiDE','glide-v1.2','GLiDE','glide_v2\n','glide_v2 ','PRIVATE_SENTINEL'):
        obj=copy.deepcopy(base);obj['model']=label
        assert check(obj,expected='MODEL_MISMATCH')['body_model_class']=='other_or_missing'
    obj=copy.deepcopy(base);del obj['model'];check(obj,expected='MODEL_MISMATCH')
    for hs,code in [(headers+[('x-fastino-served-model',canonical)],'HEADER_INVALID'),(headers[:1]+[('X-Fastino-Served-Model','PRIVATE_SENTINEL')]+headers[2:],'CANONICAL_IDENTITY'),(headers[:2],'RETENTION'),(headers[:2]+[('X-Fastino-Data-Retention','stored')],'RETENTION')]:check(base,hs=hs,expected=code)
    for field,value,code in [('answers',{},'ANSWERS_INVALID'),('usage',None,'USAGE_INVALID'),('token_usage',None,'USAGE_INVALID'),('token_usage',True,'USAGE_INVALID'),('token_usage',11,'USAGE_INVALID')]:
        obj=copy.deepcopy(base);obj[field]=value;check(obj,expected=code)
    for first,second in [('glide','glide_v2'),('glide_v2','glide')]:
        with tempfile.TemporaryDirectory() as tmp:
            state=Path(tmp)/'state'
            def mutate(i,obj,hs):
                if obj['model']=='glide':
                    obj['model']=first if i==1 else second
                    hs[:]=[(k,canonical if k.lower()=='x-fastino-served-model' else v) for k,v in hs]
            result=d.run(state,FakeProvider(state,mutate=mutate),served_allowlist=(canonical,))
            assert result['failure']=='BODY_MODEL_CHANGED' and result['handoffs']==3,result
            assert d.inspect(state)['errors']==[]
            count+=1
print('PASS:',count,'independent checks; sockets forbidden; both drift directions stop at third handoff')
