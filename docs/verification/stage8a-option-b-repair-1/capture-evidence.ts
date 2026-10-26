/**
 * Repair-1 engineering evidence for the Stage 8A card (issue #35, D1/D2).
 * Not a study stimulus. Imports the five frozen v1 synthetic exports from the
 * static build in out/ through the real file input, with the frozen clock
 * installed before navigation, waits until no ancestor is mid-fade, and records
 * rendered geometry (Range line boxes, not scrollWidth), computed type and
 * composited contrast. No CSS or DOM is injected except the root font size.
 *
 *   npm run build && TZ=UTC npx tsx docs/verification/stage8a-option-b-repair-1/capture-evidence.ts
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { chromium, type Browser, type BrowserContextOptions } from "@playwright/test"

const ROOT = process.cwd()
const FIXTURES = path.join(ROOT, "tests", "viewport", "fixtures", "stage8a-v1")
const OUT = path.join(ROOT, "docs", "verification", "stage8a-option-b-repair-1", "screenshots")
const BASE_URL = "http://127.0.0.1:4319/"
const CARD = 'section[aria-label="Relationship read"]'
const CARDS: Array<{ id: string; frozenNowMs: number }> = JSON.parse(readFileSync(path.join(FIXTURES, "cards.json"), "utf8"))

// Passed as source text so tsx's helpers never leak into the page.
const MEASURE = `(() => {
  const card = document.querySelector('${CARD}')
  const main = card.closest('main')
  const r = (b) => ({ left: b.left, top: b.top, right: b.right, bottom: b.bottom })
  const rgba = (v) => { const [r, g, b, a = 1] = (v.match(/[\\d.]+/g) ?? []).map(Number); return [r, g, b, a] }
  const over = (t, u) => [0, 1, 2].map((i) => t[i] * t[3] + u[i] * (1 - t[3]))
  const lum = (c) => { const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const bgOf = (el) => { const layers = []; for (let n = el; n; n = n.parentElement) layers.push(rgba(getComputedStyle(n).backgroundColor)); let base = [255, 255, 255]; for (const l of layers.reverse()) base = over(l, base); return base }
  const cs = getComputedStyle(card), box = card.getBoundingClientRect()
  const content = { left: box.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft), right: box.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight) }
  const rows = [], escapes = []
  for (const el of card.querySelectorAll('*')) {
    const rects = [el.getBoundingClientRect()]
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
    for (const n of texts) { const range = document.createRange(); range.selectNodeContents(n); rects.push(...range.getClientRects()) }
    for (const b of rects) if ((b.width || b.height) && (b.left < content.left - 0.5 || b.right > content.right + 0.5)) escapes.push(el.tagName + ' ' + el.textContent.trim().slice(0, 24) + ' x' + b.left + '..' + b.right)
    const text = texts.map((n) => n.textContent).join('').trim()
    if (!text) continue
    const s = getComputedStyle(el), bg = bgOf(el), fg = over(rgba(s.color), bg)
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x)
    const range = document.createRange(); range.selectNodeContents(el); const lines = [...range.getClientRects()]
    rows.push({ text: text.slice(0, 48), tag: el.tagName.toLowerCase(), fontSizePx: parseFloat(s.fontSize), lineHeightPx: parseFloat(s.lineHeight), fontWeight: s.fontWeight, color: s.color, background: 'rgb(' + bg.map(Math.round).join(', ') + ')', contrast: Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100, box: r(el.getBoundingClientRect()), lines: lines.length, maxTextRight: Math.max(...lines.map((l) => l.right)) })
  }
  const header = [...card.firstElementChild.children].map((c) => r(c.getBoundingClientRect()))
  const overlaps = header.flatMap((a, i) => header.slice(i + 1).filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).map(() => i))
  const lim = card.querySelector(':scope > p:last-of-type'), link = card.querySelector('a')
  const range = document.createRange(); range.selectNodeContents(lim); const limLines = [...range.getClientRects()]
  const m = main.getBoundingClientRect()
  return {
    viewport: { width: innerWidth, height: innerHeight }, rootFontSize: getComputedStyle(document.documentElement).fontSize, mainScrollTop: main.scrollTop,
    main: r(m), card: r(box), content, header, headerOverlaps: overlaps, escapes,
    firstFrame: { limitationLastLineBottom: limLines[limLines.length - 1].bottom, limitationClearance: m.bottom - limLines[limLines.length - 1].bottom, limitationWhollyVisible: limLines[limLines.length - 1].bottom <= m.bottom, link: r(link.getBoundingClientRect()), linkWhollyVisible: link.getBoundingClientRect().bottom <= m.bottom, cardWhollyVisible: box.bottom <= m.bottom },
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    minContrast: Math.min(...rows.map((x) => x.contrast)), rows,
  }
})()`

type View = BrowserContextOptions & { rootFontSize?: string; kind: "first-frame" | "complete-card" }
const phone = { deviceScaleFactor: 1, isMobile: true, hasTouch: true }
// first-frame: the honest in-app first screen, unscrolled, clipped to the app
// shell (desktop) or the viewport (phone). complete-card: the viewport is grown
// until <main> holds the whole card, so the bottom nav never paints over it.
const VIEWS: Record<string, View> = {
  "desktop-1280x1000": { kind: "first-frame", viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 },
  "mobile-390x844": { kind: "first-frame", viewport: { width: 390, height: 844 }, ...phone },
  "text200-320x844": { kind: "first-frame", viewport: { width: 320, height: 844 }, ...phone, rootFontSize: "200%" },
  // 384 CSS px window: the same 344px-wide card as the desktop shell, at DPR 1.
  "whole-384x1800": { kind: "complete-card", viewport: { width: 384, height: 1800 }, deviceScaleFactor: 1 },
  "card-390": { kind: "complete-card", viewport: { width: 390, height: 844 }, ...phone },
  "reflow-320": { kind: "complete-card", viewport: { width: 320, height: 640 }, ...phone },
  "text200-390": { kind: "complete-card", viewport: { width: 390, height: 844 }, ...phone, rootFontSize: "200%" },
  "text200-320": { kind: "complete-card", viewport: { width: 320, height: 640 }, ...phone, rootFontSize: "200%" },
  "dark-pref-390": { kind: "complete-card", viewport: { width: 390, height: 844 }, ...phone, colorScheme: "dark" },
}

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex")

async function main() {
  assert.equal(new Date(2026, 0, 5).getTimezoneOffset(), 0, "run with TZ=UTC")
  mkdirSync(OUT, { recursive: true })
  const server = spawn(process.execPath, [path.join(ROOT, "node_modules", "http-server", "bin", "http-server"), "out", "-p", "4319", "-a", "127.0.0.1", "-c-1", "--silent"], { cwd: ROOT, stdio: "ignore" })
  let browser: Browser | null = null
  const results: Record<string, unknown> = {}
  const screenshots: Record<string, string> = {}
  try {
    for (let i = 0; i < 100; i += 1) {
      if (await fetch(BASE_URL).then((r) => r.ok, () => false)) break
      await new Promise((r) => setTimeout(r, 200))
    }
    browser = await chromium.launch()
    for (const card of CARDS) {
      const innerTextV1 = readFileSync(path.join(FIXTURES, `${card.id}.card.innerText.txt`), "utf8")
      for (const [view, { rootFontSize, kind, ...options }] of Object.entries(VIEWS)) {
        const label = `${card.id} ${view}`
        const context = await browser.newContext({ ...options, locale: "en-US", timezoneId: "UTC", colorScheme: options.colorScheme ?? "light" })
        const page = await context.newPage()
        await page.clock.setFixedTime(card.frozenNowMs)
        await page.goto(BASE_URL)
        await page.getByText("Choose WhatsApp export").waitFor()
        assert.equal(await page.evaluate(() => Date.now()), card.frozenNowMs)
        await page.locator("input[type=file]").setInputFiles({ name: "WhatsApp Chat with Synthetic Example.txt", mimeType: "text/plain", buffer: readFileSync(path.join(FIXTURES, `${card.id}.txt`)) })
        const section = page.locator(CARD)
        await section.waitFor({ state: "visible", timeout: 30_000 })
        await page.evaluate(() => document.fonts.ready)
        if (rootFontSize) await page.evaluate(`document.documentElement.style.fontSize = '${rootFontSize}'`)
        // The import view fades in; never measure or capture mid-fade.
        await page.waitForFunction(`(() => { for (let n = document.querySelector('${CARD}'); n; n = n.parentElement) if (getComputedStyle(n).opacity !== '1') return false; return true })()`)
        await page.waitForTimeout(300)
        assert.equal(await section.innerText(), innerTextV1, `${label}: card text differs from frozen v1`)
        assert.equal(await section.getByRole("link").getAttribute("href"), "#narrative-heading")
        if (kind === "complete-card") {
          const { width, height } = page.viewportSize()!
          const cardHeight = await section.evaluate((s) => s.getBoundingClientRect().height)
          await page.setViewportSize({ width, height: Math.max(height, Math.ceil(cardHeight) + 400) })
          await page.waitForTimeout(300)
        }
        const m = (await page.evaluate(MEASURE)) as { mainScrollTop: number; escapes: string[]; headerOverlaps: number[]; overflowX: number; minContrast: number; firstFrame: { cardWhollyVisible: boolean } }
        assert.equal(m.mainScrollTop, 0, `${label}: scrolled`)
        assert.deepEqual(m.escapes, [], `${label}: escapes card content box`)
        assert.deepEqual(m.headerOverlaps, [], `${label}: header overlap`)
        assert.ok(m.overflowX <= 0, `${label}: horizontal overflow`)
        assert.ok(m.minContrast >= 4.5, `${label}: contrast`)
        if (kind === "complete-card") assert.ok(m.firstFrame.cardWhollyVisible, `${label}: complete-card view does not hold the whole card`)
        results[`${card.id}.${view}`] = { kind, ...m }
        const file = `${card.id}.${view}.${kind}.png`
        if (kind === "first-frame") {
          const clip = view.startsWith("desktop")
            ? ((await page.locator("main").evaluate((main) => main.parentElement!.getBoundingClientRect().toJSON())) as { x: number; y: number; width: number; height: number })
            : undefined
          await page.screenshot({ path: path.join(OUT, file), clip, animations: "disabled" })
        } else {
          await section.screenshot({ path: path.join(OUT, file), animations: "disabled" })
        }
        screenshots[file] = sha256(path.join(OUT, file))
        await context.close()
      }
      console.log(`${card.id}: captured ${Object.keys(VIEWS).length} views, innerText == v1, no escapes/overlaps, contrast >= 4.5`)
    }
    writeFileSync(path.join(OUT, "..", "measurements.json"), JSON.stringify({ browser: `chromium ${browser.version()}`, results, screenshots }, null, 1) + "\n")
  } finally {
    await browser?.close()
    server.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
