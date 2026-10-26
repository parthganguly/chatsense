"""Sol-authored FAKE algebra and manually interpreted artificial semantic clauses only."""
import copy,importlib.util,json,pathlib,statistics,sys
P=pathlib.Path('artifacts/stage8a-sol-v2-packet-audit');G=pathlib.Path('docs/studies/stage8a/2026-10-26-v2/preflight/gate.py')
spec=importlib.util.spec_from_file_location('audited_gate',G);g=importlib.util.module_from_spec(spec);spec.loader.exec_module(g)
def own(n=10):
 rows=[]
 for slot in range(1,n+1):
  shift=(slot-1)%5;order=list('ABCDE'[shift:]+'ABCDE'[:shift]);cards={}
  for cid in 'ABCDE':
   cards[cid]={'motive':'CLEAR_LIMIT' if cid=='A' else 'NOT_MENTIONED','prediction':'CLEAR_LIMIT' if cid=='B' else 'NOT_MENTIONED','direct':'CLEAR_LIMIT','raw_complete':True,'usefulness':4 if cid in 'AB' else 3,'creepiness':2,'want':'yes' if slot<=5 and cid=='A' else 'no','evidence':{k:'FAKE SOL independently authored algebra citation; no human words' for k in ['motive','prediction','direct','history']}}
   if cid=='D':cards[cid]['history']='NO_PROMISE'
  rows.append({'slot':slot,'disposition':'usable','order':order,'adult':True,'consented':True,'uncertain_context':slot<=3,'nonromantic_context':slot<=2,'integrity':True,'review':{'reviewer_ids':['FAKE_SOL_REVIEW_A','FAKE_SOL_REVIEW_B'],'independent':True,'locked':True,'adjudicated':True},'cards':cards})
 return {'kind':'FAKE_INSTRUMENT_TEST','rows':rows}
results=[]
def check(name,data,expected,note='',checks=None):
 try:
  result=g.evaluate(data);actual=result['instrument_decision'];assert expected!='REJECT',name+' should be rejected';assert actual==expected,(name,actual,expected)
  assert result['human_study_decision']=='NOT_RUN' and not result['stage8b_authorized']
  if checks:
   for k,v in checks.items():assert result[k]==v,(name,k,result[k],v)
  results.append({'id':name,'expected':expected,'actual':actual,'pass':True,'rationale':note,'result':result})
 except ValueError as e:
  assert expected=='REJECT',(name,str(e));results.append({'id':name,'expected':expected,'actual':'REJECT','pass':True,'rationale':note,'error':str(e)})
check('own_positive_exact_thresholds',own(),'PASS','Only A/B usefulness qualify; exactly five distinct yes; quotas exactly3/2; single positive spontaneous domain on different cards.')
for n in [0,7,8,9]:check('N'+str(n),own(n),'NOT_RUN' if n==0 else 'INCONCLUSIVE','Never lower the target denominator.')
for count in [1,2,3]:
 d=own()
 for row in d['rows'][:count]:row['cards']['C']['motive']='ERROR'
 check(str(count)+'_incorrect_nonhistory_people',d,'PASS' if count<=2 else 'FAIL','Eight of ten allows two incorrect people, not history promises.',{'comprehension_correct':10-count})
for label in ['PROMISE','AMBIGUOUS','MISSING']:
 d=own();d['rows'][0]['cards']['D']['history']=label;check('history_'+label,d,'FAIL' if label=='PROMISE' else 'INCONCLUSIVE','No ambiguity/missingness is silently NO_PROMISE.')
for field in ['motive','prediction','direct']:
 d=own();d['rows'][0]['cards']['C'][field]='MISSING';check('missing_'+field,d,'INCONCLUSIVE','Missing core field keeps ten slots, not nine complete cases.')
for field in ['usefulness','creepiness','want']:
 d=own();d['rows'][0]['cards']['E'][field]=None;check('missing_'+field,d,'INCONCLUSIVE','Even known positive other fields do not waive core completeness.')
d=own();d['rows'][0]['cards']['A']['raw_complete']=False;check('incomplete_raw',d,'INCONCLUSIVE')
for flag in ['independent','locked','adjudicated']:
 d=own();d['rows'][0]['review'][flag]=False;check('review_'+flag,d,'INCONCLUSIVE','Self-attested review condition false cannot pass.')
for flag in ['adult','consented','integrity']:
 d=own();d['rows'][0][flag]=False;check('eligibility_exposure_'+flag,d,'INCONCLUSIVE')
for quota in ['uncertain_context','nonromantic_context']:
 d=own();d['rows'][0][quota]=False;check('quota_one_below_'+quota,d,'INCONCLUSIVE')
for disp in ['withdrawn','excluded']:
 d=own();d['rows'][0]={'slot':1,'disposition':disp,'cards':{}};check(disp+'_not_replaced',d,'INCONCLUSIVE',checks={'N_started':10,'N_usable':9})
d=own();d['rows'][0]['order']=list('EDCBA');check('unregistered_order',d,'REJECT')
d=own();d['rows'][0]['review']['reviewer_ids']=['same','same'];check('one_reviewer_twice',d,'REJECT')
d=own();d['rows'][1]=copy.deepcopy(d['rows'][0]);check('duplicate_slot_replacement',d,'REJECT')
d=own();d['rows']*=5;check('fifty_cards_pseudo_people',d,'REJECT')
d=own();d['rows'][0]['cards'].pop('E');check('four_card_exposure',d,'REJECT')
d=own();d['rows'][0]['cards']['A']['evidence']['motive']='';check('empty_evidence',d,'REJECT')
d=own();d['kind']='REAL_PARTICIPANT';check('real_data_guard',d,'REJECT')
for label in ['ERROR','AMBIGUOUS','MISSING']:
 d=own();d['rows'][0]['cards']['D']['direct']=label;check('D_contradiction_'+label,d,'REJECT','Cannot feed NO_PROMISE with D reply error/unresolved direct response.')
d=own()
for row in d['rows']:
 for c in row['cards'].values():c['prediction']='NOT_MENTIONED'
check('prompted_only_understanding',d,'FAIL',checks={'comprehension_correct':0})
d=own()
for row in d['rows']:row['cards']['B']['usefulness']=3
check('one_useful_card_only',d,'FAIL')
d=own()
for row in d['rows'][:5]:row['cards']['A']['usefulness']=3
check('usefulness_median3p5_not_rounded',d,'FAIL',checks={'usefulness_medians':{'A':3.5,'B':4.0,'C':3.0,'D':3.0,'E':3.0}})
for vals,expect in [([1]*5+[3]*5,'PASS'),([2]*5+[3]*5,'FAIL')]:
 d=own()
 for row,val in zip(d['rows'],vals):
  for c in row['cards'].values():c['creepiness']=val
 check('creep_median_'+str(statistics.median(vals)),d,expect)
d=own()
for i,row in enumerate(d['rows']):
 for j,c in enumerate(row['cards'].values()):c['creepiness']=1 if i>=6 or j<2 else 3
assert statistics.median([c['creepiness'] for r in d['rows'] for c in r['cards'].values()])==1
check('pooled_median_false_PASS',d,'FAIL','Pooled50 median1 would pass incorrectly; participant-median median3 fails.',{'creepiness_median':3})
d=own()
for row in d['rows']:
 for c in row['cards'].values():c['want']='yes' if row['slot']<=4 else 'no'
check('twenty_yes_but_four_distinct_people',d,'FAIL',checks={'own_chat_yes_people':4})
d=own();d['rows'][4]['cards']['A']['want']='unsure';check('conditional_interest_not_fifth_yes',d,'FAIL',checks={'own_chat_yes_people':4})
semantic=[
 ('hedged_restart','The export makes a return message seem more likely after this gap.','D','prediction','ERROR','PROMISE','An app-attributed probability is a prediction even without certainty.'),
 ('negative_probability','Those earlier pauses mean he probably will not answer this time.','D','prediction','ERROR','PROMISE','Negative future claims are equally unsupported.'),
 ('contradiction','This cannot forecast anything; still, the app tells me she will be back by Friday.','D','prediction','ERROR','PROMISE','Explicit app prediction dominates the initial disclaimer.'),
 ('unclear_attribution','I expect another message, though I cannot explain what that expectation is based on.','D','prediction','AMBIGUOUS','AMBIGUOUS','Unresolved attribution cannot be counted as NO_PROMISE.'),
 ('personal_hope','I personally hope for contact; this export only describes earlier pauses and says nothing about a future reply.','D','prediction','CLEAR_LIMIT','NO_PROMISE','Personal hope is explicitly separated from app inference.'),
 ('motive_hedge','The starts suggest they may have stopped caring.','C','motive','ERROR',None,'Hedged attribution of caring is an unsupported motive claim.'),
 ('bare_negative','No.','C','direct','AMBIGUOUS',None,'Bare no can mean no prediction or no reply; scope unresolved.'),
 ('vague_limit','This cannot know absolutely everything about them.','C','motive','AMBIGUOUS',None,'Vague limitation does not supply motive-limit recognition.'),
 ('historical_only','Seven of the earlier restarts were from Ravi.','C','prediction','NOT_MENTIONED',None,'A historical statement is not positive spontaneous forecast-limit evidence.'),
]
sem=[]
for name,clause,cid,field,label,history,why in semantic:
 d=own();card=d['rows'][0]['cards'][cid];card[field]=label;card['evidence'][field]='FAKE artificial clause: '+clause
 if history:card['history']=history;card['evidence']['history']='FAKE artificial clause: '+clause
 expected='FAIL' if history=='PROMISE' else 'INCONCLUSIVE' if history=='AMBIGUOUS' else 'PASS'
 check('semantic_'+name,d,expected,why)
 sem.append({'id':name,'artificial_clause':clause,'manual_expected_domain':field,'manual_expected_label':label,'history_label':history,'rationale':why,'automatic_semantic_scoring':False})
(P/'fresh-semantic-controls.json').write_text(json.dumps({'kind':'FAKE_CLAUSES_NOT_PARTICIPANT_RECORDS','controls':sem},indent=2));(P/'independent-control-results.json').write_text(json.dumps({'kind':'FAKE_INSTRUMENT_TEST_ONLY','human_observations':0,'human_study_decision':'NOT_RUN','controls':results},indent=2));print(len(results),'independently authored controls passed;',len(sem),'fresh semantic clauses manually mapped; no human observation or semantic classifier.')
