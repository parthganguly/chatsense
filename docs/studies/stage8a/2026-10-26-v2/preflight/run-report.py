"""Write artificial control outcomes; never accepts an input response file."""
import hashlib
import json
from pathlib import Path
from gate import evaluate
from test_gate import base

cases = {}
cases['positive_algebra_control'] = base()
d=base(); d['rows'][0]['cards']['D']['history']='PROMISE'; d['rows'][0]['cards']['D']['prediction']='ERROR'
cases['explicit_future_reply'] = d
d=base()
for row in d['rows'][:3]: row['cards']['A']['motive']='AMBIGUOUS'
cases['three_ambiguous_understandings'] = d
d=base(); d['rows'][0]['cards']['D']['history']='AMBIGUOUS'
cases['one_ambiguous_history'] = d
d=base(); d['rows'][0]['cards']['B']['usefulness']=None
cases['missing_rating'] = d
d=base()
for row in d['rows'][:3]:
    row['cards']['C']['motive']='ERROR'
    row['cards']['C']['usefulness']=5
cases['high_usefulness_false_confidence'] = d
d=base()
for row in d['rows']: row['nonromantic_context']=True
cases['nonromantic_clear_understanding'] = d
cases['N9_no_reduced_denominator_pass'] = base(9)
results={name:evaluate(data) for name,data in cases.items()}
assert all(v['human_study_decision']=='NOT_RUN' and not v['stage8b_authorized'] for v in results.values())
for name in ['explicit_future_reply','three_ambiguous_understandings','one_ambiguous_history','missing_rating','high_usefulness_false_confidence','N9_no_reduced_denominator_pass']:
    assert results[name]['instrument_decision'] != 'PASS', name
here=Path(__file__).parent
report={'kind':'FAKE_INSTRUMENT_TEST_ONLY','human_observations':0,
        'note':'Repeated artificial code vectors test arithmetic; no generated participant transcripts or empirical claims.',
        'gate_sha256':hashlib.sha256((here/'gate.py').read_bytes()).hexdigest(), 'cases':results}
(here/'control-results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v['instrument_decision'] for k,v in results.items()},indent=2))
