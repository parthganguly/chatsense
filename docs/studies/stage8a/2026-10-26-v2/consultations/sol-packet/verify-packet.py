from pathlib import Path
import hashlib,json,subprocess,struct,datetime,html.parser
P=Path('artifacts/stage8a-sol-v2-packet-audit');V=Path('docs/studies/stage8a/2026-10-26-v2');S=V/'stimuli';oldbase='docs/studies/stage8a/2026-10-24-v1';v1='64efc6d0018106d0644dc620ffca8939ac50c088';source='72eeb00d436d3a85a117fb8fced3cf7597b12d31';candidate='6c5ef1c61358e637fc38c5a036149863a4efef0a'
sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda p:json.loads(p.read_text());git=lambda *a:subprocess.check_output(['git',*a]);old=lambda rel:git('show',v1+':'+oldbase+'/'+rel)
assert git('rev-parse','HEAD').decode().strip()==candidate and not git('status','--porcelain');(P/'logs/initial-identity.log').write_bytes(git('rev-parse','HEAD')+git('status','--porcelain'))
changed=git('diff','--name-only',source,candidate).decode().splitlines();non_docs=[x for x in changed if not x.startswith('docs/')];assert not non_docs,non_docs
r={'candidate_commit':candidate,'accepted_product_source':source,'non_document_drift':non_docs,'product_drift':False,'preservation':[],'cards':[]}
rules=read(V/'SCIENCE-INVARIANTS.json')
for entry in rules['unchanged_files']:
 path=entry['path'];b=(V/path).read_bytes();assert b==old(path);r['preservation'].append({'path':path,'exact_v1_bytes':True,'sha256':sha(b)})
for entry in rules['version_only_files']:
 path=entry['path'];b=(V/path).read_text().replace('2026-10-26-v2','2026-10-24-v1').replace('urn:chatsense:stage8a:raw-response:v2','urn:chatsense:stage8a:raw-response:v1').encode();assert b==old(path);r['preservation'].append({'path':path,'version_only':True,'normalized_sha256':sha(b)})
methods=lambda b:b[b.index(b'## Sample and stopping'):];assert methods((V/'PREREGISTRATION.md').read_bytes())==methods(old('PREREGISTRATION.md'));r['methods_tail_sha256']=sha(methods(old('PREREGISTRATION.md')))
v1work=Path('/Users/parth/.codex/worktrees/stage8a-prereg/whatsapp-analytics-ui');v1files=git('ls-tree','-r','--name-only',v1,'--',oldbase).decode().splitlines();assert all((v1work/f).read_bytes()==git('show',v1+':'+f) for f in v1files);r['v1_readonly_worktree_files_exact']=len(v1files);r['v1_scope_note']='v2 source branch does not include v1 branch packet; preservation checked against immutable git blobs and separate read-only v1 checkout, not assumed shared ancestry.'
m=read(S/'manifest.json');cap=read(S/'verification/capture-run.json');plan=read(S/'capture-plan.json');build=read(S/'verification/build-provenance.json');oldm=json.loads(old('stimuli/manifest.json'));oldcards={c['id']:c for c in oldm['cards']};priorroot=Path('/Users/parth/.codex/worktrees/stage8a-ux-repair-audit/whatsapp-analytics-ui/artifacts/stage8a-sol-repair-audit');prior=read(priorroot/'measurements.json');expected=read(S/'expected/cards.json')
assert m['capturePlan']==plan;assert m['captureRunSha256']==sha((S/'verification/capture-run.json').read_bytes());assert m['v1ManifestSha256']==sha(old('stimuli/manifest.json'))
dt=lambda x:datetime.datetime.fromisoformat(x.replace('Z','+00:00'));assert dt(plan['acceptedAtUtc'])<dt(cap['capturedAtUtc']);r['chronology']={'accepted':plan['acceptedAtUtc'],'capture_started':cap['capturedAtUtc'],'acceptance_precedes_capture':True,'build':build['builtAtUtc']}
assert all(x==source for x in [m['acceptedCodeCommit'],plan['acceptedCodeCommit'],cap['acceptedCodeCommit'],cap['repositoryHead'],build['sourceCommit']]);assert cap['sourceTree']==build['sourceTree']==git('rev-parse',source+'^{tree}').decode().strip();assert m['buildId']==cap['nextBuildId']==build['buildId']
assert sha(Path('package-lock.json').read_bytes())==plan['lockfileSha256']==build['lockfileSha256'];assert sha(Path('components/analytics/RelationshipReadCard.tsx').read_bytes())==plan['componentSha256']==build['componentSha256']
for rel,key in [('UX-REVIEW.md','uxReviewSha256'),('decision.json','uxDecisionSha256'),('SHA256SUMS.json','uxEvidenceInventorySha256')]:assert sha((V/'consultations/sol-ux'/rel).read_bytes())==plan[key]==sha((priorroot/rel).read_bytes())
uxinventory=read(V/'consultations/sol-ux/SHA256SUMS.json');assert len(uxinventory)==90
for rel,e in uxinventory.items():assert sha((V/'consultations/sol-ux'/rel).read_bytes())==e['sha256']==sha((priorroot/rel).read_bytes())
r['prior_ux_evidence_90_files_equal']=True
actualout=Path('/Users/parth/.codex/worktrees/stage8a-prereg-v2/whatsapp-analytics-ui/out');assert actualout.exists();
for e in build['files']:assert (actualout/e['path']).stat().st_size==e['bytes'] and sha((actualout/e['path']).read_bytes())==e['sha256']
# Recompute provenance inventory in each ordinary representation, retaining the actual one.
representations={'json_indent2_newline':(json.dumps(build['files'],indent=2)+'\n').encode(),'json_indent2':json.dumps(build['files'],indent=2).encode(),'json_sortkeys':json.dumps(build['files'],sort_keys=True).encode(),'lines':''.join(e['sha256']+'  '+e['path']+'\n' for e in build['files']).encode()};r['build_output_inventory_encoding_matches']=[k for k,b in representations.items() if sha(b)==build['outputInventorySha256']];r['build_output_files_verified']=len(build['files'])
class H(html.parser.HTMLParser):
 def __init__(self):super().__init__();self.text=[];self.hrefs=[]
 def handle_data(self,d):self.text.append(d)
 def handle_starttag(self,t,a):
  if t=='a':self.hrefs.append(dict(a).get('href'))
def lum(rgb):
 x=[v/255 for v in rgb];x=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in x];return sum(a*b for a,b in zip(x,[.2126,.7152,.0722]))
for c,ex in zip(m['cards'],expected):
 assert c['id']==ex['id'];oc=oldcards[c['sourceV1Id']];pid=c['sourceV1Id'];text=(S/'captures'/ (c['id']+'.innerText.txt')).read_bytes();assert text==oc['renderedInnerText'].encode()==old('stimuli/captures/'+pid+'.card.innerText.txt');assert sha(text)==c['renderedInnerTextSha256']==oc['renderedInnerTextSha256'];assert (S/c['v1Text']).read_bytes()==text
 for key in ['fixtureSha256','expectedReadSha256','frozenNowMs','frozenNowIso','messageCount','exportStartedAt','exportEndedAt','expectedState','expectedCarriedContactLabel']:assert c[key]==ex[key]==oc[key],(c['id'],key)
 assert (S/c['fixture']).read_bytes()==old('stimuli/'+oc['fixture']);assert sha((S/c['fixture']).read_bytes())==c['fixtureSha256'];assert (S/c['expectedRead']).read_bytes()==old('stimuli/'+oc['expectedRead']);assert sha((S/c['expectedRead']).read_bytes())==c['expectedReadSha256']
 h=H();h.feed((S/'captures'/(c['id']+'.outerHTML.html')).read_text());htmltext=''.join(h.text);assert h.hrefs==['#narrative-heading'];rows=c['contexts']['selected']['measure']['text'];pos=0
 for row in rows:
  loc=htmltext.index(row['text'],pos);pos=loc+len(row['text'])
 b=(S/c['selected']['file']).read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n';w,ht=struct.unpack('>II',b[16:24]);assert w==344 and ht<=800 and ht==c['selected']['height'];assert sha(b)==c['selected']['sha256'];assert b==(priorroot/'screenshots'/(pid+'.whole-native344.png')).read_bytes()
 cr=next(x for x in cap['cards'] if x['id']==c['id']);assert cr['contexts']==c['contexts'];assert cr['selectedDimensions']=={'width':w,'height':ht}
 for mode,ct in c['contexts'].items():
  assert ct['textSha256']==sha(text) and ct['exactV1Text'] and not ct['pageErrors'];assert all(a['opacity']==1 for a in ct['geometry']['ancestorOpacity']);pr=next(x for x in prior if x['id']==pid and x['mode']=={'selected':'native344','desktopAudit':'desktop','mobileAudit':'phone'}[mode]);assert len(ct['measure']['text'])==len(pr['rows'])
  for row,prrow in zip(ct['measure']['text'],pr['rows']):
   assert row['text']==prrow['text'] and row['fontSizePx']==prrow['size'] and row['lineHeightPx']==prrow['leading'];assert row['effectiveForeground']==prrow['foreground'] and row['effectiveBackground']==prrow['background'];a,z=sorted([lum(row['effectiveForeground']),lum(row['effectiveBackground'])]);ratio=(z+.05)/(a+.05);assert abs(ratio-row['contrastRatio'])<1e-10 and ratio>=4.5
  for f in ct['files']:assert not f['file'].startswith('verification/');assert sha((S/f['file']).read_bytes())==f['sha256']
 for row,delta in zip(rows,c['typographyDelta']):
  assert delta['text']==row['text'];oldrow=[t for t in oc['textContrast'] if row['text'].startswith(t['text'])];assert len(oldrow)==1;oldrow=oldrow[0];assert delta['v1FontSizePx']==oldrow['fontSizePx'] and delta['v1Foreground']==oldrow['color'] and delta['v1ContrastRounded']==oldrow['contrastRatio'];assert delta['v2FontSizePx']==row['fontSizePx'] and delta['v2Foreground']==row['color'] and delta['v2Contrast']==row['contrastRatio'] and delta['v2LineHeightPx']==row['lineHeightPx']
 assert len(rows)==len(c['typographyDelta']);ge=c['contexts']['selected']['geometry'];bb,mb=ge['card'],ge['main'];assert ge['fullyInsideMain'] and bb['x']>=mb['x'] and bb['y']>=mb['y'] and bb['x']+bb['width']<=mb['x']+mb['width'] and bb['y']+bb['height']<=mb['y']+mb['height'];assert c['v1Selected']['sha256']==sha(old('stimuli/'+c['v1Selected']['file']));assert c['v1ComputedBorder']==oc['computedBorder']
 r['cards'].append({'id':c['id'],'selected_sha256':sha(b),'dimensions':[w,ht],'prior_independent_png_equal':True,'fixture_read_clock_and_text_v1_exact':True,'selected_HTML_scientific_row_order_and_href_match':True,'three_context_text_hashes_equal_v1':True,'typography_rows_verified':len(rows),'contrast_min':min(x['contrastRatio'] for x in rows),'whole_inside_actual_main':True,'desktop_limitation_clearance':c['contexts']['desktopAudit']['geometry']['limitationFirstFrameClearancePx']})
r['all15_context_text_hashes_v1_exact']=True;r['failed_attempt_partial_files']=len(list((S/'verification/failed-capture-attempt-1/partial-captures').iterdir()));assert r['failed_attempt_partial_files']==22
assert not any('failed-capture' in e['selected']['file'] for e in m['cards']);r['failed_attempt_unused_by_selected_manifest']=True
# Original failed script differs in readiness/import/error diagnostics; its logic is read only, never executed.
for k in ['humanObservations','humanStudyDecision','recruitmentAuthorized','stage8bAuthorized']:assert m[k]=={'humanObservations':0,'humanStudyDecision':'NOT_RUN','recruitmentAuthorized':False,'stage8bAuthorized':False}[k]
assert m['presentation']['scalePercent']==100 and m['presentation']['minimumUsableDisplayHeightCssPx']==800 and m['presentation']['minimumUsableDisplayWidthCssPx']==384
r['manifest_sha256']=sha((S/'manifest.json').read_bytes());r['capture_script_sha256']=sha((S/'scripts/capture.mjs').read_bytes());r['pending_final_freeze_intentional']=not (V/'FREEZE.json').exists();(P/'packet-measurements.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
