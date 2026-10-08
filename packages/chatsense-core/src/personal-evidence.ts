/**
 * Internal, ephemeral evidence table across deliberately selected exports.
 *
 * Reads only typed counts/timings from already computed `ChatAnalysis` values
 * plus an explicit selection record. Never reads message text, narratives, or
 * Relationship Read output; never pools, ranks, scores, or persists anything.
 * Not exported from `index.ts`: the sole caller is `tests/personal-evidence.ts`.
 * Scope and rules: `docs/product/personal-model-first-slice.md`.
 */
import type { ChatAnalysis } from "./chat-analyzer"
import {
  MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
  MIN_REPLY_LATENCY_PER_PARTICIPANT,
  NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS,
  NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS,
} from "./contract"
import type { EvidenceState, ParticipantDynamicsSummary } from "./relationship-dynamics"

export const PERSONAL_EVIDENCE_TIMEZONE_STATUS = "source-offset-unknown; interpreted-in-host-zone"

export interface PersonalEvidenceProvenance {
  medium: "whatsapp"
  format: "txt" | "zip"
  parserRevision: string
  timezoneStatus: typeof PERSONAL_EVIDENCE_TIMEZONE_STATUS
  hostTimeZone: string
}

export interface PersonalEvidenceSelection {
  exportId: string
  conversationId: string
  selfSender: string
  provenance: PersonalEvidenceProvenance
  analysis: ChatAnalysis
}

export type PersonalEvidenceExclusionReason =
  | "missing_export_id"
  | "missing_conversation_id"
  | "duplicate_export_id"
  | "repeated_conversation_id"
  | "unknown_medium"
  | "unknown_format"
  | "invalid_provenance"
  | "invalid_coverage"
  | "invalid_counts"
  | "inconsistent_participants"
  | "unsupported_participant_count"
  | "missing_self_sender"
  | "self_sender_not_found"
  | "self_sender_ambiguous"

export interface ShareObservation {
  state: EvidenceState
  /** Exact self count. */
  numerator: number
  /** Exact opportunity count inside this export. */
  denominator: number
  /** Stored engine share; null when the denominator is zero. */
  sharePct: number | null
  minimum: number
}

export interface FollowUpObservation {
  state: EvidenceState
  /** Follow-up events; one turn can hold several, so this is NOT the rate numerator. */
  eventCount: number
  /** Eligible turns: the rate denominator. */
  eligibleTurnCount: number
  /** Stored percent of eligible turns containing any follow-up; null when unavailable. */
  ratePct: number | null
  minimum: number
}

export interface ReplyTimingObservation {
  state: EvidenceState
  medianMinutes: number | null
  sampleCount: number
  minimum: number
}

export interface PersonalEvidenceRow {
  exportId: string
  conversationId: string
  selfSender: string
  provenance: PersonalEvidenceProvenance
  coverage: { startedAt: string; endedAt: string }
  messageCount: number
  activeDays: number
  conversationStarts: ShareObservation
  restartsAfterDayPlusPauses: ShareObservation
  followUpsBeforeReply: FollowUpObservation
  replyTiming: ReplyTimingObservation
}

export type PersonalEvidenceEntry =
  | { index: number; status: "eligible"; row: PersonalEvidenceRow }
  | { index: number; status: "excluded"; exportId: string | null; reasons: PersonalEvidenceExclusionReason[] }

export interface PersonalEvidenceTable {
  state: "insufficient_selection" | "evidence_rows"
  /** Selection order; one entry per selection. Never merged, ranked, or pooled. */
  entries: PersonalEvidenceEntry[]
  limitations: readonly string[]
}

export const PERSONAL_EVIDENCE_LIMITATIONS: readonly string[] = [
  "Rows describe only the exports you selected; other chats and earlier or later history are not observed.",
  "Each row is one export. The number of rows is not a number of independent people or relationships.",
  "Rows are shown side by side and never combined, averaged, ranked, or scored.",
  "Exports with different conversation IDs are not checked for duplicate or overlapping history.",
  "Exports carry no source time zone; times were read in this device's zone, and windows are not aligned across exports.",
  "Calls, missing messages, and history outside an export are unobserved, not inactivity.",
  "Two-person exports only; group exports keep their single-chat view.",
]

export function buildPersonalEvidence(selections: readonly PersonalEvidenceSelection[]): PersonalEvidenceTable {
  const exportIdCounts = countValues(selections.map((selection) => selection?.exportId))
  const conversationIdCounts = countValues(selections.map((selection) => selection?.conversationId))

  const entries = selections.map((selection, index): PersonalEvidenceEntry => {
    const reasons: PersonalEvidenceExclusionReason[] = []
    const exportId = nonEmpty(selection?.exportId) ? selection.exportId : null
    const conversationId = nonEmpty(selection?.conversationId) ? selection.conversationId : null

    if (exportId === null) reasons.push("missing_export_id")
    else if (exportIdCounts.get(exportId)! > 1) reasons.push("duplicate_export_id")
    if (conversationId === null) reasons.push("missing_conversation_id")
    else if (conversationIdCounts.get(conversationId)! > 1) reasons.push("repeated_conversation_id")
    reasons.push(...provenanceReasons(selection?.provenance))

    const analysis = selection?.analysis
    const coverage = coverageOf(analysis)
    if (!coverage) reasons.push("invalid_coverage")
    const self = selfReasons(selection?.selfSender, analysis)
    reasons.push(...self.reasons)

    if (reasons.length > 0 || !coverage || !self.summary) {
      return { index, status: "excluded", exportId, reasons }
    }
    return {
      index,
      status: "eligible",
      row: buildRow(selection, coverage, self.summary, analysis),
    }
  })

  const eligible = entries.filter((entry) => entry.status === "eligible").length
  return {
    state: eligible < 2 ? "insufficient_selection" : "evidence_rows",
    entries,
    limitations: PERSONAL_EVIDENCE_LIMITATIONS,
  }
}

function buildRow(
  selection: PersonalEvidenceSelection,
  coverage: { startedAt: string; endedAt: string },
  self: ParticipantDynamicsSummary,
  analysis: ChatAnalysis,
): PersonalEvidenceRow {
  const summaries = analysis.relationshipDynamics.participantSummaries
  const startTotal = summaries.reduce((total, summary) => total + summary.threadStarts, 0)
  const pauseTotal = analysis.relationshipDynamics.pauseSummary.longPauseCount
  const { medium, format, parserRevision, timezoneStatus, hostTimeZone } = selection.provenance

  return {
    exportId: selection.exportId,
    conversationId: selection.conversationId,
    selfSender: self.sender,
    provenance: { medium, format, parserRevision, timezoneStatus, hostTimeZone },
    coverage,
    messageCount: analysis.overview.messageCount,
    activeDays: analysis.overview.activeDays,
    conversationStarts: share(self.threadStarts, startTotal, self.threadStartShare, NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS),
    restartsAfterDayPlusPauses: share(
      self.reconnectionCount,
      pauseTotal,
      self.reconnectionShare,
      NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS,
    ),
    followUpsBeforeReply: {
      state: measurementState(self.followUpRelevantTurnCount, self.followUpRate, MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT),
      eventCount: self.followUpCount,
      eligibleTurnCount: self.followUpRelevantTurnCount,
      ratePct: self.followUpRelevantTurnCount > 0 ? self.followUpRate : null,
      minimum: MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
    },
    replyTiming: {
      state: measurementState(self.replySampleCount, self.medianReplyMinutes, MIN_REPLY_LATENCY_PER_PARTICIPANT),
      medianMinutes: self.replySampleCount > 0 ? self.medianReplyMinutes : null,
      sampleCount: self.replySampleCount,
      minimum: MIN_REPLY_LATENCY_PER_PARTICIPANT,
    },
  }
}

function share(numerator: number, denominator: number, storedPct: number, minimum: number): ShareObservation {
  const sharePct = denominator > 0 ? storedPct : null
  return { state: measurementState(denominator, sharePct, minimum), numerator, denominator, sharePct, minimum }
}

function measurementState(opportunities: number, value: number | null, minimum: number): EvidenceState {
  if (opportunities === 0 || value === null) return "unavailable"
  return opportunities < minimum ? "insufficient" : "sufficient"
}

function provenanceReasons(provenance: PersonalEvidenceProvenance | undefined): PersonalEvidenceExclusionReason[] {
  const reasons: PersonalEvidenceExclusionReason[] = []
  if (provenance?.medium !== "whatsapp") reasons.push("unknown_medium")
  if (provenance?.format !== "txt" && provenance?.format !== "zip") reasons.push("unknown_format")
  if (
    !nonEmpty(provenance?.parserRevision) ||
    provenance?.timezoneStatus !== PERSONAL_EVIDENCE_TIMEZONE_STATUS ||
    !isTimeZone(provenance?.hostTimeZone)
  ) {
    reasons.push("invalid_provenance")
  }
  return reasons
}

function coverageOf(analysis: ChatAnalysis | undefined): { startedAt: string; endedAt: string } | null {
  const startedAt = analysis?.overview?.startedAt
  const endedAt = analysis?.overview?.endedAt
  if (typeof startedAt !== "string" || typeof endedAt !== "string") return null
  const start = Date.parse(startedAt)
  const end = Date.parse(endedAt)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return null
  return { startedAt, endedAt }
}

function selfReasons(
  selfSender: string | undefined,
  analysis: ChatAnalysis | undefined,
): { reasons: PersonalEvidenceExclusionReason[]; summary: ParticipantDynamicsSummary | null } {
  const participants = analysis?.participants
  const summaries = analysis?.relationshipDynamics?.participantSummaries
  const pauseCount = analysis?.relationshipDynamics?.pauseSummary?.longPauseCount
  if (!Array.isArray(participants) || !Array.isArray(summaries)) {
    return { reasons: ["invalid_counts"], summary: null }
  }

  const reasons: PersonalEvidenceExclusionReason[] = []
  if (!countsValid(analysis!, pauseCount)) reasons.push("invalid_counts")
  const participantNames = participants.map((participant) => participant.sender)
  const summaryNames = summaries.map((summary) => summary.sender)
  const distinct = new Set(participantNames)
  const consistent =
    distinct.size === participantNames.length &&
    summaryNames.length === participantNames.length &&
    summaryNames.every((name) => distinct.has(name)) &&
    new Set(summaryNames).size === summaryNames.length &&
    analysis!.overview.participantCount === participantNames.length
  if (!consistent) reasons.push("inconsistent_participants")
  if (distinct.size !== 2) reasons.push("unsupported_participant_count")

  // Exact identity only: no trimming, case folding, or name similarity.
  const matches = summaries.filter((summary) => summary.sender === selfSender)
  if (!nonEmpty(selfSender)) reasons.push("missing_self_sender")
  else if (!participantNames.includes(selfSender) || matches.length === 0) reasons.push("self_sender_not_found")
  else if (matches.length > 1 || participantNames.filter((name) => name === selfSender).length > 1) {
    reasons.push("self_sender_ambiguous")
  }

  return { reasons, summary: reasons.length === 0 ? matches[0] : null }
}

function countsValid(analysis: ChatAnalysis, pauseCount: unknown): boolean {
  const { overview, participants } = analysis
  const summaries = analysis.relationshipDynamics.participantSummaries
  if (!isCount(overview?.messageCount) || !isCount(overview.activeDays) || !isCount(overview.participantCount)) {
    return false
  }
  if (overview.activeDays > overview.messageCount || !isCount(pauseCount)) return false
  if (!participants.every((participant) => isCount(participant?.messageCount))) return false

  const summariesValid = summaries.every(
    (summary) =>
      isCount(summary?.messageCount) &&
      isCount(summary.threadStarts) &&
      isCount(summary.reconnectionCount) &&
      isCount(summary.followUpCount) &&
      isCount(summary.followUpRelevantTurnCount) &&
      isCount(summary.replySampleCount) &&
      isPct(summary.threadStartShare) &&
      isPct(summary.reconnectionShare) &&
      (summary.followUpRate === null ? summary.followUpRelevantTurnCount === 0 : isPct(summary.followUpRate) && summary.followUpRelevantTurnCount > 0) &&
      (summary.medianReplyMinutes === null
        ? summary.replySampleCount === 0
        : isNonNegative(summary.medianReplyMinutes) && summary.replySampleCount > 0),
  )
  if (!summariesValid) return false

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
  return (
    sum(participants.map((participant) => participant.messageCount)) === overview.messageCount &&
    sum(summaries.map((summary) => summary.messageCount)) === overview.messageCount &&
    sum(summaries.map((summary) => summary.reconnectionCount)) === pauseCount
  )
}

function countValues(values: unknown[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (nonEmpty(value)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

function isTimeZone(value: unknown): boolean {
  if (!nonEmpty(value)) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
}

function isPct(value: unknown): value is number {
  return isNonNegative(value) && value <= 100
}
