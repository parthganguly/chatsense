"""Independent algebraic vectors; no modeled people or real response input."""
import copy, importlib.util, json
from pathlib import Path
from statistics import median
P=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('audited_gate',P/'preflight/gate.py')
g=importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
def vector(n=10):
    rows=[]
    for i in range(1,n+1):
        cards={k:dict(motive='NOT_MENTIONED',prediction='NOT_MENTIONED',direct='CLEAR_LIMIT',raw_complete=True,usefulness=4,creepiness=2,want='no',evidence={d:'FAKE algebra citation' for d in ['motive','prediction','direct','history']}) for k in 'ABCDE'}
        cards['A']['motive']='CLEAR_LIMIT'; cards['B']['prediction']='CLEAR_LIMIT'; cards['D']['history']='NO_PROMISE'
        if i<=5: cards['E']['want']='yes'
        rows.append(dict(slot=i, disposition='usable',order=g.expected_order(i),adult=True,consented=True,uncertain_context=i<=3,nonromantic_context=i<=2,integrity=True,cards=cards,review=dict(reviewer_ids=['FAKE_A','FAKE_B'],independent=True,locked=True,adjudicated=True)))
    return dict(kind='FAKE_INSTRUMENT_TEST',rows=rows)
results=[]
def check(name,d,expected,reject=False):
    try:
        r=g.evaluate(d)
        actual=r['instrument_decision']
        assert not reject and actual==expected,(name,actual,expected)
        assert r['human_study_decision']=='NOT_RUN' and not r['stage8b_authorized']
    except ValueError:
        assert reject,name
        actual='REJECTED'
    results.append(dict(name=name,expected=expected,actual=actual))
check('minimal independent positive',vector(),'PASS')
for n in [8,9]:check(f'N={n}',vector(n),'INCONCLUSIVE')
for e in [1,2,3]:
    d=vector()
    for row in d['rows'][:e]:row['cards']['C']['motive']='ERROR'
    check(f'ordinary errors={e}',d,'FAIL' if e==3 else 'PASS')
for label in ['PROMISE','AMBIGUOUS','MISSING']:
    d=vector();d['rows'][0]['cards']['D']['history']=label
    check('D '+label,d,'FAIL' if label=='PROMISE' else 'INCONCLUSIVE')
for field in ['usefulness','creepiness','want']:
    d=vector();d['rows'][0]['cards']['A'][field]=None
    check('missing '+field,d,'INCONCLUSIVE')
for value in [False,True,0,6,4.0,'4']:
    d=vector();d['rows'][0]['cards']['A']['usefulness']=value
    check('invalid rating '+repr(value),d,'REJECTED',True)
for domain in ['motive','prediction']:
    d=vector()
    for r in d['rows']:
        for c in r['cards'].values():c[domain]='NOT_MENTIONED'
    check('leading check cannot rescue '+domain,d,'FAIL')
d=vector()
for r in d['rows']:
    for c in r['cards'].values():c['want']='no'
for c in d['rows'][0]['cards'].values():c['want']='yes'
check('five card yes one person',d,'FAIL')
for flag in ['independent','locked','adjudicated']:
    d=vector();d['rows'][0]['review'][flag]=False
    check('review '+flag,d,'INCONCLUSIVE')
for disposition in ['withdrawn','excluded']:
    d=vector();d['rows'][0]=dict(slot=1,disposition=disposition,cards={})
    check(disposition,d,'INCONCLUSIVE')
d=vector();d['rows'][1]=copy.deepcopy(d['rows'][0]);check('duplicate slot',d,'REJECTED',True)
d=vector();d['rows']*=5;check('50 repeated rows',d,'REJECTED',True)
d=vector();d['rows'][0]['review']['reviewer_ids']=['X','X'];check('same reviewer',d,'REJECTED',True)
d=vector();d['rows'][0]['cards']['D']['direct']='ERROR';check('D contradictory codes',d,'REJECTED',True)
d=vector()
for i,r in enumerate(d['rows']):
    for j,c in enumerate(r['cards'].values()):c['creepiness']=1 if i<6 and j<3 else 5
r=g.evaluate(d);assert r['creepiness_median']==1 and median([c['creepiness'] for r in d['rows'] for c in r['cards'].values()])==5
check('two-stage median differs from pooled',d,'PASS')
d=vector()
for i,r in enumerate(d['rows']):
    for c in r['cards'].values():c['creepiness']=1 if i<5 else 4
assert g.evaluate(d)['creepiness_median']==2.5
check('even median 2.5',d,'FAIL')
# Enumerate all 0..10 ordinary-error counts against the independent C>=8 rule.
for e in range(11):
    d=vector()
    for r in d['rows'][:e]:r['cards']['A']['motive']='ERROR'
    check('enumerated C='+str(10-e),d,'PASS' if e<=2 else 'FAIL')
print(json.dumps(dict(checks=len(results),results=results),indent=2))
