import json,socket,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,'/Users/parth/Projects/chatsense-s3-counted-transport')
tempfile.tempdir=str(Path(__file__).resolve().parent)
socket.socket=lambda *a,**kw: (_ for _ in ()).throw(AssertionError('sockets disabled'))
from s3_a3 import dispatcher as d
from s3_transport import postrun
from s3_a3.tests.fakes import valid_response
suite=unittest.TestSuite(unittest.defaultTestLoader.loadTestsFromName(name) for name in ('s3_transport.test_model_compatibility','s3_transport.test_postrun_compatibility'))
result=unittest.TextTestRunner(verbosity=2).run(suite)
assert result.wasSuccessful()
assert d.GLIDE_BODY_MODELS==('glide','glide_v2')
row=d.load_frozen()['rows'][1]
request=d.build_requests(d.load_frozen())[1]
canonical='fastino/GLiDE'
checks=0
for model in ('glide','glide_v2','glide_v3',None,{},'glide_v2 '):
    obj,headers=valid_response(row['id'],request['body']);obj['model']=model
    headers=[(k,canonical if k.lower()=='x-fastino-served-model' else v) for k,v in headers]
    try:d._check_response((200,headers,json.dumps(obj).encode()),row,(canonical,),None,{})
    except d.Invalid as exc:assert model not in ('glide','glide_v2') and exc.code=='MODEL_MISMATCH'
    else:assert model in ('glide','glide_v2')
    checks+=1
# Isolate postrun selection: rejected entries must never trigger receipt reads or validation.
rejected=[{'type':'RESULT','outcome':outcome,'id':'rejected','receipt':'DO_NOT_READ'} for outcome in ('MODEL_MISMATCH','BODY_MODEL_CHANGED','ANSWERS_INVALID')]
with patch.object(d,'load_frozen',return_value={'rows':[row]}),patch.object(d,'inspect',return_value={'errors':[],'complete':True}),patch.object(d,'paths',return_value={'ledger':'ledger','receipts':Path('/unused')}),patch.object(d,'_read',return_value=b'\n'.join(json.dumps(x).encode() for x in rejected)) as read,patch.object(d,'_check_response',side_effect=AssertionError('rejected entry revalidated')):
    assert postrun.validate_recorded_responses('/synthetic')=={}
    assert read.call_count==1
checks+=1
for audit in ({'errors':['broken'],'complete':True},{'errors':[],'complete':False}):
    with patch.object(d,'inspect',return_value=audit):
        try:postrun.validate_recorded_responses('/synthetic')
        except d.Invalid as exc:assert exc.code=='POSTRUN_LEDGER_INVALID'
        else:raise AssertionError('bad/incomplete audit accepted')
    checks+=1
print('PASS: 11 focused tests plus',checks,'independent checks; sockets disabled')
