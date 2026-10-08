import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { analyzeChat, buildRelationshipRead, getSenders, parseWhatsAppChat, type ChatAnalysis } from "@chatsense/core"
import {
  buildPersonalEvidence,
  PERSONAL_EVIDENCE_LIMITATIONS,
  PERSONAL_EVIDENCE_TIMEZONE_STATUS,
  type PersonalEvidenceExclusionReason,
  type PersonalEvidenceRow,
  type PersonalEvidenceSelection,
  type PersonalEvidenceTable,
} from "../packages/chatsense-core/src/personal-evidence"
import { NARRATIVE_HIGH_RISK_PATTERNS, NARRATIVE_SOFT_RISK_PATTERNS } from "./helpers/narrative-safety"

// Synthetic only. Each line: [minutes from the chat's start, sender, text].
type Line = [number, string, string]

// Dyad A, self "Ana Silva". Hand counts (THREAD_GAP 360m, RECONNECTION 1440m, FOLLOW_UP 15m):
// starts Ana m1,m7 / Ben m10,m12 -> 2 of 4; day-plus pauses before m7 (Ana), m12 (Ben) -> 1 of 2;
// Ana follow-up events m4,m5 both inside one turn -> 2 events, 1 of 3 eligible turns (33%);
// Ana replies m3 5, m7 1500, m9 5, m11 5, m13 10 -> 5 samples, median 5.
const DYAD_A: Line[] = [
  [0, "Ana Silva", "zebra one"],
  [5, "Ben", "zebra two"],
  [10, "Ana Silva", "zebra three"],
  [30, "Ana Silva", "zebra four"],
  [50, "Ana Silva", "zebra five"],
  [55, "Ben", "zebra six"],
  [1555, "Ana Silva", "zebra seven"],
  [1560, "Ben", "zebra eight"],
  [1565, "Ana Silva", "zebra nine"],
  [1965, "Ben", "zebra ten"],
  [1970, "Ana Silva", "zebra eleven"],
  [3470, "Ben", "zebra twelve"],
  [3480, "Ana Silva", "zebra thirteen"],
]

// Dyad B, self "Cara M.". Starts 3 of 3; one day-plus pause (1 of 1, below floor);
// zero follow-up events over 4 eligible turns (observed 0%); replies 3, 500, 1500, 3 -> 4 samples, median 252.
const DYAD_B: Line[] = [
  [0, "Cara M.", "zebra a"],
  [3, "Dev", "zebra b"],
  [6, "Cara M.", "zebra c"],
  [9, "Dev", "zebra d"],
  [509, "Cara M.", "zebra e"],
  [512, "Dev", "zebra f"],
  [2012, "Cara M.", "zebra g"],
  [2015, "Dev", "zebra h"],
  [2018, "Cara M.", "zebra i"],
]

// Dyad C, self "Eve": no day-plus pause at all -> restarts unavailable, never 0%.
const DYAD_C: Line[] = [
  [0, "Eve", "zebra p"],
  [4, "Finn", "zebra q"],
  [8, "Eve", "zebra r"],
  [12, "Finn", "zebra s"],
]

const START_A = new Date(2026, 0, 15, 9, 0)
const START_B = new Date(2026, 2, 20, 9, 0)
const HOST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
const ROW_KEYS = [
  "activeDays",
  "conversationId",
  "conversationStarts",
  "coverage",
  "exportId",
  "followUpsBeforeReply",
  "messageCount",
  "provenance",
  "replyTiming",
  "restartsAfterDayPlusPauses",
  "selfSender",
]

function chatText(lines: Line[], start: Date = START_A): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return lines
    .map(([minutes, sender, text]) => {
      const at = new Date(start.getTime() + minutes * 60_000)
      return `${pad(at.getDate())}/${pad(at.getMonth() + 1)}/${at.getFullYear()}, ${pad(at.getHours())}:${pad(at.getMinutes())} - ${sender}: ${text}`
    })
    .join("\n")
}

function analysisOf(lines: Line[], start?: Date): ChatAnalysis {
  return analyzeChat(parseWhatsAppChat(chatText(lines, start)))
}

function selection(
  exportId: string,
  conversationId: string,
  selfSender: string,
  analysis: ChatAnalysis,
): PersonalEvidenceSelection {
  return {
    exportId,
    conversationId,
    selfSender,
    provenance: {
      medium: "whatsapp",
      format: "txt",
      parserRevision: "9485746431ab6c8b536e281ca369be9994af16c1",
      timezoneStatus: PERSONAL_EVIDENCE_TIMEZONE_STATUS,
      hostTimeZone: HOST_ZONE,
    },
    analysis,
  }
}

const selA = () => selection("export-a", "conv-a", "Ana Silva", analysisOf(DYAD_A))
const selB = () => selection("export-b", "conv-b", "Cara M.", analysisOf(DYAD_B, START_B))
const selC = () => selection("export-c", "conv-c", "Eve", analysisOf(DYAD_C))

function rows(table: PersonalEvidenceTable): PersonalEvidenceRow[] {
  return table.entries.flatMap((entry) => (entry.status === "eligible" ? [entry.row] : []))
}

function reasonsAt(table: PersonalEvidenceTable, index: number): PersonalEvidenceExclusionReason[] {
  const entry = table.entries[index]
  assert.equal(entry.status, "excluded", `entry ${index} should be excluded`)
  return entry.status === "excluded" ? entry.reasons : []
}

function selfSummary(analysis: ChatAnalysis, sender: string) {
  return analysis.relationshipDynamics.participantSummaries.find((summary) => summary.sender === sender)!
}

function otherSummary(analysis: ChatAnalysis, sender: string) {
  return analysis.relationshipDynamics.participantSummaries.find((summary) => summary.sender !== sender)!
}

function run() {
  testTwoDyadsHandCounted()
  testFollowUpEventsAreNotRateNumerator()
  testSelfIdentityRules()
  testInsufficientSelection()
  testDuplicateExportIds()
  testRepeatedConversationIds()
  testInvalidProvenance()
  testInvalidCoverage()
  testInvalidCounts()
  testInconsistentParticipants()
  testGroupAndSingleParticipantExcluded()
  testZeroVersusUnavailable()
  testSampleFloorBoundaries()
  testUnequalWindowsAndUnknownTimezone()
  testConflictingRowsKeepSelectionOrderWithoutAggregate()
  testUnresolvedCrossIdDuplicatesProduceNoAggregate()
  testInputImmutabilityAndDeterminism()
  testContentAndNarrativeIndependence()
  testNoContentOrContactLeak()
  testLimitationsPassScanner()
  testExistingOutputsByteIdentical()
  testNoProductionImports()
  console.log("Personal evidence projection tests passed.")
}

function testTwoDyadsHandCounted() {
  const table = buildPersonalEvidence([selA(), selB()])
  assert.equal(table.state, "evidence_rows")
  const [a, b] = rows(table)

  assert.deepEqual(Object.keys(a).sort(), ROW_KEYS)
  assert.equal(a.selfSender, "Ana Silva")
  assert.equal(a.messageCount, 13)
  assert.equal(a.activeDays, 3)
  assert.deepEqual(a.conversationStarts, { state: "sufficient", numerator: 2, denominator: 4, sharePct: 50, minimum: 3 })
  assert.deepEqual(a.restartsAfterDayPlusPauses, {
    state: "sufficient",
    numerator: 1,
    denominator: 2,
    sharePct: 50,
    minimum: 2,
  })
  assert.deepEqual(a.followUpsBeforeReply, {
    state: "sufficient",
    eventCount: 2,
    eligibleTurnCount: 3,
    ratePct: 33,
    minimum: 3,
  })
  assert.deepEqual(a.replyTiming, { state: "sufficient", medianMinutes: 5, sampleCount: 5, minimum: 5 })

  assert.equal(b.selfSender, "Cara M.")
  assert.equal(b.messageCount, 9)
  assert.equal(b.activeDays, 2)
  assert.deepEqual(b.conversationStarts, { state: "sufficient", numerator: 3, denominator: 3, sharePct: 100, minimum: 3 })
  assert.deepEqual(b.restartsAfterDayPlusPauses, {
    state: "insufficient",
    numerator: 1,
    denominator: 1,
    sharePct: 100,
    minimum: 2,
  })
  assert.deepEqual(b.followUpsBeforeReply, {
    state: "sufficient",
    eventCount: 0,
    eligibleTurnCount: 4,
    ratePct: 0,
    minimum: 3,
  })
  assert.deepEqual(b.replyTiming, { state: "insufficient", medianMinutes: 252, sampleCount: 4, minimum: 5 })
}

function testFollowUpEventsAreNotRateNumerator() {
  const a = rows(buildPersonalEvidence([selA(), selB()]))[0].followUpsBeforeReply
  // Two events live in one turn: rate counts that turn once (1 of 3), not 2 of 3.
  assert.equal(a.eventCount, 2)
  assert.equal(a.ratePct, 33)
  assert.notEqual(a.ratePct, Math.round((a.eventCount / a.eligibleTurnCount) * 100))
  assert.equal("numerator" in a, false, "follow-up numerator must not be reconstructed")

  // Events above eligible turns is valid; no invented bound.
  const analysis = analysisOf(DYAD_A)
  selfSummary(analysis, "Ana Silva").followUpCount = 9
  const table = buildPersonalEvidence([selection("x", "x", "Ana Silva", analysis), selB()])
  assert.equal(table.entries[0].status, "eligible")
}

function testSelfIdentityRules() {
  const cases: Array<[unknown, PersonalEvidenceExclusionReason]> = [
    ["", "missing_self_sender"],
    [undefined, "missing_self_sender"],
    ["Ana", "self_sender_not_found"],
    ["ana silva", "self_sender_not_found"],
    [" Ana Silva", "self_sender_not_found"],
    ["Someone Else", "self_sender_not_found"],
  ]
  for (const [selfSender, reason] of cases) {
    const bad = { ...selA(), selfSender } as PersonalEvidenceSelection
    const table = buildPersonalEvidence([bad, selB(), selC()])
    assert.deepEqual(reasonsAt(table, 0), [reason], `self ${JSON.stringify(selfSender)}`)
    assert.equal(rows(table).length, 2, "other eligible rows are kept")
  }

  const ambiguous = analysisOf(DYAD_A)
  ambiguous.participants.push({ ...ambiguous.participants[0] })
  ambiguous.relationshipDynamics.participantSummaries.push({ ...selfSummary(ambiguous, "Ana Silva") })
  const table = buildPersonalEvidence([selection("x", "x", "Ana Silva", ambiguous)])
  assert.ok(reasonsAt(table, 0).includes("self_sender_ambiguous"))
}

function testInsufficientSelection() {
  const empty = buildPersonalEvidence([])
  assert.equal(empty.state, "insufficient_selection")
  assert.deepEqual(empty.entries, [])

  const one = buildPersonalEvidence([selA()])
  assert.equal(one.state, "insufficient_selection")
  assert.equal(rows(one).length, 1, "the single eligible row stays visible")

  const oneEligible = buildPersonalEvidence([selA(), { ...selB(), selfSender: "nobody" }])
  assert.equal(oneEligible.state, "insufficient_selection")
}

function testDuplicateExportIds() {
  const table = buildPersonalEvidence([
    { ...selA(), exportId: "dup" },
    { ...selB(), exportId: "dup" },
    selC(),
    { ...selC(), exportId: "", conversationId: "conv-z" },
    { ...selC(), exportId: "export-y", conversationId: "  " },
  ])
  assert.deepEqual(reasonsAt(table, 0), ["duplicate_export_id"])
  assert.deepEqual(reasonsAt(table, 1), ["duplicate_export_id"])
  assert.equal(table.entries[2].status, "eligible")
  assert.deepEqual(reasonsAt(table, 3), ["missing_export_id"])
  assert.deepEqual(reasonsAt(table, 4), ["missing_conversation_id"])
  assert.equal(table.state, "insufficient_selection")
}

function testRepeatedConversationIds() {
  // Overlap: the same chat exported twice.
  const overlap = buildPersonalEvidence([
    selection("e1", "same", "Ana Silva", analysisOf(DYAD_A)),
    selection("e2", "same", "Ana Silva", analysisOf(DYAD_A)),
    selB(),
    selC(),
  ])
  assert.deepEqual(reasonsAt(overlap, 0), ["repeated_conversation_id"])
  assert.deepEqual(reasonsAt(overlap, 1), ["repeated_conversation_id"])
  assert.equal(rows(overlap).length, 2, "no silent winner; unrelated rows kept")

  // Disjoint: two non-overlapping halves of one conversation.
  const disjoint = buildPersonalEvidence([
    selection("h1", "same", "Ana Silva", analysisOf(DYAD_A.slice(0, 6))),
    selection("h2", "same", "Ana Silva", analysisOf(DYAD_A.slice(6))),
  ])
  assert.deepEqual(reasonsAt(disjoint, 0), ["repeated_conversation_id"])
  assert.deepEqual(reasonsAt(disjoint, 1), ["repeated_conversation_id"])
  assert.equal(disjoint.state, "insufficient_selection")
}

function testInvalidProvenance() {
  const base = selA()
  const cases: Array<[Record<string, unknown>, PersonalEvidenceExclusionReason]> = [
    [{ medium: "instagram" }, "unknown_medium"],
    [{ medium: undefined }, "unknown_medium"],
    [{ format: "pdf" }, "unknown_format"],
    [{ parserRevision: "" }, "invalid_provenance"],
    [{ timezoneStatus: "UTC" }, "invalid_provenance"],
    [{ hostTimeZone: "Mars/Olympus" }, "invalid_provenance"],
    [{ hostTimeZone: "" }, "invalid_provenance"],
  ]
  for (const [patch, reason] of cases) {
    const bad = { ...base, provenance: { ...base.provenance, ...patch } } as PersonalEvidenceSelection
    assert.deepEqual(reasonsAt(buildPersonalEvidence([bad]), 0), [reason], JSON.stringify(patch))
  }
  const missing = { ...base, provenance: undefined } as unknown as PersonalEvidenceSelection
  assert.deepEqual(reasonsAt(buildPersonalEvidence([missing]), 0), [
    "unknown_medium",
    "unknown_format",
    "invalid_provenance",
  ])
}

function testInvalidCoverage() {
  const cases: Array<[string, string]> = [
    ["", ""],
    ["not a date", "2026-01-15T09:00:00.000Z"],
    ["2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"],
  ]
  for (const [startedAt, endedAt] of cases) {
    const analysis = analysisOf(DYAD_A)
    analysis.overview.startedAt = startedAt
    analysis.overview.endedAt = endedAt
    assert.deepEqual(reasonsAt(buildPersonalEvidence([selection("x", "x", "Ana Silva", analysis)]), 0), [
      "invalid_coverage",
    ])
  }
  // An empty analysis (no messages) has no coverage and is never treated as a pattern.
  const empty = buildPersonalEvidence([selection("x", "x", "Ana Silva", analyzeChat([]))])
  assert.ok(reasonsAt(empty, 0).includes("invalid_coverage"))
}

function testInvalidCounts() {
  const mutations: Array<[string, (analysis: ChatAnalysis) => void]> = [
    ["NaN message count", (a) => void (a.overview.messageCount = Number.NaN)],
    ["negative starts", (a) => void (selfSummary(a, "Ana Silva").threadStarts = -1)],
    ["noninteger replies", (a) => void (selfSummary(a, "Ana Silva").replySampleCount = 1.5)],
    ["infinite follow-ups", (a) => void (selfSummary(a, "Ana Silva").followUpCount = Infinity)],
    ["rate over 100", (a) => void (selfSummary(a, "Ana Silva").followUpRate = 120)],
    ["share over 100", (a) => void (selfSummary(a, "Ana Silva").threadStartShare = 101)],
    ["negative median", (a) => void (selfSummary(a, "Ana Silva").medianReplyMinutes = -3)],
    ["null median with samples", (a) => void (selfSummary(a, "Ana Silva").medianReplyMinutes = null)],
    ["rate without eligible turns", (a) => void (selfSummary(a, "Ana Silva").followUpRelevantTurnCount = 0)],
    ["restarts exceed pauses", (a) => void (a.relationshipDynamics.pauseSummary.longPauseCount = 1)],
    ["message totals disagree", (a) => void (a.participants[0].messageCount += 1)],
    ["active days above messages", (a) => void (a.overview.activeDays = 99)],
  ]
  for (const [label, mutate] of mutations) {
    const analysis = analysisOf(DYAD_A)
    mutate(analysis)
    const table = buildPersonalEvidence([selection("x", "x", "Ana Silva", analysis), selB()])
    assert.deepEqual(reasonsAt(table, 0), ["invalid_counts"], label)
    assert.equal(table.entries[1].status, "eligible", `${label}: other row kept`)
  }
}

function testInconsistentParticipants() {
  const countMismatch = analysisOf(DYAD_A)
  countMismatch.overview.participantCount = 3
  assert.deepEqual(reasonsAt(buildPersonalEvidence([selection("x", "x", "Ana Silva", countMismatch)]), 0), [
    "inconsistent_participants",
  ])

  const nameMismatch = analysisOf(DYAD_A)
  otherSummary(nameMismatch, "Ana Silva").sender = "Benjamin"
  assert.deepEqual(reasonsAt(buildPersonalEvidence([selection("x", "x", "Ana Silva", nameMismatch)]), 0), [
    "inconsistent_participants",
  ])
}

function testGroupAndSingleParticipantExcluded() {
  const groupText = readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", "group_chat.txt"), "utf8")
  const groupMessages = parseWhatsAppChat(groupText)
  const group = analyzeChat(groupMessages)
  const before = JSON.stringify([group, buildRelationshipRead(group)])
  const self = getSenders(groupMessages)[0]
  assert.ok(getSenders(groupMessages).length > 2)
  const table = buildPersonalEvidence([selection("g", "g", self, group), selA(), selB()])
  assert.deepEqual(reasonsAt(table, 0), ["unsupported_participant_count"])
  assert.equal(rows(table).length, 2)
  assert.equal(JSON.stringify([group, buildRelationshipRead(group)]), before, "single-chat output unchanged")

  const solo = analysisOf([
    [0, "Ana Silva", "zebra"],
    [30, "Ana Silva", "zebra"],
  ])
  assert.deepEqual(reasonsAt(buildPersonalEvidence([selection("s", "s", "Ana Silva", solo)]), 0), [
    "unsupported_participant_count",
  ])
}

function testZeroVersusUnavailable() {
  const [b, c] = rows(buildPersonalEvidence([selB(), selC()]))
  // Observed zero with positive opportunities stays a measured zero.
  assert.equal(b.followUpsBeforeReply.eventCount, 0)
  assert.equal(b.followUpsBeforeReply.ratePct, 0)
  assert.equal(b.followUpsBeforeReply.state, "sufficient")
  // No opportunities: unavailable, and the engine's stored 0 share is not passed through.
  assert.equal(c.restartsAfterDayPlusPauses.denominator, 0)
  assert.equal(c.restartsAfterDayPlusPauses.sharePct, null)
  assert.equal(c.restartsAfterDayPlusPauses.state, "unavailable")

  const noReplies = analysisOf(DYAD_A)
  Object.assign(selfSummary(noReplies, "Ana Silva"), { replySampleCount: 0, medianReplyMinutes: null })
  Object.assign(selfSummary(noReplies, "Ana Silva"), { followUpRelevantTurnCount: 0, followUpRate: null })
  const row = rows(buildPersonalEvidence([selection("x", "x", "Ana Silva", noReplies)]))[0]
  assert.deepEqual(row.replyTiming, { state: "unavailable", medianMinutes: null, sampleCount: 0, minimum: 5 })
  assert.equal(row.followUpsBeforeReply.state, "unavailable")
  assert.equal(row.followUpsBeforeReply.ratePct, null)
}

function testSampleFloorBoundaries() {
  const at = (patch: (analysis: ChatAnalysis) => void) => {
    const analysis = analysisOf(DYAD_A)
    patch(analysis)
    return rows(buildPersonalEvidence([selection("x", "x", "Ana Silva", analysis)]))[0]
  }
  for (const [count, state] of [
    [2, "insufficient"],
    [3, "sufficient"],
  ] as const) {
    const row = at((a) => {
      selfSummary(a, "Ana Silva").threadStarts = count
      otherSummary(a, "Ana Silva").threadStarts = 0
    })
    assert.equal(row.conversationStarts.denominator, count)
    assert.equal(row.conversationStarts.state, state, `starts ${count}`)
  }
  for (const [count, state] of [
    [1, "insufficient"],
    [2, "sufficient"],
  ] as const) {
    const row = at((a) => {
      selfSummary(a, "Ana Silva").reconnectionCount = count
      otherSummary(a, "Ana Silva").reconnectionCount = 0
      a.relationshipDynamics.pauseSummary.longPauseCount = count
    })
    assert.equal(row.restartsAfterDayPlusPauses.state, state, `restarts ${count}`)
  }
  for (const [count, state] of [
    [2, "insufficient"],
    [3, "sufficient"],
  ] as const) {
    const row = at((a) => void (selfSummary(a, "Ana Silva").followUpRelevantTurnCount = count))
    assert.equal(row.followUpsBeforeReply.state, state, `follow-up turns ${count}`)
  }
  for (const [count, state] of [
    [4, "insufficient"],
    [5, "sufficient"],
  ] as const) {
    const row = at((a) => void (selfSummary(a, "Ana Silva").replySampleCount = count))
    assert.equal(row.replyTiming.state, state, `reply samples ${count}`)
  }
}

function testUnequalWindowsAndUnknownTimezone() {
  const [a, b] = rows(buildPersonalEvidence([selA(), selB()]))
  assert.notEqual(a.coverage.startedAt, b.coverage.startedAt)
  assert.notEqual(
    Date.parse(a.coverage.endedAt) - Date.parse(a.coverage.startedAt),
    Date.parse(b.coverage.endedAt) - Date.parse(b.coverage.startedAt),
  )
  for (const row of [a, b]) {
    assert.equal(row.provenance.timezoneStatus, "source-offset-unknown; interpreted-in-host-zone")
    assert.equal(row.provenance.hostTimeZone, HOST_ZONE)
  }
  assert.ok(PERSONAL_EVIDENCE_LIMITATIONS.some((text) => /time zone/.test(text) && /not aligned/.test(text)))
}

function testConflictingRowsKeepSelectionOrderWithoutAggregate() {
  const forward = buildPersonalEvidence([selA(), selB()])
  const reverse = buildPersonalEvidence([selB(), selA()])
  assert.deepEqual(Object.keys(forward).sort(), ["entries", "limitations", "state"])
  assert.deepEqual(
    rows(forward).map((row) => row.conversationStarts.sharePct),
    [50, 100],
  )
  assert.deepEqual(
    rows(reverse).map((row) => row.exportId),
    ["export-b", "export-a"],
    "selection order, no ranking",
  )
  assert.deepEqual(rows(forward)[0], rows(reverse)[1], "rows are independent of each other")
}

function testUnresolvedCrossIdDuplicatesProduceNoAggregate() {
  // The same export under two different conversation IDs cannot be detected; both rows stay separate.
  const table = buildPersonalEvidence([
    selection("e1", "conv-1", "Ana Silva", analysisOf(DYAD_A)),
    selection("e2", "conv-2", "Ana Silva", analysisOf(DYAD_A)),
  ])
  assert.equal(table.state, "evidence_rows")
  assert.equal(rows(table).length, 2)
  assert.deepEqual(Object.keys(table).sort(), ["entries", "limitations", "state"])
  assert.ok(PERSONAL_EVIDENCE_LIMITATIONS.some((text) => /not checked for duplicate/.test(text)))
  assert.ok(PERSONAL_EVIDENCE_LIMITATIONS.some((text) => /never combined/.test(text)))
}

function testInputImmutabilityAndDeterminism() {
  const selections = [selA(), selB(), selC()]
  const before = JSON.stringify(selections)
  deepFreeze(selections)
  const first = buildPersonalEvidence(selections)
  const second = buildPersonalEvidence(selections)
  assert.equal(JSON.stringify(selections), before)
  assert.deepEqual(first, second)
  assert.equal(JSON.stringify(first), JSON.stringify(second))
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first, "plain data only")
}

function testContentAndNarrativeIndependence() {
  const baseline = JSON.stringify(buildPersonalEvidence([selA(), selB()]))

  // Same timing, senders, and word counts; different (adversarial) text.
  const rewritten = DYAD_A.map(([minutes, sender]) => [minutes, sender, "ghosting love"] as Line)
  const content = buildPersonalEvidence([selection("export-a", "conv-a", "Ana Silva", analysisOf(rewritten)), selB()])
  assert.equal(JSON.stringify(content), baseline)

  // Narrative/hero strings are not inputs.
  const mutated = selA()
  replaceStrings(mutated.analysis.narrative)
  const narrative = buildPersonalEvidence([mutated, selB()])
  assert.equal(JSON.stringify(narrative), baseline)
}

function testNoContentOrContactLeak() {
  const json = JSON.stringify(buildPersonalEvidence([selA(), selB(), selC()]))
  assert.doesNotMatch(json, /zebra/, "no message text")
  for (const contact of ["Ben", "Dev", "Finn"]) {
    assert.ok(!json.includes(`"${contact}"`), `no contact name ${contact}`)
  }
}

function testLimitationsPassScanner() {
  const reasons: PersonalEvidenceExclusionReason[] = [
    "missing_export_id",
    "missing_conversation_id",
    "duplicate_export_id",
    "repeated_conversation_id",
    "unknown_medium",
    "unknown_format",
    "invalid_provenance",
    "invalid_coverage",
    "invalid_counts",
    "inconsistent_participants",
    "unsupported_participant_count",
    "missing_self_sender",
    "self_sender_not_found",
    "self_sender_ambiguous",
  ]
  // Strict: no negation allowances for these strings.
  for (const text of [...PERSONAL_EVIDENCE_LIMITATIONS, ...reasons, PERSONAL_EVIDENCE_TIMEZONE_STATUS]) {
    for (const { name, pattern } of [...NARRATIVE_HIGH_RISK_PATTERNS, ...NARRATIVE_SOFT_RISK_PATTERNS]) {
      assert.doesNotMatch(text.replace(/_/g, " "), pattern, `'${name}' in: ${text}`)
    }
  }
}

function testExistingOutputsByteIdentical() {
  const dir = path.join(process.cwd(), "fixtures", "whatsapp")
  const nowMs = Date.UTC(2026, 9, 1)
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".txt"))) {
    const messages = parseWhatsAppChat(readFileSync(path.join(dir, file), "utf8"))
    const snapshot = () => {
      const analysis = analyzeChat(messages)
      return JSON.stringify([analysis, buildRelationshipRead(analysis, { nowMs })])
    }
    const before = snapshot()
    const analysis = analyzeChat(messages)
    const passed = JSON.stringify(analysis)
    buildPersonalEvidence([selection(file, file, getSenders(messages)[0] ?? "", analysis), selA()])
    assert.equal(JSON.stringify(analysis), passed, `${file}: input analysis untouched`)
    assert.equal(snapshot(), before, `${file}: analyzeChat/Relationship Read unchanged`)
  }
}

function testNoProductionImports() {
  const index = readFileSync(path.join(process.cwd(), "packages", "chatsense-core", "src", "index.ts"), "utf8")
  assert.doesNotMatch(index, /personal-evidence/, "no public export yet")
  for (const dir of ["app", "components", "features", "hooks", "lib", "platform", "packages/chatsense-core/src"]) {
    const root = path.join(process.cwd(), dir)
    for (const file of readdirSync(root, { recursive: true }) as string[]) {
      if (!/\.(ts|tsx|js|mjs)$/.test(file) || file.endsWith("personal-evidence.ts")) continue
      assert.doesNotMatch(readFileSync(path.join(root, file), "utf8"), /personal-evidence/, `${dir}/${file}`)
    }
  }
}

function deepFreeze(value: unknown): void {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
}

function replaceStrings(value: unknown): void {
  if (!value || typeof value !== "object") return
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (typeof record[key] === "string") record[key] = "MUTATED narrative text"
    else replaceStrings(record[key])
  }
}

run()
