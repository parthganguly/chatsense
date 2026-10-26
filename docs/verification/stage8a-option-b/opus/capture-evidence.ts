/**
 * Engineering evidence for the Stage 8A card readability repair (issue #35).
 * Not a study stimulus. Captures the five frozen v1 synthetic cards from the
 * static build in out/ through the real file input with the frozen clock
 * installed before navigation, and records computed type and contrast.
 *
 *   npm run build && TZ=UTC npx tsx docs/verification/stage8a-option-b/opus/capture-evidence.ts <before|after>
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { chromium, type Browser, type BrowserContextOptions } from "@playwright/test"

const phase = process.argv[2]
assert.ok(phase === "before" || phase === "after", "usage: capture-evidence.ts <before|after>")
const ROOT = process.cwd()
const FIXTURES = path.join(ROOT, "tests", "viewport", "fixtures", "stage8a-v1")
const OUT = path.join(ROOT, "docs", "verification", "stage8a-option-b", "opus", phase)
const BASE_URL = "http://127.0.0.1:4319/"
const CARD = 'section[aria-label="Relationship read"]'
const CARDS: Array<{ id: string; frozenNowMs: number }> = JSON.parse(readFileSync(path.join(FIXTURES, "cards.json"), "utf8"))

// Passed as source text so tsx's helpers never leak into the page.
const MEASURE = `(() => {
  const root = document.querySelector('${CARD}')
  const rgba = (v) => { const [r, g, b, a = 1] = (v.match(/[\\d.]+/g) ?? []).map(Number); return [r, g, b, a] }
  const over = (t, u) => [0, 1, 2].map((i) => t[i] * t[3] + u[i] * (1 - t[3]))
  const lum = (c) => { const [r, g, b] = c.map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const bgOf = (el) => { const layers = []; for (let n = el; n; n = n.parentElement) layers.push(rgba(getComputedStyle(n).backgroundColor)); let base = [255, 255, 255]; for (const l of layers.reverse()) base = over(l, base); return base }
  const rows = []
  for (const el of root.querySelectorAll('*')) {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
    if (!text) continue
    const s = getComputedStyle(el), bg = bgOf(el), fg = over(rgba(s.color), bg)
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x)
    rows.push({ text: text.slice(0, 48), tag: el.tagName.toLowerCase(), fontSizePx: parseFloat(s.fontSize), lineHeightPx: parseFloat(s.lineHeight), fontWeight: s.fontWeight, color: s.color, background: 'rgb(' + bg.map(Math.round).join(', ') + ')', contrast: Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100 })
  }
  const s = getComputedStyle(root), box = root.getBoundingClientRect()
  const main = document.querySelector('main').getBoundingClientRect(), limitation = root.querySelector(':scope > p:last-of-type').getBoundingClientRect()
  const firstFrame = { scrollAreaBottom: main.bottom, cardBottom: box.bottom, limitationBottom: limitation.bottom, cardWhollyVisible: box.bottom <= main.bottom, limitationWhollyVisible: limitation.bottom <= main.bottom }
  return { box: { x: box.x, y: box.y, width: box.width, height: box.height }, firstFrame, border: { left: s.borderLeftWidth + ' ' + s.borderLeftColor, top: s.borderTopWidth + ' ' + s.borderTopColor }, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, rows }
})()`

// frame: the honest in-app first screen (desktop clipped to the 384x800 app
// shell). Otherwise the viewport is first grown until the scroll area holds the
// whole card, so card images are never overlaid by the bottom nav.
const VIEWS: Record<string, BrowserContextOptions & { rootFontSize?: string; frame?: boolean }> = {
  "desktop-1280x1000": { viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, frame: true },
  "mobile-390x844": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, frame: true },
  "card-390": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  "reflow-320": { viewport: { width: 320, height: 640 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  "text200-390": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, rootFontSize: "200%" },
  // Browser zoom 200% of a 1280px window lays out like a 640 CSS px viewport at DPR 2.
  "zoom200-equiv-640": { viewport: { width: 640, height: 500 }, deviceScaleFactor: 2 },
  "dark-pref-390": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, colorScheme: "dark" },
}

async function main() {
  assert.equal(new Date(2026, 0, 5).getTimezoneOffset(), 0, "run with TZ=UTC")
  mkdirSync(OUT, { recursive: true })
  const server = spawn(process.execPath, [path.join(ROOT, "node_modules", "http-server", "bin", "http-server"), "out", "-p", "4319", "-a", "127.0.0.1", "-c-1", "--silent"], { cwd: ROOT, stdio: "ignore" })
  let browser: Browser | null = null
  const results: Record<string, unknown> = {}
  try {
    for (let i = 0; i < 100; i += 1) {
      if (await fetch(BASE_URL).then((r) => r.ok, () => false)) break
      await new Promise((r) => setTimeout(r, 200))
    }
    browser = await chromium.launch()
    for (const card of CARDS) {
      const innerTextV1 = readFileSync(path.join(FIXTURES, `${card.id}.card.innerText.txt`), "utf8")
      for (const [view, { rootFontSize, frame, ...options }] of Object.entries(VIEWS)) {
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
        await page.waitForTimeout(300)
        assert.equal(await section.innerText(), innerTextV1, `${card.id} ${view}: card text differs from frozen v1`)
        const m = await page.evaluate(MEASURE)
        results[`${card.id}.${view}`] = m
        if (frame) {
          const shell = (await page.locator("main").evaluate((main) => main.parentElement!.getBoundingClientRect().toJSON())) as { x: number; y: number; width: number; height: number }
          await page.screenshot({ path: path.join(OUT, `${card.id}.${view}.first-frame.png`), clip: shell, animations: "disabled" })
        } else {
          const { width, height } = page.viewportSize()!
          await page.setViewportSize({ width, height: Math.max(height, Math.ceil((m as { box: { height: number } }).box.height) + 400) })
          await page.waitForTimeout(300)
          await section.screenshot({ path: path.join(OUT, `${card.id}.${view}.card.png`), animations: "disabled" })
        }
        await context.close()
      }
      console.log(`${phase} ${card.id}: captured ${Object.keys(VIEWS).length} views, innerText == v1`)
    }
    writeFileSync(path.join(OUT, "measurements.json"), JSON.stringify({ phase, browser: `chromium ${browser.version()}`, results }, null, 1) + "\n")
  } finally {
    await browser?.close()
    server.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
