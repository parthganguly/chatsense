/**
 * Stage 8A study stimuli: deterministic synthetic fixtures + expected reads.
 *
 * Run from the repo root with TZ=UTC:
 *   TZ=UTC npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/generate-fixtures.ts
 *
 * Generated fixtures reuse the generator block of tests/relationship-read.ts
 * byte-for-byte (copied between the VERBATIM markers; the copy is asserted
 * against the source on every run). Two cards reuse committed fixtures from
 * fixtures/whatsapp/ unchanged. Expected RelationshipRead JSON comes from the
 * shipped @chatsense/core with the same frozen clock the browser capture uses.
 */
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { analyzeChat, buildRelationshipRead, parseWhatsAppChat } from "@chatsense/core"

const STIMULI = path.join(process.cwd(), "docs", "studies", "stage8a", "2026-10-24-v1", "stimuli")
// Same constants as tests/relationship-read.ts lines 17-18 (used by the copied generators).
const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS
const HOUR_MS = 60 * MINUTE_MS

assert.equal(new Date(2026, 0, 5).getTimezoneOffset(), 0, "run with TZ=UTC")

// Prove the generator block below is the unchanged test-suite generator code.
const self = readFileSync(path.join(STIMULI, "scripts", "generate-fixtures.ts"), "utf8")
const copied = self.split("// BEGIN VERBATIM tests/relationship-read.ts lines 421-644\n")[1].split("// END VERBATIM")[0]
const source = readFileSync(path.join(process.cwd(), "tests", "relationship-read.ts"), "utf8")
assert.equal(source.split("\n").slice(420, 644).join("\n") + "\n", copied, "generator copy drifted from tests/relationship-read.ts")

interface CardSpec {
  id: string
  card: number
  expectedState: string
  expectedCarriedContactLabel: string | null
  source: string
  text: string
  /** Frozen device clock offset from the export's last message. */
  clockOffsetMs: number
  clockRationale: string
}

const committed = (name: string) => readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", `${name}.txt`), "utf8")

const cards: CardSpec[] = [
  {
    id: "s8a-v1-c1-pattern-change",
    card: 1,
    expectedState: "pattern_change",
    expectedCarriedContactLabel: null,
    source: "fixtures/whatsapp/stage4_reply_slowdown.txt (committed, unchanged; tests/relationship-read.ts testPatternChangeState)",
    text: committed("stage4_reply_slowdown"),
    clockOffsetMs: HOUR_MS,
    clockRationale: "export end + 1 hour (below the 24h quiet floor, so no ongoing-quiet read)",
  },
  {
    id: "s8a-v1-c2-carried-balanced",
    card: 2,
    expectedState: "carried_contact",
    expectedCarriedContactLabel: "balanced",
    source: "balancedWeeks() from tests/relationship-read.ts (testBalancedContact)",
    text: balancedWeeks(),
    clockOffsetMs: HOUR_MS,
    clockRationale: "export end + 1 hour",
  },
  {
    id: "s8a-v1-c3-carried-mixed",
    card: 3,
    expectedState: "carried_contact",
    expectedCarriedContactLabel: "mixed",
    source: "mixedWeeks() from tests/relationship-read.ts (testMixedContact)",
    text: mixedWeeks(),
    clockOffsetMs: HOUR_MS,
    clockRationale: "export end + 1 hour",
  },
  {
    id: "s8a-v1-c4-unusual-silence",
    card: 4,
    expectedState: "unusual_silence",
    expectedCarriedContactLabel: null,
    source: "steadyRhythmWeeks() from tests/relationship-read.ts (testUnusualOngoingQuiet / testStaleExportWording)",
    text: steadyRhythmWeeks(),
    clockOffsetMs: 15 * 24 * HOUR_MS,
    clockRationale: "export end + 15 days: ongoing quiet longer than all 10 completed day-plus stretches, as in testUnusualOngoingQuiet",
  },
  {
    id: "s8a-v1-c5-insufficient",
    card: 5,
    expectedState: "insufficient_evidence",
    expectedCarriedContactLabel: null,
    source: "fixtures/whatsapp/stage4_insufficient_export.txt (committed, unchanged; tests/relationship-read.ts testHonestInsufficiency)",
    text: committed("stage4_insufficient_export"),
    clockOffsetMs: HOUR_MS,
    clockRationale: "export end + 1 hour",
  },
]

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex")
const index = cards.map((card) => {
  const analysis = analyzeChat(parseWhatsAppChat(card.text))
  const exportEndMs = new Date(analysis.overview.endedAt).getTime()
  const nowMs = exportEndMs + card.clockOffsetMs
  const read = buildRelationshipRead(analysis, { nowMs })
  assert.equal(read.state, card.expectedState, `${card.id}: state`)
  assert.equal(read.carriedContactLabel, card.expectedCarriedContactLabel, `${card.id}: carried label`)
  if (card.expectedState === "unusual_silence") {
    assert.ok(read.historicalNote, `${card.id}: historical note must be present`)
    assert.equal(read.historicalNoteSuppressed, false)
    assert.ok(read.stalenessNote)
  }
  writeFileSync(path.join(STIMULI, "fixtures", `${card.id}.txt`), card.text)
  const expectedJson = JSON.stringify(read, null, 2) + "\n"
  writeFileSync(path.join(STIMULI, "expected", `${card.id}.relationship-read.json`), expectedJson)
  return {
    id: card.id,
    card: card.card,
    expectedState: card.expectedState,
    expectedCarriedContactLabel: card.expectedCarriedContactLabel,
    source: card.source,
    fixture: `fixtures/${card.id}.txt`,
    fixtureSha256: sha256(card.text),
    messageCount: analysis.overview.messageCount,
    exportStartedAt: analysis.overview.startedAt,
    exportEndedAt: analysis.overview.endedAt,
    frozenNowMs: nowMs,
    frozenNowIso: new Date(nowMs).toISOString(),
    clockRationale: card.clockRationale,
    expectedRead: `expected/${card.id}.relationship-read.json`,
    expectedReadSha256: sha256(expectedJson),
  }
})
writeFileSync(path.join(STIMULI, "expected", "cards.json"), JSON.stringify(index, null, 2) + "\n")
console.log(index.map((card) => `${card.id} ${card.expectedState} now=${card.frozenNowIso}`).join("\n"))

// BEGIN VERBATIM tests/relationship-read.ts lines 421-644
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
// END VERBATIM
