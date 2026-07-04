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

test("all analytics tabs lead with a takeaway card and do not overflow", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByText("Choose WhatsApp export")).toBeVisible()

  await page.setInputFiles("input[type=file]", FIXTURE)
  await expect(page.getByText("Balanced volume, uneven maintenance.")).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText("This is a pattern read, not a motive read.").first()).toBeVisible()

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
