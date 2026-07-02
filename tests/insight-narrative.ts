import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import {
  analyzeChat,
  parseWhatsAppChat,
  type InsightNarrative,
  type NarrativeCategory,
} from "@chatsense/core"
import { assertNarrativeLanguageSafe } from "./helpers/narrative-safety"

const REQUIRED_CATEGORIES: NarrativeCategory[] = [
  "balance",
  "maintenance",
  "reconnection",
  "reply_timing",
  "activity_change",
  "rhythm",
  "forecasting_gate",
  "data_quality",
]

function fixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", `${name}.txt`), "utf8")
}

function narrativeForText(text: string): InsightNarrative {
  return analyzeChat(parseWhatsAppChat(text)).narrative
}

function narrativeForFixture(name: string): InsightNarrative {
  return narrativeForText(fixture(name))
}

function run() {
  testBalancedVolumeButUnevenMaintenance()
  testOneParticipantRestartsMostLongPauses()
  testGenuinelyBalancedMaintenance()
  testEarlyActivityIncrease()
  testEarlyActivityDecrease()
  testParticipantReplyTimingChanges()
  testRecentChangeDiffersFromEarlyLateChange()
  testShortExportHasInsufficientEvidence()
  testGroupChatAttributionIsLimited()
  testForecastingRemainsBlocked()
  testNoNotableChanges()
  testAllNarrativesAvoidForbiddenLanguage()
  testAllRequiredCategoriesAreProduced()
  testAllScreensLeadWithNarrative()
  testNarrativeIsContentIndependent()
  console.log("Insight narrative tests passed (12-case Stage 6 matrix plus safety and UI checks).")
}

function testBalancedVolumeButUnevenMaintenance() {
  const finding = narrativeForFixture("stage4_increasing_initiation").sections.people.findings[0]
  assert.equal(finding.id, "maintenance:uneven")
  assert.equal(finding.category, "maintenance")
  assert.match(finding.title, /balanced volume, uneven contact maintenance/i)
  assert.match(finding.summary, /Ravi .*7 of 10 pauses/i)
  assert.equal(finding.evidence.some((item) => item.label === "Message share" && item.value === "55%"), true)
  assert.equal(finding.evidence.some((item) => item.label === "24h restarts" && /^7 \(70%\)$/.test(item.value)), true)
}

function testOneParticipantRestartsMostLongPauses() {
  const finding = narrativeForFixture("stage4_increasing_initiation").sections.people.findings.find(
    (candidate) => candidate.category === "reconnection",
  )
  assert.ok(finding)
  assert.match(finding.summary, /Ravi sent the first message after 7 of 10/i)
}

function testGenuinelyBalancedMaintenance() {
  const narrative = narrativeForText(balancedMaintenanceFixture())
  const finding = narrative.sections.people.findings[0]
  assert.equal(finding.id, "maintenance:balanced")
  assert.match(finding.title, /contribution and contact maintenance were relatively balanced/i)
  assert.equal(finding.evidence.length, 2)

  const boundaryNarrative = narrativeForText(balanceBoundaryFixture())
  assert.equal(boundaryNarrative.sections.people.findings[0].id, "maintenance:balanced")
  assert.equal(
    boundaryNarrative.sections.people.findings.find((candidate) => candidate.category === "balance")?.id,
    "balance:balanced",
  )
}

function testEarlyActivityIncrease() {
  const finding = narrativeForText(activityComparisonFixture(5, 10)).sections.changes.findings.find(
    (candidate) => candidate.id.startsWith("change:early_late:messages_per_active_day"),
  )
  assert.ok(finding)
  assert.equal(finding.category, "activity_change")
  assert.match(finding.title, /increased/i)
}

function testEarlyActivityDecrease() {
  const finding = narrativeForText(activityComparisonFixture(10, 5)).sections.changes.findings.find(
    (candidate) => candidate.id.startsWith("change:early_late:messages_per_active_day"),
  )
  assert.ok(finding)
  assert.equal(finding.category, "activity_change")
  assert.match(finding.title, /decreased/i)
}

function testParticipantReplyTimingChanges() {
  const findings = narrativeForFixture("stage4_reply_slowdown").sections.changes.findings
  assert.equal(findings.some((finding) => finding.category === "reply_timing"), true)
  assert.equal(findings.some((finding) => /became (faster|slower)/i.test(finding.title)), true)
}

function testRecentChangeDiffersFromEarlyLateChange() {
  const findings = narrativeForFixture("stage4_balanced_then_one_sided").sections.changes.findings
  const early = findings.find((finding) => finding.id.startsWith("change:early_late"))
  const recent = findings.find((finding) => finding.id.startsWith("change:recent_prior"))
  assert.ok(early)
  assert.ok(recent)
  assert.notEqual(early.category, recent.category)
  assert.notEqual(early.title, recent.title)
}

function testShortExportHasInsufficientEvidence() {
  const narrative = narrativeForFixture("stage4_insufficient_export")
  assert.equal(narrative.sections.changes.findings[0].category, "data_quality")
  assert.equal(narrative.sections.changes.findings[0].evidenceLevel, "limited")
  assert.match(narrative.sections.people.findings[0].title, /evidence is limited/i)
}

function testGroupChatAttributionIsLimited() {
  const finding = narrativeForFixture("stage4_group_reply_edges").sections.people.findings.find(
    (candidate) => candidate.id === "data-quality:group-attribution",
  )
  assert.ok(finding)
  assert.equal(finding.evidenceLevel, "limited")
  assert.match(finding.summary, /immediately previous sender/i)
}

function testForecastingRemainsBlocked() {
  const finding = narrativeForFixture("stage4_balanced_then_one_sided").sections.changes.findings.find(
    (candidate) => candidate.category === "forecasting_gate",
  )
  assert.ok(finding)
  assert.equal(finding.title, "Forecasting remains blocked")
  assert.match(finding.summary, /have not earned product forecasting/i)
  assert.equal(finding.evidence.some((item) => item.label === "Product promotion" && item.value === "Blocked"), true)
}

function testNoNotableChanges() {
  const narrative = narrativeForText(activityComparisonFixture(5, 5))
  const comparison = narrative.sections.changes.findings[0]
  assert.equal(comparison.id, "comparison:no-notable-change")
  assert.match(comparison.title, /no measured shift crossed the threshold/i)
}

function testAllNarrativesAvoidForbiddenLanguage() {
  const fixtureNames = readdirSync(path.join(process.cwd(), "fixtures", "whatsapp"))
    .filter((name) => name.endsWith(".txt"))
    .sort()
  for (const fixtureName of fixtureNames) {
    assertNarrativeLanguageSafe(narrativeForText(fixture(path.basename(fixtureName, ".txt"))), fixtureName)
  }
  assertNarrativeLanguageSafe(narrativeForText(balancedMaintenanceFixture()), "generated balanced maintenance")
  assertNarrativeLanguageSafe(narrativeForText(activityComparisonFixture(5, 10)), "generated activity increase")
  assertNarrativeLanguageSafe(narrativeForText(activityComparisonFixture(10, 5)), "generated activity decrease")
  assertNarrativeLanguageSafe(narrativeForText(activityComparisonFixture(5, 5)), "generated stable activity")
}

function testAllRequiredCategoriesAreProduced() {
  const narratives = [
    narrativeForFixture("stage4_balanced_then_one_sided"),
    narrativeForFixture("stage4_reply_slowdown"),
    narrativeForFixture("stage4_group_reply_edges"),
  ]
  const categories = new Set(
    narratives.flatMap((narrative) =>
      Object.values(narrative.sections).flatMap((section) => section.findings.map((finding) => finding.category)),
    ),
  )
  for (const category of REQUIRED_CATEGORIES) assert.equal(categories.has(category), true, `Missing ${category}`)
}

function testAllScreensLeadWithNarrative() {
  assertSourceOrder("features/overview/OverviewScreen.tsx", "Evidence-backed summary", "At a glance")
  assertSourceOrder("features/changes/ChangesScreen.tsx", "What changed?", "Changes over time")
  assertSourceOrder("features/people/PeopleScreen.tsx", "Contact maintenance", "Who contributes")
  assertSourceOrder("features/rhythm/RhythmScreen.tsx", "Pause story", "Conversation rhythm")
}

function testNarrativeIsContentIndependent() {
  const originalText = fixture("stage4_balanced_then_one_sided")
  const rewritten = originalText.replace(/: (.*)$/gm, ": unrelated tokens replace every message")
  assert.deepEqual(narrativeForText(rewritten), narrativeForText(originalText))
}

function assertSourceOrder(file: string, narrativeText: string, rawText: string): void {
  const source = readFileSync(path.join(process.cwd(), file), "utf8")
  const narrativeIndex = source.indexOf(narrativeText)
  const rawIndex = source.indexOf(rawText)
  assert.equal(narrativeIndex >= 0, true, `${file} is missing ${narrativeText}`)
  assert.equal(rawIndex > narrativeIndex, true, `${file} must show ${narrativeText} before ${rawText}`)
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

function balanceBoundaryFixture(): string {
  const start = new Date(2026, 0, 1, 9, 0)
  return ["Asha", "Ravi", "Asha", "Ravi", "Asha"]
    .map((sender, index) => whatsAppLine(addMinutes(start, index * 24 * 60), sender, `thread ${index}`))
    .join("\n")
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
