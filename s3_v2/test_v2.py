"""Synthetic fake-provider acceptance only. No credentials or real inference."""
import json, tempfile, unittest, os, subprocess, sys
from pathlib import Path
from unittest.mock import patch
from .runtime import engine,run,PACKET
from .report import report

class Fake:
 def __init__(self,mutate=None):self.sent=0;self.pair_reconciled=False;self.mutate=mutate
 def __call__(self,url,headers,body,timeout):
  if self.sent>=3 and not self.pair_reconciled:raise RuntimeError('INTERLOCK')
  i=self.sent;self.sent+=1;req=json.loads(body)
  answers={q:{'type':'choice','choice':next(iter(v['criteria'])),'probabilities':{k:float(k==next(iter(v['criteria']))) for k in v['criteria']}} for q,v in req['questions'].items()}
  obj={'model':'glide_v2' if req['model']=='fastino/GLiDE' else req['model'],'usage':{'input_tokens':137,'output_tokens':0},'answers':answers}
  hs=[('Content-Type','application/json')]
  if obj['model']=='glide_v2':obj['token_usage']=216;hs += [('X-Fastino-Served-Model','fastino/GLiDE'),('X-Fastino-Data-Retention','not-stored')]
  if self.mutate:self.mutate(i,obj,hs)
  return 200,hs,json.dumps(obj).encode()
def unverified(rows):return {r['id']:{'state':'unverified'} for r in rows}

class V2(unittest.TestCase):
 def test_manifest_bridge_keys_stimuli_and_repeats(self):
  d=engine();f=d.load_frozen();reqs=d.build_requests(f);d.verify_requests(reqs,f)
  self.assertEqual([r['provider'] for r in reqs[:4]],['jev','jev','glide','glide'])
  from s3_a3 import dispatcher as old
  v1=old.load_frozen()
  for c in 'ABCDE':
   for mode in ('text','image'):self.assertEqual(f['files'][f['stim'][c][mode+'_path']],v1['files'][v1['stim'][c][mode+'_path']])
  for q in (1,2,6):self.assertEqual(f['bank']['A'][q],v1['bank']['A'][q])
  expected={'A':['d0','d0','d1','d2','d2','d2','d0','d0'],'D':['d0','d0','d0','d2','d2','d2','d0','d2'],'E':['d0','d0','d0','d0','d2','d2','d0','d2']}
  for c,refs in expected.items():self.assertEqual([f['key'][c][q]['correct'] for q in d.QUESTION_IDS],refs)
  for row,r in zip(f['rows'],reqs):
   self.assertEqual(r['body'],f['files'][row['body_path']]);body=json.loads(r['body'])
   for q in f['bank'][row['card']]:
    for opt,txt in q['options'].items():self.assertEqual(body['questions'][q['id']]['criteria'][row['canonical_to_wire'][q['id']][opt]],txt)
 def test_scientific_errors_complete_and_no_mutating_report(self):
  with tempfile.TemporaryDirectory() as tmp:
   fake=Fake();checks=[]
   def reader(rows):checks.append(fake.sent);self.assertEqual([r['id'].split('-')[1] for r in rows],['jev','jev','glide']);return unverified(rows)
   result=run(tmp,fake,reader);self.assertEqual(result['handoffs'],16);self.assertEqual(checks,[3])
   before={str(p):p.read_bytes() for p in Path(tmp).rglob('*') if p.is_file()};r=report(tmp)
   self.assertTrue(r['technical_complete']);self.assertEqual((r['modality_available'],r['repeat_available']),(8,4));self.assertEqual(r['reserved_micro_usd']['total'],224000)
   self.assertTrue(any(item['reference_probability']==0 for cell in r['cells'] for item in cell['items'].values()))
   self.assertEqual(before,{str(p):p.read_bytes() for p in Path(tmp).rglob('*') if p.is_file()})
   with self.assertRaises(Exception):run(tmp,Fake(),unverified)
 def test_technical_failure_retains_prefix(self):
  for kind in ('model','retention','usage','answer','probability','transport'):
   with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
    def mutate(i,obj,hs):
     if i!=2:return
     if kind=='model':obj['model']='wrong'
     if kind=='retention':hs[:]=[(k,v) for k,v in hs if 'Retention' not in k]
     if kind=='usage':obj['token_usage']=True
     if kind=='answer':del obj['answers']['q08']
     if kind=='probability':obj['answers']['q01']['probabilities']['k1']=-1
     if kind=='transport':raise TimeoutError()
    fake=Fake(mutate);result=run(tmp,fake,unverified);self.assertEqual(fake.sent,3);self.assertEqual(result['stop_reason'],'TECHNICAL_FAILURE')
    r=report(tmp);self.assertEqual(r['valid_items'],16);self.assertEqual(r['modality_available'],1);self.assertIsNone(r['cells'][2]['items']);self.assertEqual(r['cells'][3]['status'],'NOT_ATTEMPTED')
 def test_checkpoint_missing_extra_and_positive_anomaly(self):
  for kind in ('missing','note','anomaly','eof'):
   with self.subTest(kind=kind),tempfile.TemporaryDirectory() as tmp:
    def reader(rows):
     s=unverified(rows)
     if kind=='eof':raise EOFError()
     if kind=='missing':s.pop(rows[0]['id'])
     if kind=='note':s[rows[0]['id']]['note']='extra'
     if kind=='anomaly':s[rows[0]['id']]={'state':'settled','before_nano_usd':999,'after_nano_usd':0,'debit_nano_usd':999,'attempt_body_sha256':'0'*64,'account_evidence_sha256':'a'*64}
     return s
    fake=Fake();r=run(tmp,fake,reader);self.assertEqual(r['failure'],'CHECKPOINT_FAILED');self.assertEqual(fake.sent,3);self.assertEqual(report(tmp)['valid_requests'],3)
 def test_request_and_receipt_tamper(self):
  d=engine();f=d.load_frozen();req=d.build_requests(f)[0];req['body']+=b' '
  with self.assertRaises(Exception):d.validate_outbound(req,f['rows'][0])
  with tempfile.TemporaryDirectory() as tmp:
   run(tmp,Fake(),unverified);p=next(d.paths(tmp)['receipts'].iterdir());p.write_bytes(b'{}')
   with self.assertRaises(Exception):report(tmp)
 def test_crash_unknown_and_no_rerun(self):
  with tempfile.TemporaryDirectory() as tmp:
   code='from s3_v2.runtime import run\nfrom s3_v2.test_v2 import Fake,unverified\nimport os\ndef crash(i,o,h):\n if i==1:os._exit(73)\nrun('+repr(tmp)+',Fake(crash),unverified)'
   child=subprocess.run([sys.executable,'-B','-c',code]);self.assertEqual(child.returncode,73)
   r=report(tmp);self.assertEqual(r['valid_requests'],1);self.assertEqual(r['cells'][1]['status'],'UNKNOWN_POTENTIALLY_BILLED');self.assertFalse(r['terminal'])
   with self.assertRaises(Exception):run(tmp,Fake(),unverified)
 def test_deadline(self):
  with tempfile.TemporaryDirectory() as tmp:
   class Clock:
    now=0
    def __call__(self):return self.now
   clock=Clock()
   def mutate(i,o,h):clock.now=3601
   r=run(tmp,Fake(mutate),unverified,clock=clock);self.assertEqual(r['handoffs'],1);self.assertEqual(r['failure'],'RESPONSE_LATE')
 def test_transport_fourth_send_interlock(self):
  from .transport import _SystemOne,TransportError
  d=engine();t=_SystemOne(d.build_requests(d.load_frozen()),{});t.sent=3
  with self.assertRaises(TransportError):t('',{},b'',1)
if __name__=='__main__':unittest.main()
