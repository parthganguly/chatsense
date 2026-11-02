import sys, tempfile,json
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).parent))
import attack as a
d=a.d
with tempfile.TemporaryDirectory() as t:
 root=Path(t)
 for name,index,kind in [('retention',1,'retention'),('identity',1,'identity'),('identity drift',2,'identity'),('usage cap',0,'usage'),('factual stop',0,'factual')]:
  def change(i,r):
   status,h,b=r
   if i!=index:return r
   o=json.loads(b)
   if kind=='retention':h=[(k,'stored' if k=='X-Fastino-Data-Retention' else v) for k,v in h]
   if kind=='identity':h=[(k,'UNAPPROVED' if k=='X-Fastino-Served-Model' else v) for k,v in h]
   if kind=='usage':o['usage']['input_tokens']=65537
   if kind=='factual':
    ans=o['answers']['q02']; opts=ans['probabilities']; win=next(k for k,v in opts.items() if not v); ans['choice']=win;ans['probabilities']={k:int(k==win) for k in opts}
   return status,h,json.dumps(o).encode()
  summary,calls=a.run(root/name,change)
  assert len(calls)==(20 if kind=='factual' else index+1)
  print(json.dumps({'test':name,'summary':summary}))
 state=root/'corrupt';a.run(state);ledger=d.paths(state)['ledger'];data=ledger.read_bytes();ledger.write_bytes(data.replace(b'"VALID"',b'"WRONG"',1));rep=d.inspect(state);assert 'CHAIN_BROKEN' in rep['errors'];assert not rep['complete'];print(json.dumps({'test':'corrupt ledger','report':rep}))
 print('EDGE CHECKS PASSED')
