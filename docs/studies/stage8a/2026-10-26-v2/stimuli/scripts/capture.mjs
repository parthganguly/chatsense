/* Astra P0 v2 capture. Real static app + file input, fixed synthetic clocks.
 * Run after UX PASS: node docs/studies/stage8a/2026-10-26-v2/stimuli/scripts/capture.mjs
 * No product DOM/styles are injected, rewritten, scaled, or reconstructed.
 */
/* global process, fetch, setTimeout, console, Buffer, Node, getComputedStyle, document */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = process.cwd();
const stimuli = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(path.join(stimuli, 'capture-plan.json'), 'utf8'));
assert.equal(plan.uxDecision, 'PASS');
assert.equal(plan.humanStudyDecision, 'NOT_RUN');
assert.match(plan.acceptedCodeCommit, /^[a-f0-9]{40}$/);
const cards = JSON.parse(readFileSync(path.join(stimuli, 'expected/cards.json'), 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
for (const dir of ['app','components','features','packages','contracts','lib','platform','styles','utils','hooks','public','fixtures','package.json']) {
  if (existsSync(path.join(root, dir))) assert.equal(git('diff', plan.acceptedCodeCommit, '--', dir), '', 'Product drift: '+dir);
}
assert.equal(sha(readFileSync(path.join(root, 'package-lock.json'))), plan.lockfileSha256);
assert.equal(sha(readFileSync(path.join(root, 'components/analytics/RelationshipReadCard.tsx'))), plan.componentSha256);
const reportPath = path.join(stimuli, 'verification/capture-run.json');
assert.ok(!existsSync(reportPath), 'Refuse to overwrite a prior capture; create a new version for any recapture.');
const selector = 'section[aria-label="Relationship read"]';
const port = 4321;
const url = 'http://127.0.0.1:'+port+'/';
const contexts = {
  selected: { viewport: { width:384, height:1200 }, deviceScaleFactor:1, isMobile:false, hasTouch:false },
  desktopAudit: { viewport: { width:1280, height:1000 }, deviceScaleFactor:1, isMobile:false, hasTouch:false },
  mobileAudit: { viewport: { width:390, height:844 }, deviceScaleFactor:1, isMobile:true, hasTouch:true },
};
let browser;
let activePage, activeCard, activeMode;
const server = spawn(process.execPath, [path.join(root,'node_modules/http-server/bin/http-server'),'out','-p',String(port),'-a','127.0.0.1','-c-1','--silent'], { cwd:root, stdio:'pipe' });
let serverError = '';
server.stderr.on('data', b => { serverError += b.toString(); });
const report = { capturedAtUtc:new Date().toISOString(), acceptedCodeCommit:plan.acceptedCodeCommit, sourceTree:git('rev-parse',plan.acceptedCodeCommit+'^{tree}'), repositoryHead:git('rev-parse','HEAD'), nextBuildId:readFileSync(path.join(root,'.next/BUILD_ID'),'utf8').trim(), node:process.version, playwright:JSON.parse(readFileSync(path.join(root,'node_modules/@playwright/test/package.json'),'utf8')).version, platform:process.platform, arch:process.arch, locale:'en-US', timezone:'UTC', colorScheme:'light', contexts, importPath:'visible import button -> actual file chooser/input[type=file] -> readWhatsAppExport -> analyzeImportedText(text, Date.now()) -> RelationshipReadCard', studyPresentation:'selected full hero-card PNG at DPR1; native100%; no browser DOM/style intervention; desktop/mobile first-screen images are audit only', cards:[] };
try {
  let ready=false;
  for (let n=0;n<100;n++) {
    assert.equal(server.exitCode,null,'Capture server failed: '+serverError);
    try { if ((await fetch(url)).ok) { ready=true; break; } } catch { /* server is still starting */ }
    await new Promise(r=>setTimeout(r,100));
  }
  assert.ok(ready,'Capture server did not start');
  assert.equal(await (await fetch(url)).text(),readFileSync(path.join(root,'out/index.html'),'utf8'),'Served page must be this exact production export');
  browser = await chromium.launch();
  report.browser = browser.version();
  for (const c of cards) {
    const fixture=readFileSync(path.join(stimuli,c.fixture));
    const expectedBytes=readFileSync(path.join(stimuli,c.expectedRead));
    assert.equal(sha(fixture),c.fixtureSha256);
    assert.equal(sha(expectedBytes),c.expectedReadSha256);
    const expected=JSON.parse(expectedBytes.toString());
    const baselineText=readFileSync(path.join(stimuli,c.v1Text),'utf8');
    const pieces=[expected.confidenceLabel,expected.headline,expected.summary,...expected.evidence,...(expected.historicalNote?[expected.historicalNote]:[]),...(expected.stalenessNote?[expected.stalenessNote]:[]),expected.limitation];
    const result={ id:c.id, sourceV1Id:c.sourceV1Id, fixtureSha256:sha(fixture),expectedReadSha256:sha(expectedBytes),frozenNowMs:c.frozenNowMs,frozenNowIso:c.frozenNowIso,contexts:{} };
    for (const [name,settings] of Object.entries(contexts)) {
      const context=await browser.newContext({...settings,locale:'en-US',timezoneId:'UTC',colorScheme:'light'});
      const page=await context.newPage();
      activePage=page; activeCard=c.id; activeMode=name;
      console.log('Starting '+c.id+' '+name);
      const errors=[];
      page.on('pageerror', e=>errors.push(e.message));
      await page.clock.setFixedTime(c.frozenNowMs);
      await page.goto(url);
      await page.getByText('Choose WhatsApp export').waitFor();
      await page.waitForLoadState('networkidle');
      await page.evaluate('document.fonts.ready');
      assert.equal(await page.evaluate('Date.now()'),c.frozenNowMs);
      const chooserReady=page.waitForEvent('filechooser');
      await page.getByRole('button',{name:'Choose WhatsApp export ZIP or TXT',exact:true}).click();
      const chooser=await chooserReady;
      await chooser.setFiles({name:'WhatsApp Chat with Synthetic Example.txt',mimeType:'text/plain',buffer:fixture});
      const section=page.locator(selector);
      await section.waitFor({state:'visible',timeout:30000});
      await page.evaluate('document.fonts.ready');
      await page.waitForFunction(sel=>{
        const el=document.querySelector(sel);if(!el)return false;
        for(let n=el;n;n=n.parentElement) {
          const s=getComputedStyle(n);
          if(Number(s.opacity)<0.999999||s.visibility!=='visible')return false;
        }
        return true;
      },selector);
      await page.waitForTimeout(200);
      assert.equal(await section.count(),1);
      const text=await section.innerText();
      assert.equal(text,baselineText,c.id+' '+name+' v1 DOM text drift');
      let cursor=0;
      for (const s of pieces) { const at=text.indexOf(s,cursor); assert.ok(at>=0,'Missing scientific string '+s); cursor=at+s.length; }
      assert.equal(await section.locator('a').getAttribute('href'),'#narrative-heading');
      const box=await section.boundingBox();
      const geometry=await section.evaluate((el,limitation)=>{
        const b=el.getBoundingClientRect(), m=el.closest('main'), mb=m.getBoundingClientRect();
        const caveat=[...el.querySelectorAll('p')].find(p=>p.textContent===limitation);
        const range=document.createRange();range.selectNodeContents(caveat);
        const lines=[...range.getClientRects()].map(r=>({x:r.x,y:r.y,right:r.right,bottom:r.bottom}));
        const ancestorOpacity=[];for(let n=el;n;n=n.parentElement)ancestorOpacity.push({tag:n.tagName,opacity:Number(getComputedStyle(n).opacity)});
        return {card:{x:b.x,y:b.y,width:b.width,height:b.height},main:{x:mb.x,y:mb.y,width:mb.width,height:mb.height},mainScrollTop:m.scrollTop,mainClientWidth:m.clientWidth,mainScrollWidth:m.scrollWidth,cardClientWidth:el.clientWidth,cardScrollWidth:el.scrollWidth,fullyInsideMain:b.top>=mb.top&&b.bottom<=mb.bottom&&b.left>=mb.left&&b.right<=mb.right,limitationTextLines:lines,limitationFirstFrameClearancePx:mb.bottom-Math.max(...lines.map(r=>r.bottom)),ancestorOpacity};
      },expected.limitation);
      assert.ok(geometry.cardScrollWidth<=geometry.cardClientWidth+1);
      assert.ok(geometry.ancestorOpacity.every(a=>a.opacity>=0.999999),'Do not capture transient faded text');
      if(name==='desktopAudit') assert.ok(geometry.limitationFirstFrameClearancePx>=1,'Desktop limitation must be fully visible above navigation');
      const measure=await section.evaluate(el=>{
        const parse=s=>(s.match(/[0-9.]+/g)||[]).map(Number);
        const over=(fg,bg)=>{const a=fg.length>3?fg[3]:1;return fg.slice(0,3).map((x,i)=>a*x+(1-a)*bg[i]);};
        const background=node=>{const chain=[];for(let n=node;n;n=n.parentElement)chain.unshift(n);let bg=[255,255,255];for(const n of chain)bg=over(parse(getComputedStyle(n).backgroundColor),bg);return bg;};
        const lum=rgb=>rgb.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);
        const rows=[];
        for(const e of el.querySelectorAll('p,h1,li,span,a')) {
          const own=[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent||'').join('').trim();
          if(!own)continue;
          const s=getComputedStyle(e),bg=background(e),fg=over(parse(s.color),bg),f=lum(fg),b=lum(bg);
          rows.push({text:own,color:s.color,effectiveForeground:fg,effectiveBackground:bg,fontSizePx:parseFloat(s.fontSize),lineHeightPx:parseFloat(s.lineHeight),fontWeight:s.fontWeight,contrastRatio:(Math.max(f,b)+0.05)/(Math.min(f,b)+0.05)});
        }
        const s=getComputedStyle(el);
        return {text:rows,borders:{top:s.borderTopColor,right:s.borderRightColor,bottom:s.borderBottomColor,left:s.borderLeftColor},background:s.backgroundColor};
      });
      for(const r of measure.text) assert.ok(r.contrastRatio>=4.5,'Text contrast below acceptance: '+r.text);
      const caveat=measure.text.find(r=>r.text===expected.limitation);
      assert.ok(caveat && caveat.fontSizePx>=14 && caveat.lineHeightPx>=20);
      const prefix=c.id+'.'+name;
      const files=[];
      if(name==='selected') {
        assert.equal(box.width,344,'Preserve v1 outer card width');
        assert.ok(geometry.fullyInsideMain,'Complete selected card must fit actual main viewport without clipping');
        const png='captures/'+prefix+'.card.png';
        await section.screenshot({path:path.join(stimuli,png),animations:'disabled'});
        const pngBytes=readFileSync(path.join(stimuli,png));
        const pngDimensions={width:pngBytes.readUInt32BE(16),height:pngBytes.readUInt32BE(20)};
        assert.equal(pngDimensions.width,344,'Actual PNG must retain native344px width');
        assert.ok(Math.abs(pngDimensions.height-box.height)<=1,'Actual PNG height must match the complete CSS box');
        files.push(png);
        for(const [suffix,content] of [['innerText.txt',text],['outerHTML.html',await section.evaluate(el=>el.outerHTML)]]) {
          const rel='captures/'+c.id+'.'+suffix;writeFileSync(path.join(stimuli,rel),content);files.push(rel);
        }
        result.selectedScreenshot=png;
        result.selectedDimensions=pngDimensions;
        result.selectedCssBox={width:box.width,height:box.height};
      }
      const screen='captures/'+prefix+'.first-screen.png';
      await page.screenshot({path:path.join(stimuli,screen),animations:'disabled'});files.push(screen);
      // Audit first-screen images are never offered as complete card stimuli.
      result.contexts[name]={geometry,measure,files:files.map(file=>({file,sha256:sha(readFileSync(path.join(stimuli,file)))})),textSha256:sha(Buffer.from(text)),exactV1Text:true,pageErrors:errors};
      assert.deepEqual(errors,[]);
      await context.close();
    }
    report.cards.push(result);
    console.log(c.id+': exact v1 text; complete selected '+result.selectedDimensions.width+'x'+result.selectedDimensions.height+'; contrast/legibility PASS');
  }
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
} catch(error) {
  const failure={card:activeCard,context:activeMode,error:String(error),at:new Date().toISOString()};
  if(activePage && !activePage.isClosed()) {
    failure.bodyText=await activePage.locator('body').innerText();
    await activePage.screenshot({path:path.join(stimuli,'verification/capture-failure.png')});
  }
  writeFileSync(path.join(stimuli,'verification/capture-failure.json'),JSON.stringify(failure,null,2)+'\n');
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
