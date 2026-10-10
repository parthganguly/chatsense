import path from "node:path"
import { expect, test } from "@playwright/test"

// Synthetic fixture only — viewport QA must never require a personal export.
const FIXTURE = path.join(process.cwd(), "fixtures", "whatsapp", "stage4_increasing_initiation.txt")

const TABS = [
  { nav: "Overview", takeaway: "What to notice", rawMetrics: "At a glance" },
  { nav: "Changes", takeaway: "Did the pattern move?", rawMetrics: "Changes over time" },
  { nav: "People", takeaway: "Who kept contact alive?", rawMetrics: "Who contributes" },
  { nav: "Rhythm", takeaway: "What silence looked like", rawMetrics: "Conversation rhythm" },
] as const

test("onboarding explains the product and demo import reaches analysis", async ({ page }) => {
  await page.goto("/")

  // Onboarding content before any import.
  await expect(page.getByRole("heading", { name: "ChatSense" })).toBeVisible()
  await expect(page.getByText("Choose WhatsApp export")).toBeVisible()
  await expect(page.getByText("Try demo export")).toBeVisible()
  await expect(page.getByText("What you'll see")).toBeVisible()
  await expect(page.getByText("What this cannot tell you")).toBeVisible()
  await expect(page.getByText("Analysis runs locally inside the app", { exact: false })).toBeVisible()
  await expect(page.getByText("How to export from WhatsApp")).toBeVisible()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, "onboarding overflows horizontally").toBeLessThanOrEqual(0)

  // The demo import must land in the normal analysis state.
  await page.getByRole("button", { name: "Try demo export" }).click()
  for (const tab of TABS) {
    await page.getByRole("button", { name: tab.nav, exact: true }).click()
    await expect(page.getByText(tab.takeaway).first()).toBeVisible()
  }
  await expect(page.getByText("Demo export (synthetic)", { exact: false })).toBeVisible()
})

test("all analytics tabs lead with a takeaway card and do not overflow", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Choose WhatsApp export")).toBeVisible()

  await page.setInputFiles("input[type=file]", FIXTURE)
  await expect(page.getByText("Message volume was even, while keeping contact going leaned one way.")).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.getByText("Observed in this export; it does not explain why.").first()).toBeVisible()

  // Stage 8A: the relationship-read hero card leads the first screen, above
  // the existing takeaway and raw analytics, with its evidence and inline
  // limitation visible without opening a technical report.
  const hero = page.getByText("What this export shows")
  await expect(hero).toBeVisible()
  await expect(page.getByText("Counted in this export")).toBeVisible()
  const heroBox = await hero.boundingBox()
  const overviewTakeawayBox = await page.getByText("What to notice").first().boundingBox()
  expect(heroBox).not.toBeNull()
  expect(overviewTakeawayBox).not.toBeNull()
  expect(heroBox!.y).toBeLessThan(overviewTakeawayBox!.y)

  for (const tab of TABS) {
    await page.getByRole("button", { name: tab.nav, exact: true }).click()

    const takeaway = page.getByText(tab.takeaway).first()
    const rawMetrics = page.getByText(tab.rawMetrics, { exact: true }).first()
    await expect(takeaway).toBeVisible()
    await expect(rawMetrics).toBeAttached()

    // The takeaway card must sit above the raw metric sections.
    const takeawayBox = await takeaway.boundingBox()
    const rawBox = await rawMetrics.boundingBox()
    expect(takeawayBox, `${tab.nav} takeaway has no bounding box`).not.toBeNull()
    expect(rawBox, `${tab.nav} raw metrics have no bounding box`).not.toBeNull()
    expect(takeawayBox!.y).toBeLessThan(rawBox!.y)

    // No horizontal overflow at this viewport.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${tab.nav} overflows horizontally`).toBeLessThanOrEqual(0)
  }

  // Bottom nav still works after the walk: return to Overview.
  await page.getByRole("button", { name: "Overview", exact: true }).click()
  await expect(page.getByText("What to notice").first()).toBeVisible()
})
