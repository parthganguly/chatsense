import type { ChatAnalysis } from "./chat-analyzer"
import {
  NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT,
  NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT,
  NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS,
  NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS,
  NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS,
  NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT,
  READ_ESTRANGEMENT_DOMINANCE_MIN_SHARE_PCT,
  READ_ESTRANGEMENT_PAUSE_MIN_DAYS,
  READ_MIN_AGREEING_CONSTRUCTS,
  READ_MIN_COMPARABLE_PAUSES_TO_RANK,
  READ_NEXT_PATTERN_MIN_COMPLETED_PAUSES,
  READ_STRONG_COMPARABLE_PAUSES,
  READ_UNUSUAL_RANK_MIN_SHARE_PCT,
  READ_USEFUL_COMPARABLE_PAUSES,
  RECONNECTION_GAP_MIN,
} from "./contract"
import { takeawayConfidenceLabel, type TakeawayConfidence } from "./human-takeaway"
import type { NarrativeSectionKey } from "./insight-narrative"
import type {
  ConversationTurn,
  DynamicsComparison,
  MetricChange,
  ParticipantDynamicsSummary,
} from "./relationship-dynamics"

/**
 * Stage 8A relationship read.
 *
 * One deterministic, answer-shaped hero read over metrics the engine already
 * computes. This is a pure mapping/aggregation layer: it derives no new
 * behavioral math beyond trivially-counted quantities (completed day-plus
 * quiet stretches read off existing conversation turns, and the right-censored
 * "quiet so far" from the export's last message to a caller-supplied clock).
 * It inspects no message content, states no motive, emotion, attachment or
 * relationship-status claim, and never predicts what a person does.
 *
 * Four states. The strongest supported state leads: each state qualifies only
 * when its own evidence bar is met, and among qualified states the priority is
 * unusual silence → pattern change → carried contact (the acute question
 * outranks the chronic one; every card still carries its own confidence
 * label). Honest insufficiency is a designed first-class answer when no
 * substantive state qualifies, never an error.
 */

export type RelationshipReadState =
  | "unusual_silence"
  | "pattern_change"
  | "carried_contact"
  | "insufficient_evidence"

export type CarriedContactLabel =
  | "balanced"
  | "mixed"
  | "consistently_asymmetric"
  | "recently_asymmetric"
  | "insufficient"

/** A completed quiet stretch of at least the 24h reconnection floor. */
export interface CompletedQuietStretch {
  startedAt: string
  endedAt: string
  durationMinutes: number
  /** Sender of the first message after the stretch. */
  restartedBy: string
}

/**
 * The quiet running from the export's last message to the supplied clock.
 * Right-censored: it has lasted *at least* this long inside the export's
 * horizon, it never joins its own reference distribution, and it must never
 * be described as a completed gap.
 */
export interface OngoingQuiet {
  /** Minutes from the export's last message to the supplied device time. */
  minutesSoFar: number
  /** ISO timestamp of the export's last message. */
  sinceIso: string
  /** Completed day-plus stretches it was ranked against. */
  comparableCount: number
  /** How many of those completed stretches it has already outlasted. */
  longerThanCount: number
}

export interface RelationshipRead {
  state: RelationshipReadState
  carriedContactLabel: CarriedContactLabel | null
  /** One direct headline. */
  headline: string
  /** One short answer-shaped explanation. */
  summary: string
  /** Up to three dated, counted evidence facts. */
  evidence: string[]
  /**
   * Historical-next-pattern sentence. Subject is always the chat/pattern,
   * never a person. Null when unsupported or suppressed.
   */
  historicalNote: string | null
  /**
   * True when enough completed pauses existed for a historical note but the
   * pause history is estrangement-shaped, so forward-looking framing is
   * disabled in code rather than copy.
   */
  historicalNoteSuppressed: boolean
  confidence: TakeawayConfidence
  confidenceLabel: string
  /** One inline limitation; rendered inside the card so screenshots keep it. */
  limitation: string
  /** Staleness line; present whenever the read leans on the export's end. */
  stalenessNote: string | null
  /** Ongoing right-censored quiet, when a device clock was supplied. */
  ongoingQuiet: OngoingQuiet | null
  /** Which existing analytics tab holds the detailed evidence. */
  detailsSection: NarrativeSectionKey
}

export interface RelationshipReadOptions {
  /**
   * Device clock in epoch milliseconds used only for the right-censored
   * "quiet so far" figure. Pass null (or omit) to skip the ongoing-quiet
   * reading entirely; the read stays deterministic for a fixed value.
   */
  nowMs?: number | null
}

export function buildRelationshipRead(
  analysis: ChatAnalysis,
  options: RelationshipReadOptions = {},
): RelationshipRead {
  const nowMs = options.nowMs ?? null
  if (analysis.overview.messageCount === 0) return emptyRead()

  const stretches = completedQuietStretches(analysis.relationshipDynamics.turns)
  const ongoingQuiet = deriveOngoingQuiet(analysis.overview.endedAt, nowMs, stretches)

  // Priority among qualified states: silence → change → carried contact.
  return (
    silenceState(analysis, stretches, ongoingQuiet) ??
    patternChangeState(analysis, ongoingQuiet) ??
    carriedContactState(analysis, ongoingQuiet) ??
    insufficiencyState(analysis, stretches, ongoingQuiet)
  )
}

// --- Derived quiet-stretch history ----------------------------------------

/**
 * Completed quiet stretches of at least the 24h reconnection floor, read off
 * existing conversation turns. Any inter-message gap at or above the floor is
 * also a turn boundary (the floor exceeds the thread-gap threshold), so the
 * turn list carries every such gap; this derives, it does not re-measure.
 */
export function completedQuietStretches(turns: ConversationTurn[]): CompletedQuietStretch[] {
  const stretches: CompletedQuietStretch[] = []
  for (let index = 1; index < turns.length; index += 1) {
    const previousEnd = new Date(turns[index - 1].end)
    const nextStart = new Date(turns[index].start)
    const durationMinutes = Math.round(Math.max(0, (nextStart.getTime() - previousEnd.getTime()) / 60000))
    if (durationMinutes >= RECONNECTION_GAP_MIN) {
      stretches.push({
        startedAt: turns[index - 1].end,
        endedAt: turns[index].start,
        durationMinutes,
        restartedBy: turns[index].sender,
      })
    }
  }
  return stretches
}

function deriveOngoingQuiet(
  endedAtIso: string,
  nowMs: number | null,
  stretches: CompletedQuietStretch[],
): OngoingQuiet | null {
  if (nowMs === null || !endedAtIso) return null
  const endedAt = new Date(endedAtIso).getTime()
  if (!Number.isFinite(endedAt) || nowMs <= endedAt) return null
  const minutesSoFar = Math.round((nowMs - endedAt) / 60000)
  return {
    minutesSoFar,
    sinceIso: endedAtIso,
    comparableCount: stretches.length,
    longerThanCount: stretches.filter((stretch) => stretch.durationMinutes < minutesSoFar).length,
  }
}

/** True when multi-month silences dominate the completed pause history. */
export function isEstrangementShaped(stretches: CompletedQuietStretch[]): boolean {
  if (stretches.length === 0) return false
  const floorMinutes = READ_ESTRANGEMENT_PAUSE_MIN_DAYS * 24 * 60
  const multiMonth = stretches.filter((stretch) => stretch.durationMinutes >= floorMinutes).length
  return multiMonth > 0 && multiMonth * 100 >= READ_ESTRANGEMENT_DOMINANCE_MIN_SHARE_PCT * stretches.length
}

// --- State 3: unusual silence ----------------------------------------------

function silenceState(
  analysis: ChatAnalysis,
  stretches: CompletedQuietStretch[],
  ongoingQuiet: OngoingQuiet | null,
): RelationshipRead | null {
  const ongoing = qualifyOngoingQuiet(stretches, ongoingQuiet)
  if (ongoing) return ongoing

  return qualifyCompletedQuiet(analysis, stretches, ongoingQuiet)
}

function qualifyOngoingQuiet(
  stretches: CompletedQuietStretch[],
  ongoingQuiet: OngoingQuiet | null,
): RelationshipRead | null {
  if (!ongoingQuiet) return null
  if (ongoingQuiet.minutesSoFar < RECONNECTION_GAP_MIN) return null
  if (stretches.length < READ_MIN_COMPARABLE_PAUSES_TO_RANK) return null
  if (!rankIsUnusual(ongoingQuiet.longerThanCount, stretches.length)) return null

  const evidence = [
    `No messages appear after ${humanDate(ongoingQuiet.sinceIso)} in this export — quiet for at least ${humanDuration(ongoingQuiet.minutesSoFar)} so far.`,
    restartCompositionSentence(stretches),
    durationSpreadSentence(stretches),
  ]

  return {
    state: "unusual_silence",
    carriedContactLabel: null,
    headline: "The current quiet is long for this chat.",
    summary: `Counting from the export's last message, this quiet has already run longer than ${ongoingQuiet.longerThanCount} of the ${stretches.length} earlier day-plus quiet stretches in this export.`,
    evidence,
    ...historicalNoteFields(stretches),
    confidence: silenceConfidence(stretches.length),
    confidenceLabel: takeawayConfidenceLabel(silenceConfidence(stretches.length)),
    limitation:
      "Longer than usual is a timing fact from this export alone. It cannot say why this chat is quiet, and it cannot see messages, calls, or contact happening anywhere else.",
    stalenessNote: stalenessLine(ongoingQuiet.sinceIso),
    ongoingQuiet,
    detailsSection: "rhythm",
  }
}

function qualifyCompletedQuiet(
  analysis: ChatAnalysis,
  stretches: CompletedQuietStretch[],
  ongoingQuiet: OngoingQuiet | null,
): RelationshipRead | null {
  if (stretches.length < READ_MIN_COMPARABLE_PAUSES_TO_RANK + 1) return null
  const latest = stretches[stretches.length - 1]
  const earlier = stretches.slice(0, -1)
  if (earlier.length < READ_MIN_COMPARABLE_PAUSES_TO_RANK) return null
  const longerThan = earlier.filter((stretch) => stretch.durationMinutes < latest.durationMinutes).length
  if (!rankIsUnusual(longerThan, earlier.length)) return null

  const evidence = [
    `The most recent day-plus quiet stretch ran ${humanDuration(latest.durationMinutes)}, from ${humanDate(latest.startedAt)} to ${humanDate(latest.endedAt)}, and ended when ${latest.restartedBy} sent the next message.`,
    restartCompositionSentence(earlier),
    durationSpreadSentence(earlier),
  ]

  const confidence = silenceConfidence(earlier.length)
  return {
    state: "unusual_silence",
    carriedContactLabel: null,
    headline: "This chat's most recent quiet stretch was long for this chat.",
    summary: `The most recent completed quiet stretch was longer than ${longerThan} of the ${earlier.length} earlier day-plus quiet stretches in this export. It has already ended; this is history, not the current state.`,
    evidence,
    ...historicalNoteFields(earlier),
    confidence,
    confidenceLabel: takeawayConfidenceLabel(confidence),
    limitation:
      "Longer than usual is a timing fact from this export alone. It cannot say why the chat went quiet, and it cannot see messages, calls, or contact happening anywhere else.",
    stalenessNote: stalenessLine(analysis.overview.endedAt),
    ongoingQuiet,
    detailsSection: "rhythm",
  }
}

function rankIsUnusual(longerThanCount: number, referenceCount: number): boolean {
  return referenceCount > 0 && longerThanCount * 100 >= READ_UNUSUAL_RANK_MIN_SHARE_PCT * referenceCount
}

function silenceConfidence(referenceCount: number): TakeawayConfidence {
  if (referenceCount >= READ_STRONG_COMPARABLE_PAUSES) return "strong"
  if (referenceCount >= READ_USEFUL_COMPARABLE_PAUSES) return "moderate"
  return "limited"
}

function restartCompositionSentence(stretches: CompletedQuietStretch[]): string {
  const counts = new Map<string, number>()
  for (const stretch of stretches) {
    counts.set(stretch.restartedBy, (counts.get(stretch.restartedBy) ?? 0) + 1)
  }
  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )
  const top = ranked[0]
  const composition = top
    ? ` — ${top[1]} of those first messages came from ${top[0]}`
    : ""
  return `All ${stretches.length} earlier day-plus quiet stretches in this export ended with a new message${composition}.`
}

function durationSpreadSentence(stretches: CompletedQuietStretch[]): string {
  const durations = stretches.map((stretch) => stretch.durationMinutes)
  const typical = median(durations)
  const longest = Math.max(...durations)
  return `Earlier day-plus quiet stretches typically ran ${humanDuration(typical ?? longest)}; the longest ran ${humanDuration(longest)}.`
}

function historicalNoteFields(
  completed: CompletedQuietStretch[],
): Pick<RelationshipRead, "historicalNote" | "historicalNoteSuppressed"> {
  if (completed.length < READ_NEXT_PATTERN_MIN_COMPLETED_PAUSES) {
    return { historicalNote: null, historicalNoteSuppressed: false }
  }
  if (isEstrangementShaped(completed)) {
    // Forward-looking framing is disabled as logic for estrangement-shaped
    // histories dominated by multi-month silences; the facts above remain.
    return { historicalNote: null, historicalNoteSuppressed: true }
  }
  const counts = new Map<string, number>()
  for (const stretch of completed) {
    counts.set(stretch.restartedBy, (counts.get(stretch.restartedBy) ?? 0) + 1)
  }
  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )
  const top = ranked[0]
  return {
    historicalNote: `After earlier day-plus pauses, this chat picked back up all ${completed.length} times inside this export — ${top[1]} of those restarts began with a message from ${top[0]}. That is a count of the past, not a promise about this quiet.`,
    historicalNoteSuppressed: false,
  }
}

// --- State 1: pattern change ------------------------------------------------

function patternChangeState(
  analysis: ChatAnalysis,
  ongoingQuiet: OngoingQuiet | null,
): RelationshipRead | null {
  const dynamics = analysis.relationshipDynamics
  const ranked = rankNotableChanges(dynamics.earlyLate, dynamics.recentPrior)
  if (ranked.length === 0) return null

  const primary = ranked[0]
  const confirmedTwice = hasSameChangeInBothComparisons(dynamics.earlyLate, dynamics.recentPrior)
  const distinctSignals = new Set(ranked.map((change) => `${change.metric}:${change.sender ?? ""}`)).size
  const confidence: TakeawayConfidence = confirmedTwice || distinctSignals >= 2 ? "strong" : "moderate"

  return {
    state: "pattern_change",
    carriedContactLabel: null,
    headline: "The pattern in this chat measurably changed.",
    summary: changeSummarySentence(primary),
    evidence: ranked.slice(0, 3).map(changeEvidenceSentence),
    historicalNote: null,
    historicalNoteSuppressed: false,
    confidence,
    confidenceLabel: takeawayConfidenceLabel(confidence),
    limitation:
      "A measured change describes timing and volume between compared periods of this export. It does not say why the pattern moved.",
    stalenessNote: stalenessLine(analysis.overview.endedAt),
    ongoingQuiet,
    detailsSection: "changes",
  }
}

function rankNotableChanges(earlyLate: DynamicsComparison, recentPrior: DynamicsComparison): MetricChange[] {
  const selected = new Map<string, MetricChange>()
  for (const comparison of [earlyLate, recentPrior]) {
    const notable = comparison.changes
      .filter((change) => change.notable && change.evidenceState === "sufficient")
      .sort(compareChangeMagnitude)
    for (const change of notable) {
      const key = `${change.metric}:${change.sender ?? "conversation"}`
      if (!selected.has(key)) selected.set(key, change)
    }
  }
  return [...selected.values()].sort(compareChangeMagnitude)
}

function compareChangeMagnitude(left: MetricChange, right: MetricChange): number {
  const difference = changeMagnitude(right) - changeMagnitude(left)
  if (difference !== 0) return difference
  if (left.metric !== right.metric) return left.metric.localeCompare(right.metric)
  return (left.sender ?? "").localeCompare(right.sender ?? "")
}

function changeMagnitude(change: MetricChange): number {
  if (change.metric === "median_reply_minutes") {
    const earlier = typeof change.earlierValue === "number" ? change.earlierValue : 0
    const later = typeof change.laterValue === "number" ? change.laterValue : 0
    if (earlier <= 0 || later <= 0) return 0
    return Math.max(later / earlier, earlier / later)
  }
  if (change.metric === "messages_per_active_day") return Math.abs(change.relativeDifferencePct ?? 0) / 30
  return Math.abs(change.absoluteDifference ?? 0) / 10
}

function hasSameChangeInBothComparisons(earlyLate: DynamicsComparison, recentPrior: DynamicsComparison): boolean {
  const keysFor = (comparison: DynamicsComparison) =>
    comparison.changes
      .filter((change) => change.notable && change.evidenceState === "sufficient")
      .map((change) => `${change.metric}:${change.sender ?? "conversation"}`)
  const earlyKeys = new Set(keysFor(earlyLate))
  return keysFor(recentPrior).some((key) => earlyKeys.has(key))
}

function changeSummarySentence(change: MetricChange): string {
  const earlier = metricValueText(change, change.earlierValue)
  const later = metricValueText(change, change.laterValue)
  const window = `between ${periodText(change.earlierPeriod)} and ${periodText(change.laterPeriod)}`
  if (change.metric === "median_reply_minutes") {
    const direction = change.direction === "slower" ? "slowed" : "sped up"
    return `${change.sender}'s typical reply ${direction} from ${earlier} to ${later} ${window}.`
  }
  if (change.metric === "messages_per_active_day") {
    const direction = change.direction === "decreased" ? "quieter" : "more active"
    return `This chat became ${direction}: ${earlier} to ${later} messages per active day ${window}.`
  }
  return `${changeSubject(change)} moved from ${earlier} to ${later} for ${change.sender} ${window}.`
}

function changeEvidenceSentence(change: MetricChange): string {
  const earlier = metricValueText(change, change.earlierValue)
  const later = metricValueText(change, change.laterValue)
  const subject = change.sender ? `${changeSubject(change)} (${change.sender})` : changeSubject(change)
  return `${subject}: ${earlier} in ${periodText(change.earlierPeriod)}, then ${later} in ${periodText(change.laterPeriod)} — from ${change.earlierSampleSize} and ${change.laterSampleSize} observed events.`
}

function changeSubject(change: MetricChange): string {
  const subjects: Record<MetricChange["metric"], string> = {
    messages_per_active_day: "Messages per active day",
    median_reply_minutes: "Typical reply time",
    thread_start_share: "Share of started conversations",
    reconnection_share: "Share of restarts after day-plus pauses",
    follow_up_rate: "Rate of following up before a reply",
    turn_share: "Share of conversation turns",
  }
  return subjects[change.metric]
}

function metricValueText(change: MetricChange, value: MetricChange["earlierValue"]): string {
  if (value === null) return "unavailable"
  if (typeof value === "string") return value
  if (change.metric === "median_reply_minutes") return humanDuration(value)
  if (change.metric === "messages_per_active_day") return String(value)
  return `${value}%`
}

function periodText(period: MetricChange["earlierPeriod"]): string {
  if (!period.start || !period.end) return period.label.toLowerCase()
  return period.start === period.end ? period.start : `${period.start} to ${period.end}`
}

// --- State 2: carried contact ------------------------------------------------

type ConstructVerdict =
  | { construct: string; state: "lean"; sender: string; sentence: string }
  | { construct: string; state: "balanced"; sentence: string }
  | { construct: string; state: "neutral"; sentence: string }

function carriedContactState(
  analysis: ChatAnalysis,
  ongoingQuiet: OngoingQuiet | null,
): RelationshipRead | null {
  // Group chats get participation facts elsewhere, never a pairwise
  // carried-contact read.
  if (analysis.overview.participantCount !== 2) return null
  const summaries = analysis.relationshipDynamics.participantSummaries
  if (summaries.length !== 2) return null

  const verdicts = evaluateConstructs(summaries, analysis.relationshipDynamics.pauseSummary.longPauseCount)
  if (verdicts.length < READ_MIN_AGREEING_CONSTRUCTS) return null

  const leans = verdicts.filter((verdict): verdict is Extract<ConstructVerdict, { state: "lean" }> => verdict.state === "lean")
  const balanced = verdicts.filter((verdict) => verdict.state === "balanced")
  const evidence = verdicts.slice(0, 3).map((verdict) => verdict.sentence)
  const base = {
    state: "carried_contact" as const,
    historicalNote: null,
    historicalNoteSuppressed: false,
    stalenessNote: null,
    ongoingQuiet,
    detailsSection: "people" as const,
    evidence,
  }
  const limitation =
    "Starting and restarting are counts of who happened to send first in this export. They do not measure anyone's reasons, and they cannot see contact that happens outside this chat."

  // Only a lean toward the other person contradicts an asymmetry read; a
  // construct inside the balanced band is the product's signature
  // "volume even, upkeep uneven" observation, not a contradiction.
  const leanSenders = new Set(leans.map((lean) => lean.sender))
  if (leans.length >= READ_MIN_AGREEING_CONSTRUCTS && leanSenders.size === 1) {
    const leader = leans[0].sender
    const stability = asymmetryStability(analysis.relationshipDynamics.earlyLate, leader)
    const confidence: TakeawayConfidence = leans.length >= 3 ? "strong" : "moderate"

    const leanDescription = joinPhrases(leans.map((lean) => leanPhrase(lean.construct)))
    if (stability === "stable") {
      return {
        ...base,
        carriedContactLabel: "consistently_asymmetric",
        headline: "One side has kept this chat moving.",
        summary: `${leader} ${leanDescription} — and the earlier part of this export leaned the same way as the later part.`,
        confidence,
        confidenceLabel: takeawayConfidenceLabel(confidence),
        limitation,
      }
    }
    if (stability === "recent") {
      return {
        ...base,
        carriedContactLabel: "recently_asymmetric",
        headline: "Keeping this chat moving recently shifted to one side.",
        summary: `Earlier in this export these measures were closer to even; in the later period ${leader} ${leanDescription}.`,
        confidence,
        confidenceLabel: takeawayConfidenceLabel(confidence),
        limitation,
      }
    }
    // Lean without period evidence: keep the weaker claim (mixed-style read).
    return {
      ...base,
      carriedContactLabel: "mixed",
      headline: "The lean is one-sided, but the history is short.",
      summary: `${leader} ${leanDescription} in this export, but the export is too short to compare periods, so whether that has been steady cannot be said.`,
      confidence: "limited",
      confidenceLabel: takeawayConfidenceLabel("limited"),
      limitation,
    }
  }

  if (leans.length > 0) {
    const disagreement =
      leanSenders.size > 1
        ? joinPhrases(leans.map((lean) => `${lean.sender} ${leanPhrase(lean.construct)}`))
        : `${leans[0].sender} ${leanPhrase(leans[0].construct)}, while ${
            balanced.length > 0 ? balanced.map((verdict) => verdict.construct).join(" and ") : "the other measures"
          } stayed close to even`
    return {
      ...base,
      carriedContactLabel: "mixed",
      headline: "The keeping-in-touch picture is mixed.",
      summary: `${disagreement}. The measures disagree — that disagreement is the finding, not a fault.`,
      confidence: "moderate",
      confidenceLabel: takeawayConfidenceLabel("moderate"),
      limitation,
    }
  }

  if (balanced.length >= READ_MIN_AGREEING_CONSTRUCTS) {
    const confidence: TakeawayConfidence = balanced.length >= 3 ? "strong" : "moderate"
    const constructList = joinPhrases(balanced.map((verdict) => verdict.construct))
    return {
      ...base,
      carriedContactLabel: "balanced",
      headline: "Keeping this chat going has been shared.",
      summary: `Across ${balanced.length} measures — ${constructList} — neither side went above the balanced band in this export.`,
      confidence,
      confidenceLabel: takeawayConfidenceLabel(confidence),
      limitation,
    }
  }

  return null
}

function evaluateConstructs(
  summaries: ParticipantDynamicsSummary[],
  reconnectionTotal: number,
): ConstructVerdict[] {
  const verdicts: ConstructVerdict[] = []
  const threadStartsTotal = summaries.reduce((total, participant) => total + participant.threadStarts, 0)

  if (threadStartsTotal >= NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS) {
    const top = topBy(summaries, (participant) => participant.threadStartShare)
    const sentence = `Conversation starts: ${summaries
      .map((participant) => `${participant.threadStarts} by ${participant.sender}`)
      .join(", ")} (${threadStartsTotal} total).`
    verdicts.push(shareVerdict("conversation starts", top.sender, top.threadStartShare, sentence))
  }

  if (reconnectionTotal >= NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS) {
    const top = topBy(summaries, (participant) => participant.reconnectionShare)
    const sentence = `Restarts after day-plus pauses: ${summaries
      .map((participant) => `${participant.reconnectionCount} by ${participant.sender}`)
      .join(", ")} (${reconnectionTotal} total).`
    verdicts.push(shareVerdict("restarts after pauses", top.sender, top.reconnectionShare, sentence))
  }

  const followUpEligible = summaries.filter(
    (participant) =>
      participant.followUpRelevantTurnCount >= NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS &&
      participant.followUpRate !== null,
  )
  if (followUpEligible.length === summaries.length) {
    const top = topBy(followUpEligible, (participant) => participant.followUpRate ?? 0)
    const others = followUpEligible.filter((participant) => participant.sender !== top.sender)
    const topLeads =
      (top.followUpRate ?? 0) >= NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT &&
      others.every((participant) => (participant.followUpRate ?? 0) < NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT)
    const sentence = `Following up before a reply: ${followUpEligible
      .map((participant) => `${participant.followUpRate}% of ${participant.sender}'s relevant turns`)
      .join(", ")}.`
    if (topLeads) {
      verdicts.push({ construct: "follow-ups before a reply", state: "lean", sender: top.sender, sentence })
    } else if (followUpEligible.every((participant) => (participant.followUpRate ?? 0) <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT)) {
      verdicts.push({ construct: "follow-ups before a reply", state: "balanced", sentence })
    } else {
      verdicts.push({ construct: "follow-ups before a reply", state: "neutral", sentence })
    }
  }

  const turnTotal = summaries.reduce((total, participant) => total + participant.turnCount, 0)
  if (turnTotal > 0) {
    const top = topBy(summaries, (participant) => participant.turnShare)
    const sentence = `Share of conversation turns: ${summaries
      .map((participant) => `${participant.turnShare}% ${participant.sender}`)
      .join(", ")} (${turnTotal} turns).`
    verdicts.push(shareVerdict("turn share", top.sender, top.turnShare, sentence))
  }

  return verdicts
}

function shareVerdict(construct: string, sender: string, topShare: number, sentence: string): ConstructVerdict {
  if (topShare >= NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT) return { construct, state: "lean", sender, sentence }
  if (topShare <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT) return { construct, state: "balanced", sentence }
  return { construct, state: "neutral", sentence }
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? ""
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`
  return `${phrases.slice(0, -1).join(", ")}, and ${phrases.at(-1)}`
}

function leanPhrase(construct: string): string {
  if (construct === "conversation starts") return "started most conversations"
  if (construct === "restarts after pauses") return "sent most first messages after day-plus pauses"
  if (construct === "follow-ups before a reply") return "followed up before a reply most often"
  return "held most of the conversation turns"
}

/**
 * Stability of an asymmetry toward `leader` across the early/late comparison,
 * judged on the contact-keeping share metrics with sufficient evidence.
 */
function asymmetryStability(
  earlyLate: DynamicsComparison,
  leader: string,
): "stable" | "recent" | "unknown" {
  if (!earlyLate.available) return "unknown"
  const shareMetrics = new Set(["thread_start_share", "reconnection_share", "turn_share"])
  const leaderChanges = earlyLate.changes.filter(
    (change) =>
      change.sender === leader &&
      shareMetrics.has(change.metric) &&
      change.evidenceState === "sufficient" &&
      typeof change.earlierValue === "number" &&
      typeof change.laterValue === "number",
  )
  if (leaderChanges.length === 0) return "unknown"
  const earlierLean = leaderChanges.some(
    (change) => (change.earlierValue as number) >= NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT,
  )
  if (earlierLean) return "stable"
  const becameLean = leaderChanges.some(
    (change) =>
      (change.earlierValue as number) <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT &&
      (change.laterValue as number) >= NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT,
  )
  return becameLean ? "recent" : "unknown"
}

// --- State 4: honest insufficiency -------------------------------------------

function insufficiencyState(
  analysis: ChatAnalysis,
  stretches: CompletedQuietStretch[],
  ongoingQuiet: OngoingQuiet | null,
): RelationshipRead {
  const dynamics = analysis.relationshipDynamics
  const missing: string[] = []

  const spanDays = exportSpanDays(analysis.overview.startedAt, analysis.overview.endedAt)
  if (!dynamics.earlyLate.available) {
    const eligible = dynamics.adaptiveWindows.filter((bucket) => bucket.eligible).length
    missing.push(
      `${spanDays} ${spanDays === 1 ? "day" : "days"} of messages with ${eligible} eligible comparison ${eligible === 1 ? "window" : "windows"} — a period comparison needs 4.`,
    )
  }
  const threadStartsTotal = dynamics.participantSummaries.reduce(
    (total, participant) => total + participant.threadStarts,
    0,
  )
  if (threadStartsTotal < NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS) {
    missing.push(
      `${threadStartsTotal} conversation ${threadStartsTotal === 1 ? "start" : "starts"} — reading who starts contact needs at least ${NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS}.`,
    )
  }
  if (stretches.length < READ_MIN_COMPARABLE_PAUSES_TO_RANK) {
    missing.push(
      `${stretches.length} completed day-plus quiet ${stretches.length === 1 ? "stretch" : "stretches"} — ranking a quiet needs at least ${READ_MIN_COMPARABLE_PAUSES_TO_RANK}.`,
    )
  }
  const maxReplies = Math.max(0, ...dynamics.participantSummaries.map((participant) => participant.replySampleCount))
  if (maxReplies < 5) {
    missing.push(`${maxReplies} observed replies for the most active participant — reply-timing reads need at least 5 per compared period.`)
  }

  return {
    state: "insufficient_evidence",
    carriedContactLabel: null,
    headline: "Not enough here to read a pattern yet.",
    summary:
      "This export is too short or too sparse for an honest pattern read. That is the answer, not an error — nothing is filled in with a guess.",
    evidence: missing.slice(0, 3),
    historicalNote: null,
    historicalNoteSuppressed: false,
    confidence: "limited",
    confidenceLabel: takeawayConfidenceLabel("limited"),
    limitation:
      "If the chat is older than this export, re-export with the full history for a fuller read. Nothing here means something is wrong.",
    stalenessNote: stalenessLine(analysis.overview.endedAt),
    ongoingQuiet,
    detailsSection: "overview",
  }
}

function emptyRead(): RelationshipRead {
  return {
    state: "insufficient_evidence",
    carriedContactLabel: null,
    headline: "Not enough here to read a pattern yet.",
    summary: "No valid messages were found in this export, so there is nothing to read.",
    evidence: ["0 valid messages were imported."],
    historicalNote: null,
    historicalNoteSuppressed: false,
    confidence: "limited",
    confidenceLabel: takeawayConfidenceLabel("limited"),
    limitation: "Import a WhatsApp export with valid messages to build this local read.",
    stalenessNote: null,
    ongoingQuiet: null,
    detailsSection: "overview",
  }
}

// --- Shared helpers -----------------------------------------------------------

function stalenessLine(endedAtIso: string): string | null {
  if (!endedAtIso) return null
  return `Measured from the export's last message on ${humanDate(endedAtIso)}. If you have spoken since then, re-export for a current read.`
}

function exportSpanDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0
  const start = new Date(startIso)
  const end = new Date(endIso)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.floor((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1
}

function topBy<T>(items: T[], value: (item: T) => number): T {
  return [...items].sort((left, right) => value(right) - value(left))[0]
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function humanDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function humanDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} ${Math.round(minutes) === 1 ? "minute" : "minutes"}`
  if (minutes < 1440) {
    const hours = Math.round((minutes / 60) * 10) / 10
    return `${hours} ${hours === 1 ? "hour" : "hours"}`
  }
  const days = Math.round((minutes / 1440) * 10) / 10
  return `${days} ${days === 1 ? "day" : "days"}`
}
