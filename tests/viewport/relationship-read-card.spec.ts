import { readFileSync } from "node:fs"
import path from "node:path"
import { expect, test, type Locator, type Page } from "@playwright/test"
import type { RelationshipRead } from "@chatsense/core"

// Stage 8A hero-card readability regression. Inputs are byte-for-byte copies of
// the frozen P0 v1 synthetic stimuli (fixtures, expected reads, rendered card
// text); see fixtures/stage8a-v1/README.md. No personal export is involved.
const DIR = path.join(process.cwd(), "tests", "viewport", "fixtures", "stage8a-v1")
const CARD = 'section[aria-label="Relationship read"]'
const CARDS: Array<{ id: string; frozenNowMs: number }> = JSON.parse(readFileSync(path.join(DIR, "cards.json"), "utf8"))
const readOf = (id: string): RelationshipRead =>
  JSON.parse(readFileSync(path.join(DIR, `${id}.relationship-read.json`), "utf8"))

// Body text that carries the read's claim or its limits.
const bodyPieces = (read: RelationshipRead) => [
  read.summary,
  ...read.evidence,
  ...(read.historicalNote ? [read.historicalNote] : []),
  ...(read.stalenessNote ? [read.stalenessNote] : []),
  read.limitation,
]

test.use({ locale: "en-US", timezoneId: "UTC" })

async function importCard(page: Page, card: { id: string; frozenNowMs: number }): Promise<Locator> {
  // Clock is installed before navigation so the import's Date.now() is frozen.
  await page.clock.setFixedTime(card.frozenNowMs)
  await page.goto("/")
  await expect(page.getByText("Choose WhatsApp export")).toBeVisible()
  expect(await page.evaluate(() => Date.now())).toBe(card.frozenNowMs)
  await page.locator("input[type=file]").setInputFiles({
    name: "WhatsApp Chat with Synthetic Example.txt",
    mimeType: "text/plain",
    buffer: readFileSync(path.join(DIR, `${card.id}.txt`)),
  })
  const section = page.locator(CARD)
  await expect(section).toBeVisible({ timeout: 30_000 })
  await page.evaluate(() => document.fonts.ready)
  return section
}

interface TextRow {
  text: string
  tag: string
  fontSize: number
  lineHeight: number
  color: string
  background: string
  contrast: number
  clipped: boolean
}

/**
 * Every text-bearing element in the card with its computed type and its WCAG
 * contrast against the actual composited background (ancestor backgrounds,
 * including translucent ones, blended over the canvas).
 */
function measure(section: Locator): Promise<TextRow[]> {
  return section.evaluate((root) => {
    const rgba = (value: string) => {
      const [r, g, b, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number)
      return [r, g, b, a]
    }
    const over = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]))
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((v) => {
        const s = v / 255
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const canvas = rgba(getComputedStyle(document.documentElement).backgroundColor)
    const backgroundOf = (element: Element) => {
      const layers: number[][] = []
      for (let node: Element | null = element; node; node = node.parentElement) {
        layers.push(rgba(getComputedStyle(node).backgroundColor))
      }
      let base = canvas[3] > 0 ? over(canvas, [255, 255, 255]) : [255, 255, 255]
      for (const layer of layers.reverse()) base = over(layer, base)
      return base
    }
    const rows = []
    for (const element of root.querySelectorAll("*")) {
      const text = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim()
      if (!text) continue
      const style = getComputedStyle(element)
      const bg = backgroundOf(element)
      const fg = over(rgba(style.color), bg)
      const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x)
      rows.push({
        text,
        tag: element.tagName.toLowerCase(),
        fontSize: parseFloat(style.fontSize),
        lineHeight: parseFloat(style.lineHeight),
        color: style.color,
        background: `rgb(${bg.map(Math.round).join(", ")})`,
        contrast: Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100,
        clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
      })
    }
    return rows
  })
}

const rowFor = (rows: TextRow[], text: string) => {
  const row = rows.find((candidate) => candidate.text === text)
  expect(row, `no element renders exactly: ${text}`).toBeDefined()
  return row!
}

function expectReadable(rows: TextRow[], read: RelationshipRead, label: string) {
  for (const row of rows) {
    expect.soft(row.contrast, `${label}: contrast ${row.color} on ${row.background}: ${row.text}`).toBeGreaterThanOrEqual(4.5)
    expect.soft(row.fontSize, `${label}: font size: ${row.text}`).toBeGreaterThanOrEqual(12)
  }
  for (const piece of bodyPieces(read)) {
    const row = rowFor(rows, piece)
    expect.soft(row.fontSize, `${label}: body font size: ${piece}`).toBeGreaterThanOrEqual(14)
    expect.soft(row.lineHeight, `${label}: body line height: ${piece}`).toBeGreaterThanOrEqual(20)
  }
}

async function expectNoHorizontalOverflow(page: Page, section: Locator, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, `${label}: page overflows horizontally`).toBeLessThanOrEqual(0)
  const box = (await section.boundingBox())!
  const width = page.viewportSize()!.width
  expect(box.x, `${label}: card starts off-screen`).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width, `${label}: card cut at right edge`).toBeLessThanOrEqual(width)
  for (const row of await measure(section)) expect.soft(row.clipped, `${label}: clipped text: ${row.text}`).toBe(false)
  await expectInsideCard(section, label)
}

/**
 * Rendered geometry, not scrollWidth: every element box and every text line
 * box (Range rects, so glyphs past an element's edge count) lies inside the
 * card's content box, which lies inside the clipping <main> and the viewport.
 * Header items (eyebrow, confidence pill) must not overlap.
 */
async function expectInsideCard(section: Locator, label: string) {
  const { content, escapes, overlaps } = await section.evaluate((card) => {
    const style = getComputedStyle(card)
    const box = card.getBoundingClientRect()
    const main = card.closest("main")!.getBoundingClientRect()
    const content = {
      left: box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft),
      right: box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight),
    }
    const describe = (rect: DOMRect, what: string) => `${what} x${rect.left.toFixed(2)}..${rect.right.toFixed(2)}`
    const escapes: string[] = []
    if (content.left < Math.max(main.left, 0) || content.right > Math.min(main.right, window.innerWidth)) {
      escapes.push(`content box ${content.left}..${content.right} outside main/viewport`)
    }
    for (const element of card.querySelectorAll("*")) {
      const rects = [element.getBoundingClientRect()]
      for (const node of element.childNodes) {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        rects.push(...range.getClientRects())
      }
      for (const rect of rects) {
        if (rect.width === 0 && rect.height === 0) continue
        if (rect.left < content.left - 0.5 || rect.right > content.right + 0.5) {
          escapes.push(describe(rect, `${element.tagName.toLowerCase()} "${element.textContent?.trim().slice(0, 24)}"`))
        }
      }
    }
    const header = [...card.firstElementChild!.children].map((child) => child.getBoundingClientRect())
    const overlaps = header.flatMap((a, i) =>
      header
        .slice(i + 1)
        .filter((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
        .map((b) => `${describe(a, "header item")} overlaps ${describe(b, "header item")}`),
    )
    return { content, escapes, overlaps }
  })
  expect.soft(escapes, `${label}: escapes card content box ${content.left}..${content.right}`).toEqual([])
  expect.soft(overlaps, `${label}: header items overlap`).toEqual([])
}

/**
 * Limitation and link must be reachable by scrolling: their first and last
 * lines can each be brought on screen and are not hidden under fixed UI. (At
 * 200% text a limitation can be taller than the scroll area on its own.)
 */
async function expectEndReachable(page: Page, section: Locator, read: RelationshipRead, label: string) {
  for (const target of [section.getByText(read.limitation, { exact: true }), section.getByRole("link")]) {
    for (const block of ["start", "end"] as const) {
      const visible = await target.evaluate((element, edge) => {
        element.scrollIntoView({ block: edge })
        const rect = element.getBoundingClientRect()
        const y = edge === "start" ? rect.top + 2 : rect.bottom - 2
        if (y < 0 || y > window.innerHeight) return false
        const hit = document.elementFromPoint(rect.left + Math.min(rect.width / 2, 20), y)
        return hit !== null && element.contains(hit)
      }, block)
      expect(visible, `${label}: ${block} of "${(await target.textContent())?.slice(0, 30)}" not reachable or covered`).toBe(true)
    }
  }
}

for (const card of CARDS) {
  const read = readOf(card.id)

  test(`${card.id}: frozen text renders verbatim and every line is readable`, async ({ page }) => {
    const section = await importCard(page, card)
    const label = `${card.id} @${page.viewportSize()!.width}px`

    // Scientific copy is untouched: the card's text equals the frozen v1 capture.
    expect(await section.innerText()).toBe(readFileSync(path.join(DIR, `${card.id}.card.innerText.txt`), "utf8"))
    const rows = await measure(section)
    rowFor(rows, read.headline)
    rowFor(rows, read.confidenceLabel)
    await expect(section.getByRole("link")).toHaveAttribute("href", "#narrative-heading")

    expectReadable(rows, read, label)
    await expectNoHorizontalOverflow(page, section, label)
    await expectEndReachable(page, section, read, label)

    // WCAG 1.4.10: 320 CSS px reflow without horizontal clipping.
    await page.setViewportSize({ width: 320, height: 640 })
    await expectNoHorizontalOverflow(page, section, `${card.id} @320px`)
    await expectEndReachable(page, section, read, `${card.id} @320px`)
  })

  test(`${card.id}: 200% text size doubles every line without loss`, async ({ page }) => {
    const section = await importCard(page, card)
    const before = await measure(section)
    // Text-only enlargement (WCAG 1.4.4): raise the root font size. Device
    // pixel ratio alone is not text zoom; px-sized text would not grow here.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%"
    })
    const after = await measure(section)
    expect(after.map((row) => row.text)).toEqual(before.map((row) => row.text))
    after.forEach((row, index) => {
      expect.soft(row.fontSize, `did not double: ${row.text}`).toBeCloseTo(before[index].fontSize * 2, 0)
    })
    expect(await section.innerText()).toBe(readFileSync(path.join(DIR, `${card.id}.card.innerText.txt`), "utf8"))
    await expectNoHorizontalOverflow(page, section, `${card.id} 200% text`)
    await expectEndReachable(page, section, read, `${card.id} 200% text`)

    // Both at once: 320 CSS px reflow with 200% text.
    await page.setViewportSize({ width: 320, height: 640 })
    expect(await section.innerText()).toBe(readFileSync(path.join(DIR, `${card.id}.card.innerText.txt`), "utf8"))
    await expectNoHorizontalOverflow(page, section, `${card.id} 320px + 200% text`)
    await expectEndReachable(page, section, read, `${card.id} 320px + 200% text`)
  })
}

test.describe("single-viewport checks", () => {
  test.skip(({ viewport }) => viewport?.width !== 390, "viewport-independent; run once (phone-390x844)")

  test("desktop 1280x1000: readable, end reachable, card within an 800px display", async ({ browser }) => {
    for (const card of CARDS) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
        deviceScaleFactor: 1,
        locale: "en-US",
        timezoneId: "UTC",
      })
      const page = await context.newPage()
      const section = await importCard(page, card)
      const read = readOf(card.id)
      expectReadable(await measure(section), read, `${card.id} desktop`)
      await expectNoHorizontalOverflow(page, section, `${card.id} desktop`)
      // First frame, no scrolling: the card from its top through the last line
      // of the limitation is inside the shell's scroll area with clearance
      // above the nav, and that last line is actually painted (not covered).
      // The details link below it may need a scroll (reported, not asserted).
      const frame = await section.getByText(read.limitation, { exact: true }).evaluate((element) => {
        const main = element.closest("main")!
        const range = document.createRange()
        range.selectNodeContents(element)
        const lines = [...range.getClientRects()]
        const last = lines[lines.length - 1]
        const hit = document.elementFromPoint(last.left + 4, last.top + last.height / 2)
        return {
          scrollTop: main.scrollTop,
          mainTop: main.getBoundingClientRect().top,
          mainBottom: main.getBoundingClientRect().bottom,
          cardTop: element.parentElement!.getBoundingClientRect().top,
          lastLineBottom: last.bottom,
          lastLinePainted: hit !== null && element.contains(hit),
        }
      })
      expect(frame.scrollTop).toBe(0)
      expect(frame.cardTop, `${card.id}: card top above scroll area`).toBeGreaterThanOrEqual(frame.mainTop)
      expect
        .soft(frame.lastLineBottom + 8, `${card.id}: limitation's last line (bottom ${frame.lastLineBottom}) not 8px clear of nav at ${frame.mainBottom}`)
        .toBeLessThanOrEqual(frame.mainBottom)
      expect.soft(frame.lastLinePainted, `${card.id}: limitation's last line covered`).toBe(true)
      // A whole-card stimulus image must still fit an 800px display.
      expect((await section.boundingBox())!.height, `${card.id}: card taller than 800px`).toBeLessThanOrEqual(800)
      await expectEndReachable(page, section, read, `${card.id} desktop`)
      await context.close()
    }
  })

  test("OS dark preference keeps every line readable", async ({ browser }) => {
    for (const card of CARDS) {
      const context = await browser.newContext({ colorScheme: "dark", locale: "en-US", timezoneId: "UTC" })
      const page = await context.newPage()
      const section = await importCard(page, card)
      expectReadable(await measure(section), readOf(card.id), `${card.id} dark`)
      await context.close()
    }
  })

  test("longest card with an over-long limitation still wraps at 320px (test-DOM counterexample)", async ({ page }) => {
    const card = CARDS.find((candidate) => candidate.id === "s8a-v1-c4-unusual-silence")!
    const read = readOf(card.id)
    const section = await importCard(page, card)
    await page.setViewportSize({ width: 320, height: 640 })
    // Stress input exists only in this test's DOM: every frozen limitation
    // joined, plus a 120-character token with no break opportunity at all.
    // Never shipped, never a study stimulus.
    const long = [...CARDS.map((entry) => readOf(entry.id).limitation), "W".repeat(120)].join(" ")
    await section.getByText(read.limitation, { exact: true }).evaluate((element, text) => {
      element.textContent = text
    }, long)
    const rows = await measure(section)
    expect(rowFor(rows, long).fontSize).toBeGreaterThanOrEqual(14)
    await expectNoHorizontalOverflow(page, section, "long limitation @320px")
    await expectEndReachable(page, section, { ...read, limitation: long }, "long limitation @320px")

    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%"
    })
    expect(rowFor(await measure(section), long).fontSize).toBeGreaterThanOrEqual(28)
    await expectNoHorizontalOverflow(page, section, "long limitation @320px + 200% text")
    await expectEndReachable(page, section, { ...read, limitation: long }, "long limitation @320px + 200% text")
  })

  test("keyboard reaches the details link with a visible focus ring and it activates", async ({ page }) => {
    const card = CARDS[0]
    const section = await importCard(page, card)
    const link = section.getByRole("link")
    for (let presses = 0; presses < 40; presses += 1) {
      await page.keyboard.press("Tab")
      if (await link.evaluate((element) => element === document.activeElement)) break
    }
    await expect(link).toBeFocused()
    const ring = await link.evaluate((element) => {
      const style = getComputedStyle(element)
      return { matches: element.matches(":focus-visible"), style: style.outlineStyle, width: parseFloat(style.outlineWidth) }
    })
    expect(ring.matches).toBe(true)
    expect(ring.style).not.toBe("none")
    expect(ring.width).toBeGreaterThan(0)

    await page.keyboard.press("Shift+Tab")
    await expect(link).not.toBeFocused()
    await page.keyboard.press("Tab")
    await expect(link).toBeFocused()

    await page.keyboard.press("Enter")
    await expect.poll(() => page.evaluate(() => location.hash)).toBe("#narrative-heading")
    await expect(page.locator("#narrative-heading")).toBeInViewport()
  })
})
