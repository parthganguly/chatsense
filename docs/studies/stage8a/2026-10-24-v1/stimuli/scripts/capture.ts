/**
 * Stage 8A study stimuli: capture the five hero cards from the real static
 * production build (out/) through the real file input.
 *
 * Prerequisites (repo root): npm ci --ignore-scripts && npm run build, then
 *   TZ=UTC npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/generate-fixtures.ts
 *   TZ=UTC npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/capture.ts
 *
 * No product code is modified or mocked. The only browser-side intervention
 * is Playwright's clock.setFixedTime (installed before the page loads, so the
 * import's Date.now() is the frozen value) plus locale/timezone/viewport.
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type BrowserContextOptions, type Page } from "@playwright/test"
import type { RelationshipRead } from "@chatsense/core"

const ROOT = process.cwd()
const STIMULI = path.join(ROOT, "docs", "studies", "stage8a", "2026-10-24-v1", "stimuli")
const PORT = 4319
const BASE_URL = `http://127.0.0.1:${PORT}/`
const ROUTE = "/"
const UPLOAD_NAME = "WhatsApp Chat with Synthetic Example.txt"
const LOCALE = "en-US"
const TIMEZONE = "UTC"
const CARD_SELECTOR = 'section[aria-label="Relationship read"]'

const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  // Same CSS layout as desktop, rendered at 2x for HiDPI study displays.
  desktop2x: { viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
} satisfies Record<string, BrowserContextOptions>

interface CardIndexEntry {
  id: string
  card: number
  expectedState: string
  fixture: string
  frozenNowMs: number
  expectedRead: string
}

const logLines: string[] = []
function log(line: string) {
  logLines.push(line)
  console.log(line)
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if ((await fetch(BASE_URL)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error("static server did not start")
}

/** Every product string the card must show, in render order. */
function expectedPieces(read: RelationshipRead): string[] {
  return [
    read.confidenceLabel,
    read.headline,
    read.summary,
    ...read.evidence,
    ...(read.historicalNote ? [read.historicalNote] : []),
    ...(read.stalenessNote ? [read.stalenessNote] : []),
    read.limitation,
  ]
}

const numbersIn = (text: string) => (text.match(/\d+(?:\.\d+)?/g) ?? []).sort()

async function importCard(browser: Browser, kind: keyof typeof VIEWPORTS, card: CardIndexEntry): Promise<Page> {
  const context = await browser.newContext({ ...VIEWPORTS[kind], locale: LOCALE, timezoneId: TIMEZONE, colorScheme: "light" })
  const page = await context.newPage()
  await page.clock.setFixedTime(card.frozenNowMs)
  await page.goto(ROUTE === "/" ? BASE_URL : new URL(ROUTE, BASE_URL).toString())
  await page.getByText("Choose WhatsApp export").waitFor()
  assert.equal(await page.evaluate(() => Date.now()), card.frozenNowMs, "frozen clock not active before import")
  await page.locator("input[type=file]").setInputFiles({
    name: UPLOAD_NAME,
    mimeType: "text/plain",
    buffer: readFileSync(path.join(STIMULI, card.fixture)),
  })
  await page.locator(CARD_SELECTOR).waitFor({ state: "visible", timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(800)
  return page
}

async function contrastReport(page: Page) {
  // Passed as source text: tsx injects __name() helpers into nested functions,
  // which do not exist in the page.
  return page.evaluate(`((section) => {
    const parse = (value) => (value.match(/[0-9.]+/g) ?? []).map(Number)
    const luminance = ([r, g, b]) => {
      const channel = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }
    const background = (element) => {
      for (let node = element; node; node = node.parentElement) {
        const rgba = parse(getComputedStyle(node).backgroundColor)
        if (rgba.length >= 3 && (rgba.length === 3 || rgba[3] > 0)) return rgba.slice(0, 3)
      }
      return [255, 255, 255]
    }
    const rows = []
    for (const element of section.querySelectorAll("p, h1, span, a")) {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim()
      if (!ownText) continue
      const style = getComputedStyle(element)
      const fg = luminance(parse(style.color).slice(0, 3))
      const bg = luminance(background(element))
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
      rows.push({
        text: ownText.slice(0, 60),
        color: style.color,
        background: "rgb(" + background(element).join(", ") + ")",
        fontSizePx: parseFloat(style.fontSize),
        fontWeight: style.fontWeight,
        contrastRatio: Math.round(ratio * 100) / 100,
      })
    }
    return rows
  })(document.querySelector('${CARD_SELECTOR}'))`) as Promise<Array<Record<string, string | number>>>
}

async function main() {
  assert.equal(new Date(2026, 0, 5).getTimezoneOffset(), 0, "run with TZ=UTC")
  const cards: CardIndexEntry[] = JSON.parse(readFileSync(path.join(STIMULI, "expected", "cards.json"), "utf8"))
  const server = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules", "http-server", "bin", "http-server"), "out", "-p", String(PORT), "-a", "127.0.0.1", "-c-1", "--silent"],
    { cwd: ROOT, stdio: "ignore" },
  )
  let browser: Browser | null = null
  const results = []
  try {
    await waitForServer()
    browser = await chromium.launch()
    log(`browser ${browser.version()} serving out/ at ${BASE_URL}`)

    for (const card of cards) {
      const read: RelationshipRead = JSON.parse(readFileSync(path.join(STIMULI, card.expectedRead), "utf8"))
      const prefix = `captures/${card.id}`
      const out = (suffix: string) => path.join(STIMULI, `${prefix}${suffix}`)

      // --- Mobile 390x844: card, first screen, full page, DOM.
      const mobile = await importCard(browser, "mobile", card)
      assert.equal(await mobile.locator(CARD_SELECTOR).count(), 1, "exactly one hero card")
      const section = mobile.locator(CARD_SELECTOR)
      const innerText = await section.innerText()
      const outerHtml = await section.evaluate((element) => element.outerHTML)
      const stateMarker = await section.getAttribute("class")
      const computedBorder = await section.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          top: `${style.borderTopWidth} ${style.borderTopColor}`,
          right: `${style.borderRightWidth} ${style.borderRightColor}`,
          bottom: `${style.borderBottomWidth} ${style.borderBottomColor}`,
          left: `${style.borderLeftWidth} ${style.borderLeftColor}`,
        }
      })
      await section.screenshot({ path: out(".mobile-390x844.card.png"), animations: "disabled" })
      await mobile.evaluate(() => window.scrollTo(0, 0))
      await mobile.screenshot({ path: out(".mobile-390x844.first-screen.png"), animations: "disabled" })
      const mobileBox = await section.boundingBox()
      const contrast = await contrastReport(mobile)
      // The app scrolls inside <main>, so fullPage screenshots equal the
      // viewport. For whole-page context, grow only the viewport height until
      // <main> no longer scrolls (width stays 390), then capture natively.
      const fullHeight = await mobile.evaluate(() => {
        const main = document.querySelector("main")!
        return document.documentElement.clientHeight - main.clientHeight + main.scrollHeight
      })
      await mobile.setViewportSize({ width: 390, height: fullHeight })
      await mobile.waitForTimeout(300)
      await mobile.screenshot({ path: out(`.mobile-390x${fullHeight}.full-page.png`), animations: "disabled" })
      const headerText = await mobile.locator("header").first().innerText().catch(() => "")
      await mobile.context().close()

      // --- Desktop 1280x1000 at DPR 1: single-frame study presentation.
      const desktop = await importCard(browser, "desktop", card)
      const desktopSection = desktop.locator(CARD_SELECTOR)
      const desktopText = await desktopSection.innerText()
      await desktop.evaluate(() => window.scrollTo(0, 0))
      const desktopBox = await desktopSection.boundingBox()
      await desktopSection.screenshot({ path: out(".desktop-1280x1000.card.png"), animations: "disabled" })
      await desktop.screenshot({ path: out(".desktop-1280x1000.first-screen.png"), animations: "disabled" })
      await desktop.context().close()

      const desktop2x = await importCard(browser, "desktop2x", card)
      assert.equal(await desktop2x.locator(CARD_SELECTOR).innerText(), innerText, `${card.id}: 2x text differs`)
      await desktop2x.locator(CARD_SELECTOR).screenshot({ path: out(".desktop-1280x1000@2x.card.png"), animations: "disabled" })
      await desktop2x.context().close()

      writeFileSync(out(".card.innerText.txt"), innerText)
      writeFileSync(out(".card.outerHTML.html"), outerHtml)

      // --- Assertions: rendered text equals the core's computed read.
      let cursor = 0
      for (const piece of expectedPieces(read)) {
        const at = innerText.indexOf(piece, cursor)
        assert.ok(at >= 0, `${card.id}: missing or out of order: ${piece}`)
        cursor = at + piece.length
      }
      assert.deepEqual(numbersIn(innerText), numbersIn(expectedPieces(read).join("\n")), `${card.id}: quantities differ`)
      assert.equal(desktopText, innerText, `${card.id}: desktop and mobile card text differ`)
      assert.ok(innerText.includes("Counted in this export"))
      assert.ok(/See the evidence in /.test(innerText), `${card.id}: evidence link missing`)
      assert.ok(desktopBox && desktopBox.y >= 0 && desktopBox.y + desktopBox.height <= 1000, `${card.id}: desktop card not fully in first frame`)

      const mobileFits = !!mobileBox && mobileBox.y >= 0 && mobileBox.y + mobileBox.height <= 844
      log(
        `${card.id}: state=${read.state} label=${read.confidenceLabel} text-match=ok numbers=${numbersIn(innerText).length} ` +
          `mobileCard=${Math.round(mobileBox!.y)}..${Math.round(mobileBox!.y + mobileBox!.height)} fitsFirstScreen=${mobileFits} ` +
          `desktopCard=${Math.round(desktopBox!.y)}..${Math.round(desktopBox!.y + desktopBox!.height)}`,
      )
      results.push({
        id: card.id,
        sectionClass: stateMarker,
        computedBorder,
        headerText,
        mobileCardBox: mobileBox,
        mobileCardFitsFirstScreen: mobileFits,
        mobileFullPageViewport: { width: 390, height: fullHeight },
        desktopCardBox: desktopBox,
        contrast,
        textAssertions: "pass",
      })
    }

    writeFileSync(
      path.join(STIMULI, "verification", "capture-run.json"),
      JSON.stringify(
        {
          captureTimestamp: new Date().toISOString(),
          browser: `chromium ${browser.version()} (headless shell)`,
          playwright: JSON.parse(readFileSync(path.join(ROOT, "node_modules", "@playwright", "test", "package.json"), "utf8")).version,
          baseUrl: BASE_URL,
          route: ROUTE,
          importPath: `real <input type=file> on the import screen via Playwright locator.setInputFiles (file name "${UPLOAD_NAME}", bytes = fixture file) -> readWhatsAppExport -> analyzeImportedText(text, Date.now()) -> RelationshipReadCard`,
          locale: LOCALE,
          timezone: TIMEZONE,
          viewports: VIEWPORTS,
          colorScheme: "light",
          cards: results,
        },
        null,
        2,
      ) + "\n",
    )
    writeFileSync(path.join(STIMULI, "verification", "capture.log"), logLines.join("\n") + "\n")
  } finally {
    await browser?.close()
    server.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
