import json,pathlib
p=pathlib.Path(__file__).parent;a=json.loads((p/'measurements.json').read_text());out=[]
for m in a:
 rows=m['rows'];bad=[{'text':r['text'],'rect':r['rect'],'outsideViewport':[x for x in r['ranges'] if x['x']<0 or x['right']>m['viewport']+.5]}for r in rows if any(x['x']<0 or x['right']>m['viewport']+.5 for x in r['ranges'])]
 out.append({'id':m['id'],'mode':m['mode'],'card':m['card'],'main':m['main'],'textEqual':m['textEqual'],'minimumContrast':min(r['contrast']for r in rows),'minimumFont':min(r['fontSize']for r in rows),'limitationFont':rows[-2]['fontSize'],'limitationLineHeight':rows[-2]['lineHeight'],'limitationBottom':rows[-2]['rect']['bottom'],'textOutsideViewport':bad,'allFontSizes':[(r['text'],r['fontSize'])for r in rows]})
(p/'summary.json').write_text(json.dumps(out,indent=2))
for m in out: print(m['id'],m['mode'],m['card']['width'],m['card']['height'],'minContrast',round(m['minimumContrast'],2),'overflow',len(m['textOutsideViewport']),'limBottom',m['limitationBottom'],'mainBottom',m['main']['bottom'])
