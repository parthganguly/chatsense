import { readFileSync } from "node:fs"
import path from "node:path"
import { expect, test, type Page } from "@playwright/test"

// R2 #44 report-shell regression: evidence routing + focus, per-tab scroll,
// roving tabs, 320px/200% reflow, Clear chat, import errors, warm-share banner.
// Inputs are the committed synthetic Stage 8A stimuli; no personal export.
const DIR = path.join(process.cwd(), "tests", "viewport", "fixtures", "stage8a-v1")
const TABS = ["Overview", "Changes", "Rhythm", "People"] as const
const CARDS = [
  { id: "s8a-v1-c1-pattern-change", frozenNowMs: 1778182200000, label: "the Changes tab", tab: "Changes", heading: "changes-narrative-heading" },
  { id: "s8a-v1-c4-unusual-silence", frozenNowMs: 0, label: "the Rhythm tab", tab: "Rhythm", heading: "rhythm-narrative-heading" },
  { id: "s8a-v1-c2-carried-balanced", frozenNowMs: 0, label: "the People tab", tab: "People", heading: "people-narrative-heading" },
  { id: "s8a-v1-c5-insufficient", frozenNowMs: 0, label: "the summary below", tab: "Overview", heading: "narrative-heading" },
]
for (const card of CARDS) {
  const meta = JSON.parse(readFileSync(path.join(DIR, "cards.json"), "utf8")).find((c: { id: string }) => c.id === card.id)
  card.frozenNowMs = meta.frozenNowMs
}

test.use({ locale: "en-US", timezoneId: "UTC" })

const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true })
const scrollTop = (page: Page) => page.evaluate(() => document.querySelector('[role="tabpanel"]')!.scrollTop)
const setScroll = (page: Page, top: number) =>
  page.evaluate((value) => {
    document.querySelector('[role="tabpanel"]')!.scrollTop = value
  }, top)
const activeId = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "")

async function importCard(page: Page, card: { id: string; frozenNowMs: number }) {
  await page.clock.setFixedTime(card.frozenNowMs)
  await page.goto("/")
  await page.locator("input[type=file]").setInputFiles({
    name: "WhatsApp Chat with Synthetic Example.txt",
    mimeType: "text/plain",
    buffer: readFileSync(path.join(DIR, `${card.id}.txt`)),
  })
  await expect(page.locator('section[aria-label="Relationship read"]')).toBeVisible({ timeout: 30_000 })
}

for (const card of CARDS) {
  test(`${card.id}: evidence button opens ${card.tab} evidence with focus`, async ({ page }) => {
    await importCard(page, card)
    // Leave a stale offset on the destination tab; the jump must not restore it.
    if (card.tab !== "Overview") {
      await tab(page, card.tab).click()
      await setScroll(page, 100000)
      await tab(page, "Overview").click()
    } else {
      await setScroll(page, 100000)
    }

    const button = page.getByRole("button", { name: `See the evidence in ${card.label}` })
    await expect(page.getByRole("link", { name: /See the evidence/ })).toHaveCount(0)
    await button.click()

    await expect(tab(page, card.tab)).toHaveAttribute("aria-selected", "true")
    expect(await activeId(page)).toBe(card.heading)
    const heading = page.locator(`#${card.heading}`)
    await expect(heading).toBeInViewport()
    const fits = await heading.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const main = document.querySelector('[role="tabpanel"]')!.getBoundingClientRect()
      return rect.top >= main.top - 1 && rect.bottom <= main.bottom + 1
    })
    expect(fits, "heading sits inside the scroll area").toBe(true)
    expect(await heading.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none")
    if (card.tab !== "Overview") {
      expect(await scrollTop(page), "destination offset was reset, not restored").toBeLessThan(2000)
    }
  })
}

test("each tab keeps its own scroll offset and starts at 0", async ({ page }) => {
  await importCard(page, CARDS[0])
  await setScroll(page, 600)
  const overviewTop = await scrollTop(page)
  expect(overviewTop).toBeGreaterThan(300)

  for (const name of ["Changes", "Rhythm", "People"]) {
    await tab(page, name).click()
    expect(await scrollTop(page), `${name} inherited Overview's offset`).toBe(0)
  }
  await tab(page, "Changes").click()
  await setScroll(page, 300)
  await tab(page, "Overview").click()
  expect(Math.abs((await scrollTop(page)) - overviewTop)).toBeLessThanOrEqual(1)
  await tab(page, "Changes").click()
  expect(Math.abs((await scrollTop(page)) - 300)).toBeLessThanOrEqual(1)

  await page.getByRole("button", { name: "Clear chat and return to import" }).click()
  await page.locator("input[type=file]").setInputFiles(path.join(DIR, `${CARDS[0].id}.txt`))
  await expect(tab(page, "Overview")).toBeVisible({ timeout: 30_000 })
  expect(await scrollTop(page)).toBe(0)
  for (const name of ["Changes", "Rhythm", "People"]) {
    await tab(page, name).click()
    expect(await scrollTop(page), `${name} kept an offset across Clear chat`).toBe(0)
  }
})

test("tabs use roving tabindex and keyboard navigation", async ({ page }) => {
  await importCard(page, CARDS[0])
  const tabs = page.getByRole("tablist").getByRole("tab")
  await expect(tabs).toHaveText(TABS as unknown as string[])
  await expect(page.getByRole("tabpanel")).toBeVisible()
  await expect(tab(page, "Overview")).toHaveAttribute("tabindex", "0")
  await expect(tab(page, "Changes")).toHaveAttribute("tabindex", "-1")

  await tab(page, "Overview").focus()
  await page.keyboard.press("ArrowRight")
  await expect(tab(page, "Changes")).toBeFocused()
  await expect(tab(page, "Changes")).toHaveAttribute("tabindex", "0")
  await expect(tab(page, "Overview")).toHaveAttribute("tabindex", "-1")
  await expect(tab(page, "Overview")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Enter")
  await expect(tab(page, "Changes")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("End")
  await expect(tab(page, "People")).toBeFocused()
  await page.keyboard.press("ArrowRight")
  await expect(tab(page, "Overview")).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await expect(tab(page, "People")).toBeFocused()
  await page.keyboard.press("Space")
  await expect(tab(page, "People")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Home")
  await expect(tab(page, "Overview")).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(tab(page, "Overview")).toHaveAttribute("aria-selected", "true")

  // Focus is not trapped: Tab from the selected tab enters the focusable active panel,
  // and Shift+Tab returns to the selected tab, then leaves the tablist backward.
  await page.keyboard.press("Tab")
  await expect(page.getByRole("tabpanel")).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(tab(page, "Overview")).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  expect(await page.evaluate(() => document.activeElement?.getAttribute("role"))).not.toBe("tab")
})

const boxesOverlap = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

for (const mode of [
  { name: "320px at 200% text", width: 320, height: 640, zoom: true },
  { name: "390px at 100% text", width: 390, height: 844, zoom: false },
]) {
  test(`reflow without overlap or overflow: ${mode.name}`, async ({ page }) => {
    await importCard(page, CARDS[0])
    await page.setViewportSize({ width: mode.width, height: mode.height })
    if (mode.zoom) await page.evaluate(() => (document.documentElement.style.fontSize = "200%"))
    if (mode.zoom) expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe("32px")

    for (const name of TABS) {
      await tab(page, name).click()
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `${name}: horizontal overflow`).toBeLessThanOrEqual(0)
      const mainOverflow = await page.evaluate(() => {
        const main = document.querySelector('[role="tabpanel"]')!
        return main.scrollWidth - main.clientWidth
      })
      expect(mainOverflow, `${name}: main overflows horizontally`).toBeLessThanOrEqual(0)

      const geometry = await page.evaluate(() => {
        const rect = (el: Element) => el.getBoundingClientRect().toJSON()
        const header = document.querySelector("header")!
        const title = header.querySelector("h1")!
        const clear = header.querySelector("button")!
        const meta = header.querySelector("p")!
        const lineHeight = parseFloat(getComputedStyle(meta).lineHeight)
        const tabs = [...document.querySelectorAll('[role="tab"]')].map((el) => ({
          rect: rect(el),
          clipped: [...el.querySelectorAll("span")].some((s) => s.scrollWidth > s.clientWidth + 1),
          // One line per label means no word was split mid-word.
          labelLines: [...el.querySelectorAll("span")].map((s) => {
            const range = document.createRange()
            range.selectNodeContents(s)
            return range.getClientRects().length
          }),
        }))
        const titleRange = document.createRange()
        titleRange.selectNodeContents(title)
        return {
          title: rect(title),
          clear: rect(clear),
          clearText: clear.textContent?.trim(),
          clearName: clear.getAttribute("aria-label"),
          metaLines: Math.round(rect(meta).height / lineHeight),
          metaText: meta.textContent ?? "",
          width: window.innerWidth,
          titleLines: titleRange.getClientRects().length,
          tabs,
        }
      })
      expect(geometry.clearText).toBe("Clear chat")
      expect(geometry.clearName).toBe("Clear chat and return to import")
      expect(geometry.metaText).toMatch(/^120 messages from /)
      expect(geometry.metaLines, `${name}: metadata lines`).toBeLessThanOrEqual(2)
      expect(boxesOverlap(geometry.title as DOMRect, geometry.clear as DOMRect), `${name}: title/clear overlap`).toBe(false)
      expect(geometry.clear.right).toBeLessThanOrEqual(geometry.width + 0.5)
      expect(geometry.clear.left).toBeGreaterThanOrEqual(-0.5)
      expect(geometry.title.right).toBeLessThanOrEqual(geometry.width + 0.5)
      expect(geometry.titleLines, `${name}: title split across lines`).toBe(1)
      expect(geometry.title.left, `${name}: title inside viewport`).toBeGreaterThanOrEqual(-0.5)
      expect(geometry.tabs).toHaveLength(4)
      geometry.tabs.forEach((t, i) => {
        expect(t.labelLines, `tab ${i} label split`).toEqual([1])
        expect(t.rect.width, `tab ${i} width`).toBeGreaterThanOrEqual(44)
        expect(t.rect.height, `tab ${i} height`).toBeGreaterThanOrEqual(44)
        expect(t.rect.right, `tab ${i} inside viewport`).toBeLessThanOrEqual(geometry.width + 0.5)
        expect(t.clipped, `tab ${i} label clipped`).toBe(false)
        geometry.tabs.slice(i + 1).forEach((u) => expect(boxesOverlap(t.rect as DOMRect, u.rect as DOMRect)).toBe(false))
      })
    }

    // Hero eyebrow and pill wrap; no word is cut at the card's right edge.
    await tab(page, "Overview").click()
    const clipped = await page.evaluate(() => {
      const card = document.querySelector('section[aria-label="Relationship read"]')!
      const right = card.getBoundingClientRect().right
      return [...card.querySelectorAll("*")].some((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return [...range.getClientRects()].some((r) => r.right > right + 0.5)
      })
    })
    expect(clipped).toBe(false)

    // Onboarding at the same size.
    await page.getByRole("button", { name: "Clear chat and return to import" }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    const mark = await page.evaluate(() => {
      const svgBox = document.querySelector("h1")!.previousElementSibling!.getBoundingClientRect()
      return { w: svgBox.width, h: svgBox.height }
    })
    expect(Math.abs(mark.w - mark.h)).toBeLessThanOrEqual(1)
    expect(mark.w).toBeLessThan(120)
  })
}

test("Clear chat returns to import with focus and persists nothing", async ({ page }) => {
  await importCard(page, CARDS[0])
  await expect(page.getByRole("button", { name: "Clear chat and return to import" })).toContainText("Clear chat")
  await expect(page.getByRole("button", { name: "Analyze another export" })).toHaveCount(0)
  await page.getByRole("button", { name: "Clear chat and return to import" }).click()
  await expect(page.getByRole("tablist")).toHaveCount(0)
  await expect(page.getByText("120 messages from")).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "ChatSense" })).toBeFocused()
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0)
  expect(await page.locator("input[type=file]").inputValue()).toBe("")
  await page.getByRole("button", { name: "Try demo export" }).click()
  await expect(tab(page, "Overview")).toHaveAttribute("aria-selected", "true")
})

test("onboarding error is announced, input resets, same file can retry", async ({ page }) => {
  await page.goto("/")
  // Scoped: Next's own route announcer is also role=alert.
  const alert = page.getByRole("region", { name: "Import actions" }).getByRole("alert")
  await expect(alert).toHaveCount(1)
  await expect(alert).toHaveText("")
  await expect(alert).toHaveAttribute("aria-live", "assertive")

  await page.evaluate(() => {
    ;(window as unknown as { changes: number }).changes = 0
    document.querySelector("input[type=file]")!.addEventListener("change", () => ((window as unknown as { changes: number }).changes += 1))
  })
  const bad = { name: "notes.png", mimeType: "image/png", buffer: Buffer.from("not a chat") }
  await page.locator("input[type=file]").setInputFiles(bad)
  await expect(alert).not.toHaveText("")
  expect(await page.locator("input[type=file]").inputValue()).toBe("")
  await page.locator("input[type=file]").setInputFiles(bad)
  await expect(alert).not.toHaveText("")
  expect(await page.evaluate(() => (window as unknown as { changes: number }).changes)).toBe(2)
  expect(await page.locator("input[type=file]").inputValue()).toBe("")
})

test("warm-share failure shows a dismissible banner and keeps the report", async ({ page }) => {
  await page.addInitScript(() => {
    const listeners: Record<string, (payload: unknown) => void> = {}
    ;(window as unknown as { emitShare: (event: string, payload: unknown) => void }).emitShare = (event, payload) =>
      listeners[event]?.(payload)
    ;(window as unknown as { Capacitor: unknown }).Capacitor = {
      PluginHeaders: [
        {
          name: "SharedFile",
          methods: [
            { name: "addListener", rtype: "callback" },
            { name: "removeListener", rtype: "promise" },
            { name: "getPendingSharedFile", rtype: "promise" },
            { name: "releaseSharedFile", rtype: "promise" },
          ],
        },
      ],
      nativeCallback: (_plugin: string, _method: string, options: { eventName: string }, cb: (payload: unknown) => void) => {
        listeners[options.eventName] = cb
        return Promise.resolve(options.eventName)
      },
      nativePromise: () => Promise.resolve({}),
    }
  })
  await page.goto("/")
  await page.getByRole("button", { name: "Try demo export" }).click()
  await expect(tab(page, "Overview")).toBeVisible()
  const alert = page.locator("#report-error-alert")
  await expect(alert).toHaveCount(1)
  await expect(alert).toHaveAttribute("role", "alert")
  await expect(alert).toHaveText("")

  const emit = () => page.evaluate(() => (window as unknown as { emitShare: (e: string, p: unknown) => void }).emitShare("sharedFileError", { code: "copy_failed" }))
  await emit()
  await expect(alert).not.toHaveText("")
  await expect(alert).toHaveAttribute("aria-live", "assertive")
  await expect(page.locator('section[aria-label="Relationship read"]')).toBeVisible()
  const dismiss = alert.getByRole("button", { name: "Dismiss import error" })
  await expect(dismiss).toHaveText("Dismiss")
  const order = await page.evaluate(() => {
    const banner = document.querySelector("#report-error-alert")!.getBoundingClientRect()
    return { bannerTop: banner.top, headerBottom: document.querySelector("header")!.getBoundingClientRect().bottom }
  })
  expect(order.bannerTop).toBeGreaterThanOrEqual(order.headerBottom - 1)
  await dismiss.click()
  await expect(alert).toHaveText("")
  await expect(tab(page, "Overview")).toBeVisible()

  await emit()
  await expect(alert).not.toHaveText("")
  await page.getByRole("button", { name: "Clear chat and return to import" }).click()
  await expect(page.getByRole("region", { name: "Import actions" }).getByRole("alert")).toHaveText("")
})
