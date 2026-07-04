import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { analyzeChat, parseWhatsAppChat, type HumanTakeaway, type InsightNarrative } from "@chatsense/core"
import { assertNarrativeLanguageSafe } from "./helpers/narrative-safety"

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
  console.log("Human takeaway tests passed (11-case Stage 6.2 matrix).")
}

function testBalancedVolumeUnevenMaintenanceTakeaway() {
  const takeaway = narrativeForText(fixture("stage4_increasing_initiation")).takeaways.overview
  assert.equal(takeaway.oneLineRead, "Balanced volume, uneven maintenance.")
  assert.equal(takeaway.tone, "uneven")
  assert.match(takeaway.whatThisMeans, /sent a similar amount/i)
  assert.match(takeaway.whatThisMeans, /less reciprocal in keeping contact alive/i)
  assert.equal(takeaway.whyItLooksThatWay.some((reason) => /long pauses were restarted by Ravi/i.test(reason)), true)
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
  assert.match(takeaways.overview.oneLineRead, /too little data/i)
  assert.equal(takeaways.changes.confidence, "limited")
  assert.equal(takeaways.people.confidence, "limited")
}

function testConcentratedRestartsProduceSilencePattern() {
  const rhythm = narrativeForText(fixture("stage4_increasing_initiation")).takeaways.rhythm
  assert.equal(rhythm.oneLineRead, "Long pauses happened, and most were restarted by the same person.")
  assert.equal(rhythm.tone, "caution")
  assert.match(rhythm.whatThisMeans, /Ravi sent the first message after 7 of 10 pauses/i)
  assert.match(rhythm.whatThisMeans, /worth noticing/i)
  assert.equal(rhythm.confidence, "strong")
}

function testReplyTimingChangeProducesDirectionOfTravel() {
  const changes = narrativeForText(fixture("stage4_reply_slowdown")).takeaways.changes
  assert.equal(changes.tone, "changed")
  assert.match(changes.oneLineRead, /Reply timing changed for (Asha|Ravi)\./)
  assert.equal(changes.whyItLooksThatWay.some((reason) => /Median reply changed from .* to .* for/i.test(reason)), true)
}

function testNoNotableChangeReadsStable() {
  const changes = narrativeForText(activityComparisonFixture(5, 5)).takeaways.changes
  assert.equal(changes.oneLineRead, "No clear change crossed the threshold.")
  assert.equal(changes.tone, "stable")
  assert.match(changes.whatThisMeans, /stable rather than clearly changing/i)
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
