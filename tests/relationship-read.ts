import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import {
  analyzeChat,
  buildRelationshipRead,
  completedQuietStretches,
  isEstrangementShaped,
  parseWhatsAppChat,
  takeawayConfidenceLabel,
  type ChatAnalysis,
  type RelationshipRead,
} from "@chatsense/core"
import { assertRelationshipReadLanguageSafe } from "./helpers/narrative-safety"

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

function fixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", `${name}.txt`), "utf8")
}

function analysisForText(text: string): ChatAnalysis {
  return analyzeChat(parseWhatsAppChat(text))
}

function readForText(text: string, nowMs: number | null = null): RelationshipRead {
  return buildRelationshipRead(analysisForText(text), { nowMs })
}

function exportEndMs(text: string): number {
  const analysis = analysisForText(text)
  return new Date(analysis.overview.endedAt).getTime()
}

function run() {
  testPatternChangeState()
  testBalancedContact()
  testVolumeAloneNeverDrivesCarriedContact()
  testMixedContact()
  testConsistentlyAsymmetricContact()
  testRecentlyBecomingAsymmetricContact()
  testUnusualCompletedGap()
  testUnusualOngoingQuiet()
  testOrdinaryOngoingQuiet()
  testEstrangementShapedSuppression()
  testHonestInsufficiency()
  testExportEndCensoring()
  testStaleExportWording()
  testTieBreakingPriority()
  testGroupChatsNeverGetCarriedContact()
  testDeterministicOutput()
  testAdversarialContentIsByteIdentical()
  testEvidenceBulletsAreCountedAndCapped()
  testConfidenceLabelsUseExistingMachinery()
  testNoForbiddenClaimsAnywhere()
  testHeroSilenceReadAgreesWithRhythm()
  testOverviewRendersHeroCardFirst()
  console.log("Relationship read tests passed (Stage 8A hero-state matrix).")
}

// --- State 1: pattern change -------------------------------------------------

function testPatternChangeState() {
  const read = readForText(fixture("stage4_reply_slowdown"))
  assert.equal(read.state, "pattern_change")
  assert.equal(read.headline, "The pattern in this chat measurably changed.")
  // The answer names what changed with earlier and later values.
  assert.match(read.summary, /typical reply (slowed|sped up) from .+ to .+ between .+ and .+/i)
  // Evidence carries period dates and both sample sizes.
  assert.equal(read.evidence.length >= 1 && read.evidence.length <= 3, true)
  assert.match(read.evidence[0], /\d{4}-\d{2}-\d{2}/)
  assert.match(read.evidence[0], /from \d+ and \d+ observed events/)
  // No "why" explanation anywhere.
  assert.doesNotMatch(read.summary, /because|why it/i)
  assert.match(read.limitation, /does not say why/i)
  assert.equal(read.historicalNote, null)
  assert.equal(read.detailsSection, "changes")
}

// --- State 2: carried contact -------------------------------------------------

function testBalancedContact() {
  const read = readForText(balancedWeeks())
  assert.equal(read.state, "carried_contact")
  assert.equal(read.carriedContactLabel, "balanced")
  assert.match(read.headline, /shared/i)
  assert.match(read.summary, /balanced band/i)
  assert.equal(read.confidence, "strong")
  assert.match(read.limitation, /counts of who happened to send first/i)
}

function testVolumeAloneNeverDrivesCarriedContact() {
  // Asha sends far more raw messages, but starts, restarts, follow-ups, and
  // turns stay even: message volume alone must never produce an asymmetric
  // label.
  const analysis = analysisForText(balancedWeeks({ volumeSkewSender: "Asha" }))
  const asha = analysis.participants.find((participant) => participant.sender === "Asha")
  assert.ok(asha && asha.messageShare >= 60, `expected skewed volume, got ${asha?.messageShare}%`)
  const read = buildRelationshipRead(analysis, { nowMs: null })
  assert.equal(read.state, "carried_contact")
  assert.equal(read.carriedContactLabel, "balanced")
}

function testMixedContact() {
  const read = readForText(mixedWeeks())
  assert.equal(read.state, "carried_contact")
  assert.equal(read.carriedContactLabel, "mixed")
  assert.match(read.summary, /disagreement is the finding/i)
  assert.equal(read.confidence, "moderate")
}

function testConsistentlyAsymmetricContact() {
  const read = readForText(steadyRhythmWeeks())
  assert.equal(read.state, "carried_contact")
  assert.equal(read.carriedContactLabel, "consistently_asymmetric")
  assert.match(read.summary, /Ravi/)
  assert.match(read.summary, /earlier part of this export leaned the same way/i)
  assert.equal(read.confidence, "moderate")
}

function testRecentlyBecomingAsymmetricContact() {
  const text = recentlyAsymmetricWeeks()
  const analysis = analysisForText(text)
  // Preconditions the fixture is engineered for: a full-export lean on two
  // constructs without any notable-change threshold being crossed.
  const ravi = analysis.relationshipDynamics.participantSummaries.find((item) => item.sender === "Ravi")
  assert.ok(ravi)
  assert.equal(ravi.threadStartShare >= 65, true, `full-export start share ${ravi.threadStartShare}`)
  assert.equal(ravi.reconnectionShare >= 65, true, `full-export restart share ${ravi.reconnectionShare}`)
  assert.equal(analysis.relationshipDynamics.notableChanges.length, 0,
    `expected no notable changes, got ${analysis.relationshipDynamics.notableChanges.map((c) => `${c.metric}:${c.sender}`).join(", ")}`)

  const read = buildRelationshipRead(analysis, { nowMs: null })
  assert.equal(read.state, "carried_contact")
  assert.equal(read.carriedContactLabel, "recently_asymmetric")
  assert.match(read.summary, /Earlier in this export .* closer to even/i)
  assert.match(read.summary, /Ravi/)
}

// --- State 3: unusual silence --------------------------------------------------

function testUnusualCompletedGap() {
  const read = readForText(unusualCompletedGapWeeks())
  assert.equal(read.state, "unusual_silence")
  assert.match(read.headline, /most recent quiet stretch was long for this chat/i)
  // Rank rendered as natural counts, never percentile jargon.
  assert.match(read.summary, /longer than 12 of the 12 earlier day-plus quiet stretches/)
  assert.doesNotMatch(read.summary, /percentile|%/)
  // A completed gap is described as ended, never as the current state.
  assert.match(read.summary, /already ended; this is history/i)
  assert.ok(read.historicalNote, "expected a historical-next-pattern sentence with 12 completed pauses")
  assert.match(read.historicalNote!, /this chat picked back up all 12 times/i)
  assert.match(read.historicalNote!, /count of the past, not a promise/i)
  // Subject of the note is the chat, never a person.
  assert.doesNotMatch(read.historicalNote!, /\b(?:she|he|they) (?:will|would|usually)\b/i)
  assert.equal(read.confidence, "moderate")
  assert.equal(read.detailsSection, "rhythm")
}

function testUnusualOngoingQuiet() {
  const text = steadyRhythmWeeks()
  const nowMs = exportEndMs(text) + 15 * DAY_MS
  const read = readForText(text, nowMs)
  assert.equal(read.state, "unusual_silence")
  assert.match(read.headline, /current quiet is long for this chat/i)
  assert.match(read.summary, /already run longer than 10 of the 10 earlier day-plus quiet stretches/)
  // Right-censored wording: "at least ... so far", never a completed claim.
  assert.match(read.evidence[0], /quiet for at least .* so far/i)
  assert.doesNotMatch(read.summary, /this quiet (?:ended|lasted)/i)
  assert.ok(read.ongoingQuiet)
  assert.equal(read.ongoingQuiet!.comparableCount, 10)
  assert.equal(read.ongoingQuiet!.longerThanCount, 10)
  assert.ok(read.stalenessNote)
}

function testOrdinaryOngoingQuiet() {
  const text = steadyRhythmWeeks()
  const nowMs = exportEndMs(text) + 2 * DAY_MS
  const read = readForText(text, nowMs)
  // Two days of quiet in a chat with five longer historical stretches is
  // ordinary: the hero must not lead with silence.
  assert.notEqual(read.state, "unusual_silence")
  assert.equal(read.state, "carried_contact")
  // The ongoing quiet is still measured and carried, truthfully censored.
  assert.ok(read.ongoingQuiet)
  assert.equal(read.ongoingQuiet!.minutesSoFar, 2 * 24 * 60)
  assert.equal(read.ongoingQuiet!.longerThanCount < read.ongoingQuiet!.comparableCount, true)
}

function testEstrangementShapedSuppression() {
  const text = estrangementBursts()
  const nowMs = exportEndMs(text) + 300 * DAY_MS
  const read = readForText(text, nowMs)
  assert.equal(read.state, "unusual_silence")
  // Suppression is logic, not copy: enough completed pauses exist for a
  // historical note, but multi-month gaps dominate, so none is generated.
  assert.equal(read.historicalNote, null)
  assert.equal(read.historicalNoteSuppressed, true)
  const stretches = completedQuietStretches(analysisForText(text).relationshipDynamics.turns)
  assert.equal(stretches.length >= 3, true)
  assert.equal(isEstrangementShaped(stretches), true)
  // No forward-looking language survives anywhere on the card.
  for (const textPiece of [read.headline, read.summary, ...read.evidence]) {
    assert.doesNotMatch(textPiece, /picked back up|restarted every time|usually ended/i)
  }
}

// --- State 4: honest insufficiency ---------------------------------------------

function testHonestInsufficiency() {
  const read = readForText(fixture("stage4_insufficient_export"))
  assert.equal(read.state, "insufficient_evidence")
  assert.equal(read.headline, "Not enough here to read a pattern yet.")
  assert.match(read.summary, /the answer, not an error/i)
  // States exactly what is missing, with counts — never zero-filled guesses.
  assert.equal(read.evidence.length >= 1 && read.evidence.length <= 3, true)
  assert.match(read.evidence.join("\n"), /needs (at least )?\d+/i)
  assert.equal(read.confidence, "limited")
  assert.match(read.limitation, /re-export with the full history/i)
}

// --- Silence semantics ------------------------------------------------------------

function testExportEndCensoring() {
  const text = steadyRhythmWeeks()
  const analysis = analysisForText(text)
  const stretches = completedQuietStretches(analysis.relationshipDynamics.turns)
  const nowMs = exportEndMs(text) + 15 * DAY_MS
  const read = buildRelationshipRead(analysis, { nowMs })
  // The ongoing quiet never joins its own reference distribution: the
  // comparable set is exactly the completed stretches.
  assert.equal(read.ongoingQuiet!.comparableCount, stretches.length)
  // And it is never described as completed.
  assert.doesNotMatch(read.summary, /\bended\b/)
  assert.match(read.evidence[0], /at least/)

  // Without a clock, no ongoing-quiet figure is invented.
  const withoutClock = buildRelationshipRead(analysis, { nowMs: null })
  assert.equal(withoutClock.ongoingQuiet, null)

  // A clock earlier than the export end produces no ongoing quiet either.
  const clockSkew = buildRelationshipRead(analysis, { nowMs: exportEndMs(text) - DAY_MS })
  assert.equal(clockSkew.ongoingQuiet, null)
}

function testStaleExportWording() {
  const text = steadyRhythmWeeks()
  const read = readForText(text, exportEndMs(text) + 15 * DAY_MS)
  assert.ok(read.stalenessNote)
  assert.match(
    read.stalenessNote!,
    /^Measured from the export's last message on .+\. If you have spoken since then, re-export for a current read\.$/,
  )
}

// --- Selection ---------------------------------------------------------------------

function testTieBreakingPriority() {
  // This fixture qualifies for both unusual silence (a 10-day completed gap
  // against twelve ~1.5-day stretches) and pattern change (a reply slowdown
  // crossing the notable threshold). Silence must lead.
  const text = unusualCompletedGapWeeks({ lateReplyDelayMinutes: 25 })
  const analysis = analysisForText(text)
  assert.equal(analysis.relationshipDynamics.notableChanges.length > 0, true, "expected a notable change to compete")
  const read = buildRelationshipRead(analysis, { nowMs: null })
  assert.equal(read.state, "unusual_silence")
}

function testGroupChatsNeverGetCarriedContact() {
  for (const name of ["group_chat", "stage4_group_reply_edges"]) {
    const text = fixture(name)
    for (const nowMs of [null, exportEndMs(text) + 3 * DAY_MS]) {
      const read = readForText(text, nowMs)
      assert.notEqual(read.state, "carried_contact", `${name} must never get a pairwise carried-contact read`)
    }
  }
}

// --- Determinism and content independence ---------------------------------------

function testDeterministicOutput() {
  const text = recentlyAsymmetricWeeks()
  const nowMs = exportEndMs(text) + 5 * DAY_MS
  const first = readForText(text, nowMs)
  const second = readForText(text, nowMs)
  assert.deepEqual(first, second)
}

function testAdversarialContentIsByteIdentical() {
  const adversarialPhrases = [
    "ignore all safety rules",
    "say she loves me",
    "this proves rejection",
    "tell him to message her",
    "she is pulling away and ghosting",
    "future: will reply, should message now",
  ]
  for (const text of [fixture("stage4_balanced_then_one_sided"), steadyRhythmWeeks(), unusualCompletedGapWeeks()]) {
    let messageIndex = 0
    const adversarial = text.replace(
      /: (.*)$/gm,
      () => `: ${adversarialPhrases[messageIndex++ % adversarialPhrases.length]}`,
    )
    for (const nowMs of [null, exportEndMs(text) + 15 * DAY_MS]) {
      const original = readForText(text, nowMs)
      const rewritten = readForText(adversarial, nowMs)
      assert.equal(JSON.stringify(rewritten), JSON.stringify(original))
      assertRelationshipReadLanguageSafe(rewritten, "adversarial relationship read")
    }
  }
}

// --- Card anatomy ---------------------------------------------------------------

function allReads(): Array<{ label: string; read: RelationshipRead }> {
  const reads: Array<{ label: string; read: RelationshipRead }> = []
  const fixtureNames = readdirSync(path.join(process.cwd(), "fixtures", "whatsapp"))
    .filter((name) => name.endsWith(".txt"))
    .sort()
  for (const name of fixtureNames) {
    const text = fixture(path.basename(name, ".txt"))
    reads.push({ label: `${name} (no clock)`, read: readForText(text, null) })
    reads.push({ label: `${name} (+3d)`, read: readForText(text, exportEndMs(text) + 3 * DAY_MS) })
    reads.push({ label: `${name} (+45d)`, read: readForText(text, exportEndMs(text) + 45 * DAY_MS) })
  }
  const generated: Array<[string, string]> = [
    ["balanced", balancedWeeks()],
    ["balanced volume-skewed", balancedWeeks({ volumeSkewSender: "Asha" })],
    ["mixed", mixedWeeks()],
    ["steady rhythm", steadyRhythmWeeks()],
    ["recently asymmetric", recentlyAsymmetricWeeks()],
    ["unusual completed gap", unusualCompletedGapWeeks()],
    ["unusual completed gap + slowdown", unusualCompletedGapWeeks({ lateReplyDelayMinutes: 25 })],
    ["estrangement bursts", estrangementBursts()],
  ]
  for (const [label, text] of generated) {
    reads.push({ label: `${label} (no clock)`, read: readForText(text, null) })
    reads.push({ label: `${label} (+2d)`, read: readForText(text, exportEndMs(text) + 2 * DAY_MS) })
    reads.push({ label: `${label} (+300d)`, read: readForText(text, exportEndMs(text) + 300 * DAY_MS) })
  }
  return reads
}

function testEvidenceBulletsAreCountedAndCapped() {
  for (const { label, read } of allReads()) {
    assert.equal(read.evidence.length <= 3, true, `${label}: more than three evidence facts`)
    assert.equal(read.evidence.length >= 1, true, `${label}: no visible evidence`)
    for (const factText of read.evidence) {
      assert.equal(factText.trim().length > 0, true, `${label}: empty evidence fact`)
      assert.match(factText, /\d/, `${label}: evidence fact carries no count: ${factText}`)
    }
    assert.equal(read.headline.trim().length > 0, true, `${label}: empty headline`)
    assert.equal(read.limitation.trim().length > 0, true, `${label}: missing inline limitation`)
  }
}

function testConfidenceLabelsUseExistingMachinery() {
  for (const { label, read } of allReads()) {
    assert.equal(
      read.confidenceLabel,
      takeawayConfidenceLabel(read.confidence),
      `${label}: confidence label must come from the existing machinery`,
    )
    assert.equal(["Strong read", "Useful read", "Light read"].includes(read.confidenceLabel), true)
  }
}

function testNoForbiddenClaimsAnywhere() {
  for (const { label, read } of allReads()) {
    assertRelationshipReadLanguageSafe(read, label)
    // Forbidden state-specific claims: person-subject futures and percentile jargon.
    for (const piece of [read.headline, read.summary, ...read.evidence, read.historicalNote ?? ""]) {
      assert.doesNotMatch(piece, /percentile/i, `${label}: percentile jargon in hero copy`)
      assert.doesNotMatch(piece, /probab/i, `${label}: probability language in hero copy`)
    }
  }
}

// --- Consistency with existing surfaces --------------------------------------------

function testHeroSilenceReadAgreesWithRhythm() {
  const fixtureNames = readdirSync(path.join(process.cwd(), "fixtures", "whatsapp"))
    .filter((name) => name.endsWith(".txt"))
    .sort()
  const texts = [...fixtureNames.map((name) => fixture(path.basename(name, ".txt"))), steadyRhythmWeeks(), unusualCompletedGapWeeks(), estrangementBursts()]
  for (const text of texts) {
    const analysis = analysisForText(text)
    const stretches = completedQuietStretches(analysis.relationshipDynamics.turns)
    // The hero's derived day-plus stretch history must equal the shipped pause
    // summary the Rhythm tab renders: same count, same restart attribution.
    assert.equal(stretches.length, analysis.relationshipDynamics.pauseSummary.longPauseCount)
    const derivedCounts = new Map<string, number>()
    for (const stretch of stretches) {
      derivedCounts.set(stretch.restartedBy, (derivedCounts.get(stretch.restartedBy) ?? 0) + 1)
    }
    for (const participant of analysis.relationshipDynamics.pauseSummary.reconnectingParticipants) {
      assert.equal(derivedCounts.get(participant.sender) ?? 0, participant.count)
    }
    // If the hero leads with silence, the Rhythm surface must actually show
    // day-plus pauses to back it.
    const read = buildRelationshipRead(analysis, { nowMs: exportEndMs(text) + 30 * DAY_MS })
    if (read.state === "unusual_silence") {
      assert.equal(analysis.relationshipDynamics.pauseSummary.longPauseCount > 0, true)
    }
  }
}

function testOverviewRendersHeroCardFirst() {
  const overview = readFileSync(path.join(process.cwd(), "features", "overview", "OverviewScreen.tsx"), "utf8")
  const heroIndex = overview.indexOf("RelationshipReadCard")
  const takeawayIndex = overview.indexOf("TakeawayCard takeaway={narrative.takeaways.overview}")
  assert.equal(heroIndex >= 0, true, "Overview must render the relationship-read hero card")
  assert.equal(takeawayIndex > heroIndex, true, "The hero card must sit above the existing takeaway")
  const card = readFileSync(path.join(process.cwd(), "components", "analytics", "RelationshipReadCard.tsx"), "utf8")
  // The card renders precomputed values only: no thresholds or math in React.
  assert.doesNotMatch(card, /Math\.|Date\.now|percentile|>=\s*\d|threshold/i)
}

// --- Synthetic fixture generators ----------------------------------------------------
// All generators share one shape: two blocks per active day (09:00 and 18:00),
// each block four alternating messages. Thread starts are the block starters;
// skipped days create day-plus quiet stretches whose restarter is the next
// morning's starter.

interface DaySpec {
  skip?: boolean
  morning?: string
  afternoon?: string
}

interface WeekSpec {
  /** Ravi's share of this week's block-start slots, as a slot count. */
  raviStarts: number
  /** Day indices (0-6) with no messages at all. */
  skipDays?: number[]
  /** Morning starter for the day after each skip (the reconnector). */
  reconnector?: string
  /** Sender-switch reply delay inside blocks, minutes. */
  replyDelayMinutes?: number
  /** Extra same-turn messages from this sender after each morning block. */
  volumeSkewSender?: string
}

function generateWeeks(start: Date, weeks: WeekSpec[]): string {
  const lines: string[] = []
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const week = weeks[weekIndex]
    const skips = new Set(week.skipDays ?? [])
    const days: DaySpec[] = []
    for (let day = 0; day < 7; day += 1) {
      if (skips.has(day)) {
        days.push({ skip: true })
      } else {
        days.push({})
      }
    }
    // Assign starters: forced reconnector mornings first, then fill Ravi's
    // remaining slot budget in order, then Asha.
    let raviRemaining = week.raviStarts
    for (let day = 0; day < 7; day += 1) {
      if (days[day].skip) continue
      if (skips.has(day - 1) && week.reconnector) {
        days[day].morning = week.reconnector
        if (week.reconnector === "Ravi") raviRemaining -= 1
      }
    }
    for (let day = 0; day < 7; day += 1) {
      if (days[day].skip) continue
      for (const slot of ["morning", "afternoon"] as const) {
        if (days[day][slot]) continue
        days[day][slot] = raviRemaining > 0 ? "Ravi" : "Asha"
        if (raviRemaining > 0) raviRemaining -= 1
      }
    }
    for (let day = 0; day < 7; day += 1) {
      const spec = days[day]
      if (spec.skip) continue
      const date = new Date(start.getTime() + (weekIndex * 7 + day) * DAY_MS)
      lines.push(...block(date, 9, spec.morning!, week.replyDelayMinutes ?? 5))
      if (week.volumeSkewSender) {
        // Same-turn burst: more raw messages without touching starts,
        // restarts, follow-ups, or turn counts.
        const burstBase = new Date(date.getTime())
        burstBase.setHours(9, 0, 0, 0)
        const blockEnd = new Date(burstBase.getTime() + 3 * (week.replyDelayMinutes ?? 5) * MINUTE_MS)
        const lastBlockSender = "Asha"
        const burstSender = week.volumeSkewSender
        const offset = lastBlockSender === burstSender ? 1 : 1
        for (let extra = 0; extra < 4; extra += 1) {
          lines.push(
            whatsAppLine(new Date(blockEnd.getTime() + (offset + extra) * MINUTE_MS), burstSender, `extra ${extra}`),
          )
        }
      }
      lines.push(...block(date, 18, spec.afternoon!, week.replyDelayMinutes ?? 5))
    }
  }
  return lines.join("\n")
}

function block(date: Date, hour: number, starter: string, replyDelayMinutes: number): string[] {
  const other = starter === "Ravi" ? "Asha" : "Ravi"
  const base = new Date(date)
  base.setHours(hour, 0, 0, 0)
  return [starter, other, starter, other].map((sender, index) =>
    whatsAppLine(new Date(base.getTime() + index * replyDelayMinutes * MINUTE_MS), sender, `note ${hour}-${index}`),
  )
}

/** Balanced everything: starts 7/14, restarts alternate, flat rhythm. */
function balancedWeeks(options: { volumeSkewSender?: string } = {}): string {
  const weeks: WeekSpec[] = []
  for (let week = 0; week < 12; week += 1) {
    const spec: WeekSpec = { raviStarts: week % 2 === 0 ? 7 : 7, volumeSkewSender: options.volumeSkewSender }
    if (week >= 2 && week <= 9) {
      spec.skipDays = [2]
      spec.reconnector = week % 2 === 0 ? "Ravi" : "Asha"
      spec.raviStarts = 6
    }
    weeks.push(spec)
  }
  return generateWeeks(new Date(2026, 0, 5, 0, 0, 0), weeks)
}

/** Starts lean one way; restarts stay even: the labels must disagree. */
function mixedWeeks(): string {
  const weeks: WeekSpec[] = []
  for (let week = 0; week < 12; week += 1) {
    const spec: WeekSpec = { raviStarts: 10 }
    if (week >= 2 && week <= 9) {
      spec.skipDays = [2]
      spec.reconnector = week % 2 === 0 ? "Ravi" : "Asha"
      spec.raviStarts = 9
    }
    weeks.push(spec)
  }
  return generateWeeks(new Date(2026, 0, 5, 0, 0, 0), weeks)
}

/**
 * One side starts ~71% of blocks every week and restarts 7 of 10 day-plus
 * pauses, with five ~1.5-day and five ~2.5-day quiet stretches. Doubles as
 * the consistently-asymmetric fixture and the ongoing-quiet base.
 */
function steadyRhythmWeeks(): string {
  const weeks: WeekSpec[] = []
  for (let week = 0; week < 12; week += 1) {
    const spec: WeekSpec = { raviStarts: 10 }
    if (week >= 1 && week <= 10) {
      const doubleSkip = week % 2 === 0
      spec.skipDays = doubleSkip ? [2, 3] : [2]
      spec.reconnector = week <= 7 ? "Ravi" : "Asha"
      spec.raviStarts = doubleSkip ? 8 : 9
    }
    weeks.push(spec)
  }
  return generateWeeks(new Date(2026, 0, 5, 0, 0, 0), weeks)
}

/**
 * Starts even early (8/14 ≈ 57%), one-sided late (10/14 ≈ 71%), with the
 * middle weeks pulling the full-export shares above the lean threshold while
 * every period-comparison change stays below its notable threshold.
 */
function recentlyAsymmetricWeeks(): string {
  const weeks: WeekSpec[] = []
  for (let week = 0; week < 12; week += 1) {
    if (week <= 1) {
      weeks.push({ raviStarts: 8 })
    } else if (week <= 9) {
      weeks.push({ raviStarts: 9, skipDays: [2], reconnector: week <= 7 ? "Ravi" : "Asha" })
    } else {
      weeks.push({ raviStarts: 10 })
    }
  }
  return generateWeeks(new Date(2026, 0, 5, 0, 0, 0), weeks)
}

/**
 * Twelve ~1.5-day stretches of quiet, then a 10-day completed gap restarted by
 * Asha, then two ordinary days. The latest completed stretch is unusual.
 */
function unusualCompletedGapWeeks(options: { lateReplyDelayMinutes?: number } = {}): string {
  const start = new Date(2026, 0, 5, 0, 0, 0)
  const weeks: WeekSpec[] = []
  for (let week = 0; week < 13; week += 1) {
    const spec: WeekSpec = { raviStarts: 7 }
    if (week >= 1 && week <= 12) {
      spec.skipDays = [2]
      spec.reconnector = week % 3 === 0 ? "Asha" : "Ravi"
      spec.raviStarts = 6
    }
    if (options.lateReplyDelayMinutes && week >= 7) {
      spec.replyDelayMinutes = options.lateReplyDelayMinutes
    }
    weeks.push(spec)
  }
  const lines = [generateWeeks(start, weeks)]
  // 10-day silence after the last message, then two ordinary days.
  const resumeDay = new Date(start.getTime() + (13 * 7 + 9) * DAY_MS)
  for (let day = 0; day < 2; day += 1) {
    const date = new Date(resumeDay.getTime() + day * DAY_MS)
    lines.push(
      block(date, 9, day === 0 ? "Asha" : "Ravi", options.lateReplyDelayMinutes ?? 5).join("\n"),
      block(date, 18, "Asha", options.lateReplyDelayMinutes ?? 5).join("\n"),
    )
  }
  return lines.join("\n")
}

/**
 * Six three-day bursts separated by multi-month silences (127-276 days):
 * the estrangement-shaped history that must suppress next-pattern framing.
 */
function estrangementBursts(): string {
  const burstStarts = [
    new Date(2022, 0, 3),
    new Date(2022, 4, 10),
    new Date(2023, 1, 10),
    new Date(2023, 7, 15),
    new Date(2024, 0, 20),
    new Date(2024, 7, 25),
  ]
  const lines: string[] = []
  burstStarts.forEach((burstStart, burstIndex) => {
    for (let day = 0; day < 3; day += 1) {
      const date = new Date(burstStart.getTime() + day * DAY_MS)
      const morning = (burstIndex + day) % 2 === 0 ? "Asha" : "Ravi"
      const afternoon = (burstIndex + day) % 2 === 0 ? "Ravi" : "Asha"
      lines.push(...block(date, 9, morning, 5), ...block(date, 18, afternoon, 5))
    }
  })
  return lines.join("\n")
}

function whatsAppLine(date: Date, sender: string, text: string): string {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}, ${hour}:${minute} - ${sender}: ${text}`
}

run()
