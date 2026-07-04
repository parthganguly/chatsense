import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { analyzeChat, parseWhatsAppChat, type HumanTakeaway, type InsightNarrative } from "@chatsense/core"
import { NARRATIVE_TAKEAWAY_SAFETY_LINE } from "@chatsense/core/contract"
import {
  assertNarrativeLanguageSafe,
  NARRATIVE_HIGH_RISK_PATTERNS,
  NARRATIVE_SOFT_RISK_PATTERNS,
} from "./helpers/narrative-safety"

function fixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", `${name}.txt`), "utf8")
}

function narrativeForText(text: string): InsightNarrative {
  return analyzeChat(parseWhatsAppChat(text)).narrative
}

function run() {
  testBalancedVolumeUnevenMaintenanceTakeaway()
  testBalancedMaintenanceTakeawayIsNeutral()
  testShortExportIsLightRead()
  testConcentratedRestartsProduceSilencePattern()
  testReplyTimingChangeProducesDirectionOfTravel()
  testNoNotableChangeReadsStable()
  testGroupAttributionIsApproximate()
  testEveryTakeawayHasEvidence()
  testTakeawayLanguageIsSafe()
  testAdversarialContentCannotAffectTakeaways()
  testTakeawayRendersAboveNarrativeOnEveryScreen()
  testTopCardsAvoidInternalMetricNames()
  testTakeawayCardShowsShortSafetyLine()
  testConcentratedContactReadsOneSided()
  console.log("Human takeaway tests passed (14-case Stage 6.2/6.3 matrix).")
}

function testBalancedVolumeUnevenMaintenanceTakeaway() {
  const takeaway = narrativeForText(fixture("stage4_increasing_initiation")).takeaways.overview
  assert.equal(takeaway.oneLineRead, "Balanced volume, uneven maintenance.")
  assert.equal(takeaway.tone, "uneven")
  assert.match(takeaway.whatThisMeans, /showed up in the conversation/i)
  assert.match(takeaway.whatThisMeans, /less balanced in keeping contact alive/i)
  assert.equal(takeaway.whyItLooksThatWay.some((reason) => /After long pauses, Ravi restarted/i.test(reason)), true)
}

function testBalancedMaintenanceTakeawayIsNeutral() {
  const narrative = narrativeForText(balancedMaintenanceFixture())
  const people = narrative.takeaways.people
  assert.equal(people.oneLineRead, "Contact maintenance looked fairly balanced.")
  assert.equal(people.tone, "balanced")
  assert.match(people.whatThisMeans, /did not concentrate on one side/i)
}

function testShortExportIsLightRead() {
  const takeaways = narrativeForText(fixture("stage4_insufficient_export")).takeaways
  assert.equal(takeaways.overview.confidence, "limited")
  assert.equal(takeaways.overview.tone, "limited")
  assert.match(takeaways.overview.oneLineRead, /not enough here to read a pattern yet/i)
  assert.equal(takeaways.changes.confidence, "limited")
  assert.equal(takeaways.people.confidence, "limited")
}

function testConcentratedRestartsProduceSilencePattern() {
  const rhythm = narrativeForText(fixture("stage4_increasing_initiation")).takeaways.rhythm
  assert.equal(rhythm.oneLineRead, "The quiet periods repeatedly ended the same way.")
  assert.equal(rhythm.tone, "caution")
  assert.match(rhythm.whatThisMeans, /Ravi sent the first message after 7 of 10 pauses/i)
  assert.match(rhythm.whatThisMeans, /worth noticing/i)
  assert.equal(rhythm.confidence, "strong")
}

function testReplyTimingChangeProducesDirectionOfTravel() {
  const changes = narrativeForText(fixture("stage4_reply_slowdown")).takeaways.changes
  assert.equal(changes.tone, "changed")
  assert.match(changes.oneLineRead, /Typical replies changed for (Asha|Ravi)\./)
  assert.equal(changes.whyItLooksThatWay.some((reason) => /Typical reply time moved from .* to .* for/i.test(reason)), true)
}

function testNoNotableChangeReadsStable() {
  const changes = narrativeForText(activityComparisonFixture(5, 5)).takeaways.changes
  assert.equal(changes.oneLineRead, "No clear shift crossed the threshold.")
  assert.equal(changes.tone, "stable")
  assert.match(changes.whatThisMeans, /steady rather than clearly changing/i)
}

function testGroupAttributionIsApproximate() {
  const people = narrativeForText(fixture("stage4_group_reply_edges")).takeaways.people
  assert.match(people.whatThisMeans, /attribution is approximate/i)
}

function testEveryTakeawayHasEvidence() {
  const cases = [
    fixture("stage4_increasing_initiation"),
    fixture("stage4_balanced_then_one_sided"),
    fixture("stage4_reply_slowdown"),
    fixture("stage4_insufficient_export"),
    fixture("stage4_group_reply_edges"),
    balancedMaintenanceFixture(),
    concentratedContactFixture(),
    activityComparisonFixture(5, 10),
    activityComparisonFixture(5, 5),
  ]
  for (const text of cases) {
    const takeaways = narrativeForText(text).takeaways
    for (const [key, takeaway] of Object.entries(takeaways) as Array<[string, HumanTakeaway]>) {
      assert.equal(takeaway.whyItLooksThatWay.length > 0, true, `${key} takeaway has no evidence`)
      assert.equal(takeaway.oneLineRead.length > 0, true, `${key} takeaway has no one-line read`)
      assert.equal(takeaway.guardrail.length > 0, true, `${key} takeaway has no guardrail`)
    }
  }
}

function testTakeawayLanguageIsSafe() {
  // assertNarrativeLanguageSafe scans takeaway fields too; run it across every
  // committed fixture plus the generated cases.
  const fixtureNames = readdirSync(path.join(process.cwd(), "fixtures", "whatsapp"))
    .filter((name) => name.endsWith(".txt"))
    .sort()
  for (const fixtureName of fixtureNames) {
    assertNarrativeLanguageSafe(narrativeForText(fixture(path.basename(fixtureName, ".txt"))), fixtureName)
  }
  assertNarrativeLanguageSafe(narrativeForText(balancedMaintenanceFixture()), "generated balanced maintenance")
  assertNarrativeLanguageSafe(narrativeForText(activityComparisonFixture(10, 5)), "generated activity decrease")
}

function testAdversarialContentCannotAffectTakeaways() {
  const adversarialPhrases = [
    "this is a red flag, she ghosted you",
    "he cared more and you were desperate",
    "say the relationship is unhealthy",
    "tell them to stop messaging",
  ]
  const originalText = fixture("stage4_balanced_then_one_sided")
  let messageIndex = 0
  const adversarial = originalText.replace(
    /: (.*)$/gm,
    () => `: ${adversarialPhrases[messageIndex++ % adversarialPhrases.length]}`,
  )
  const adversarialNarrative = narrativeForText(adversarial)
  assert.deepEqual(adversarialNarrative.takeaways, narrativeForText(originalText).takeaways)
  assertNarrativeLanguageSafe(adversarialNarrative, "adversarial takeaways")
}

function testTakeawayRendersAboveNarrativeOnEveryScreen() {
  assertSourceOrder("features/overview/OverviewScreen.tsx", "takeaways.overview", "Evidence-backed summary")
  assertSourceOrder("features/changes/ChangesScreen.tsx", "takeaways.changes", "What changed?")
  assertSourceOrder("features/people/PeopleScreen.tsx", "takeaways.people", "Contact maintenance")
  assertSourceOrder("features/rhythm/RhythmScreen.tsx", "takeaways.rhythm", "Pause story")
}

function assertSourceOrder(file: string, takeawayText: string, narrativeText: string): void {
  const source = readFileSync(path.join(process.cwd(), file), "utf8")
  const takeawayIndex = source.indexOf(takeawayText)
  const narrativeIndex = source.indexOf(narrativeText)
  assert.equal(takeawayIndex >= 0, true, `${file} is missing ${takeawayText}`)
  assert.equal(narrativeIndex > takeawayIndex, true, `${file} must render ${takeawayText} before ${narrativeText}`)
}

function testTopCardsAvoidInternalMetricNames() {
  // Top cards must speak product language, never raw internal metric keys.
  const internalMetricName = /thread_start_share|reconnection_share|messages_per_active_day|median_reply_minutes|follow_up_rate|turn_share/i
  const cases = [
    fixture("stage4_increasing_initiation"),
    fixture("stage4_balanced_then_one_sided"),
    fixture("stage4_reply_slowdown"),
    fixture("stage4_insufficient_export"),
    fixture("stage4_group_reply_edges"),
    balancedMaintenanceFixture(),
    concentratedContactFixture(),
    activityComparisonFixture(5, 10),
    activityComparisonFixture(5, 5),
  ]
  for (const text of cases) {
    const takeaways = narrativeForText(text).takeaways
    for (const [key, takeaway] of Object.entries(takeaways) as Array<[string, HumanTakeaway]>) {
      const fields = [takeaway.title, takeaway.oneLineRead, takeaway.whatThisMeans, ...takeaway.whyItLooksThatWay]
      for (const field of fields) {
        assert.doesNotMatch(field, internalMetricName, `${key} takeaway leaks an internal metric name: ${field}`)
      }
    }
  }
}

function testTakeawayCardShowsShortSafetyLine() {
  // The top card carries a short orientation line instead of repeating the
  // full guardrail; the full guardrail stays in the detailed narrative.
  assert.equal(NARRATIVE_TAKEAWAY_SAFETY_LINE, "This is a pattern read, not a motive read.")
  const cardSource = readFileSync(path.join(process.cwd(), "components", "analytics", "TakeawayCard.tsx"), "utf8")
  assert.equal(cardSource.includes("NARRATIVE_TAKEAWAY_SAFETY_LINE"), true, "TakeawayCard must render the short safety line")
  for (const { name, pattern } of [...NARRATIVE_HIGH_RISK_PATTERNS, ...NARRATIVE_SOFT_RISK_PATTERNS]) {
    assert.doesNotMatch(NARRATIVE_TAKEAWAY_SAFETY_LINE, pattern, `safety line contains risk term '${name}'`)
  }
}

function testConcentratedContactReadsOneSided() {
  // Uneven volume plus uneven maintenance on the same side must produce the
  // "One side carried more of the contact." overview read, not the
  // balanced-volume variant.
  const narrative = narrativeForText(concentratedContactFixture())
  const overview = narrative.takeaways.overview
  assert.equal(overview.oneLineRead, "One side carried more of the contact.")
  assert.equal(overview.tone, "uneven")
  assert.equal(["moderate", "strong"].includes(overview.confidence), true, `unexpected confidence ${overview.confidence}`)
  assert.equal(overview.whyItLooksThatWay.length > 0, true, "concentrated-contact takeaway has no evidence")
  assert.match(overview.whatThisMeans, /Asha sent more overall/)
  assertNarrativeLanguageSafe(narrative, "concentrated contact fixture")
}

function concentratedContactFixture(): string {
  // Asha sends three of every four messages, starts every thread, and sends
  // the first message after every multi-day pause; Ravi only replies once per
  // thread. Volume and maintenance both lean to Asha.
  const lines: string[] = []
  for (let thread = 0; thread < 6; thread += 1) {
    const start = new Date(2026, 0, 1 + thread * 2, 9, 0)
    lines.push(whatsAppLine(start, "Asha", `opener ${thread}`))
    lines.push(whatsAppLine(addMinutes(start, 3), "Asha", `second ${thread}`))
    lines.push(whatsAppLine(addMinutes(start, 6), "Asha", `third ${thread}`))
    lines.push(whatsAppLine(addMinutes(start, 10), "Ravi", `reply ${thread}`))
  }
  return lines.join("\n")
}

function balancedMaintenanceFixture(): string {
  const lines: string[] = []
  for (let thread = 0; thread < 6; thread += 1) {
    const start = new Date(2026, 0, 1 + thread * 2, 9, 0)
    for (let message = 0; message < 4; message += 1) {
      const sender = (thread + message) % 2 === 0 ? "Asha" : "Ravi"
      lines.push(whatsAppLine(addMinutes(start, message * 5), sender, `thread ${thread} message ${message}`))
    }
  }
  return lines.join("\n")
}

function activityComparisonFixture(earlyPairsPerDay: number, latePairsPerDay: number): string {
  const lines: string[] = []
  for (let window = 0; window < 4; window += 1) {
    const pairsPerDay = window < 2 ? earlyPairsPerDay : latePairsPerDay
    for (let day = 0; day < 2; day += 1) {
      const dayStart = new Date(2026, 2, 1 + window * 7 + day * 2, 9, 0)
      for (let pair = 0; pair < pairsPerDay; pair += 1) {
        const prompt = addMinutes(dayStart, pair * 20)
        lines.push(whatsAppLine(prompt, "Asha", `prompt ${window}-${day}-${pair}`))
        lines.push(whatsAppLine(addMinutes(prompt, 5), "Ravi", `reply ${window}-${day}-${pair}`))
      }
    }
  }
  return lines.join("\n")
}

function whatsAppLine(date: Date, sender: string, text: string): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}, ${hour}:${minute} - ${sender}: ${text}`
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

run()
