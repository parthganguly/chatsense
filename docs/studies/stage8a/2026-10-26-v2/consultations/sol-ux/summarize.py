import json,pathlib,hashlib,struct
p=pathlib.Path('artifacts/stage8a-sol-repair-audit');data=json.loads((p/'measurements.json').read_text());summary=[]
for d in data:
 overlaps=[]
 for i,r in enumerate(d['rows']):
  for s in d['rows'][i+1:]:
   for a in r['lines']:
    for b in s['lines']:
     if min(a['right'],b['right'])-max(a['left'],b['left'])>.5 and min(a['bottom'],b['bottom'])-max(a['top'],b['top'])>.5:overlaps.append([r['text'],s['text']])
 base=next(x for x in data if x['id']==d['id'] and x['mode']=='phone');double=all(r['size']==2*b['size'] and r['leading']==2*b['leading'] for r,b in zip(d['rows'],base['rows'])) if d['rootPercent']==200 else None
 summary.append({'id':d['id'],'mode':d['mode'],'exactText':d['exactText'],'href':d['href'],'frozenClockMatches':d['now']==next(x for x in json.loads(pathlib.Path('tests/viewport/fixtures/stage8a-v1/cards.json').read_text()) if x['id']==d['id'])['frozenNowMs'],'card':d['card'],'main':d['main'],'content':d['content'],'header':d['head'],'limitationLastBottom':d['limitationLines'][-1]['bottom'],'limitationClearance':d['clearance'],'limitationLastHit':d['limitationLastHit'],'link':d['link'],'rangeCount':sum(len(r['lines']) for r in d['rows']),'horizontalEscapes':len(d['escapes']),'glyphOverflowFlags':d['clipped'],'textOverlaps':overlaps,'lineReachabilityFailures':len([x for x in d['reachability'] if not x['reachable']]),'ancestorClipFlags':len([x for x in d['reachability'] if x['clips']]),'minContrast':min(r['contrast'] for r in d['rows']),'allSettledOpacity1':all(a['opacity']=='1' for r in d['rows'] for a in r['opacity']),'allTextActuallyDoubled':double,'keyboard':d.get('keyboard')})
(p/'summary.json').write_text(json.dumps(summary,indent=2))
images=[]
for f in sorted((p/'screenshots').glob('*.png')):
 b=f.read_bytes();w,h=struct.unpack('>II',b[16:24]);images.append({'path':str(f.relative_to(p)),'width':w,'height':h,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(p/'png-inventory.json').write_text(json.dumps(images,indent=2));print('rows',len(summary),'native',[(x['id'],x['card']['width'],x['card']['height']) for x in summary if x['mode']=='native344']);print('problems',[(x['id'],x['mode']) for x in summary if x['horizontalEscapes'] or x['glyphOverflowFlags'] or x['textOverlaps'] or x['lineReachabilityFailures'] or x['ancestorClipFlags'] or x['allTextActuallyDoubled'] is False]);print('desktop clearance',[(x['id'],x['limitationClearance'],x['limitationLastHit']) for x in summary if x['mode']=='desktop'])
