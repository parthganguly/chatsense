from pathlib import Path
import json,hashlib,subprocess
r=Path.cwd(); old=r/'artifacts/stage8a-sol-ux';out=r/'artifacts/stage8a-sol-ux-completion'; sha=lambda b:hashlib.sha256(b).hexdigest()
receipt=[]
for f in sorted(old.iterdir()):
 if not f.is_file():continue
 b=f.read_bytes(); committed=subprocess.check_output(['git','show','1f3e306bac5a6200785adf0841454fa92f24fe6c:docs/verification/stage8a-option-b/sol-partial/'+f.name]);receipt.append({'file':str(f.relative_to(r)),'bytes':len(b),'sha256':sha(b),'matchesPreservedCommit1f3e306':b==committed})
assert len(receipt)==48 and all(x['matchesPreservedCommit1f3e306']for x in receipt)
(out/'original-evidence-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
files=['components/analytics/RelationshipReadCard.tsx','app/page.tsx','playwright.config.ts','package.json','tests/viewport/relationship-read-card.spec.ts','tests/helpers/narrative-safety.ts','docs/verification/stage8a-option-b/ISSUE-35.md','docs/verification/stage8a-option-b/ASTRA-ACCEPTANCE.md','docs/verification/stage8a-option-b/opus/REPORT.md','docs/verification/stage8a-option-b/opus/RUNTIME.md']
files+= [str(p.relative_to(r))for p in sorted((r/'tests/viewport/fixtures/stage8a-v1').iterdir())if p.is_file()]
fr=[{'file':p,'sha256':sha((r/p).read_bytes())}for p in files]
(out/'inspected-file-hashes.json').write_text(json.dumps(fr,indent=2)+'\n')
a=json.loads((old/'measurements.json').read_text());s=[]
for m in a:
 rows=m['rows'];before=next(x for x in a if x['id']==m['id']and x['mode']=='mobile')
 s.append({'id':m['id'],'mode':m['mode'],'clock':m['clock'],'textEqual':m['textEqual'],'href':m['href'],'card':m['card'],'main':m['main'],'minimumContrast':min(x['contrast']for x in rows),'bodyLimitationSize':rows[-2]['fontSize'],'bodyLimitationLineHeight':rows[-2]['lineHeight'],'limitationBottom':rows[-2]['rect']['bottom'],'headerTextBounds':[{k:x[k]for k in ['text','fontSize','rect','ranges']}for x in rows[:2]],'everyFontExactlyDoubled':all(x['fontSize']==y['fontSize']*2 for x,y in zip(rows,before['rows']))if m['mode']in ['text200','combined']else None,'textOutsideViewport':[x['text']for x in rows if any(t['x']<0 or t['right']>m['viewport']+.5 for t in x['ranges'])]})
(out/'independent-measurements-summary.json').write_text(json.dumps(s,indent=2)+'\n')
(out/'identity-before.txt').write_text(subprocess.check_output(['git','rev-parse','HEAD'],text=True)+subprocess.check_output(['git','status','--porcelain'],text=True))
print('48 originals match preserved commit; 35 measurements summarized; inspected hash receipt written')
