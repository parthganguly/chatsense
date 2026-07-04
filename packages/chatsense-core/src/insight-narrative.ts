import {
  NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT,
  NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT,
  NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS,
  NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS,
  NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS,
  NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT,
  NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS,
  NARRATIVE_MAX_PRIMARY_FINDINGS,
  NARRATIVE_REQUIRED_GUARDRAIL,
  NOTABLE_FOLLOW_UP_RATE_ABS_PCT,
  NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
  NOTABLE_RECONNECTION_SHARE_ABS_PCT,
  NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER,
  NOTABLE_THREAD_START_SHARE_ABS_PCT,
  NOTABLE_TURN_SHARE_ABS_PCT,
} from "./contract"
import type {
  ActivitySummary,
  ConversationOverview,
  ParticipantInsight,
  ReplyDynamics,
} from "./chat-analyzer"
import type { ForecastingResearchReport } from "./forecasting"
import type {
  DynamicsComparison,
  MetricChange,
  ParticipantDynamicsSummary,
  PauseReconnectionSummary,
  RelationshipDynamics,
} from "./relationship-dynamics"

export type NarrativeCategory =
  | "balance"
  | "maintenance"
  | "reconnection"
  | "reply_timing"
  | "activity_change"
  | "rhythm"
  | "forecasting_gate"
  | "data_quality"
  // Stage 6 first-pass aliases remain valid for downstream consumers.
  | "change"
  | "comparison_context"
  | "participation"
  | "pause_reconnection"
  | "activity"

export type NarrativeEvidenceLevel = "threshold_crossed" | "descriptive" | "limited"
export type NarrativeSectionKey = "overview" | "changes" | "people" | "rhythm"

export interface NarrativeEvidence {
  label: string
  value: string
  detail: string | null
}

export interface NarrativeFinding {
  id: string
  category: NarrativeCategory
  evidenceLevel: NarrativeEvidenceLevel
  title: string
  summary: string
  evidence: NarrativeEvidence[]
}

export interface NarrativeSection {
  id: NarrativeSectionKey
  headline: string
  summary: string
  findings: NarrativeFinding[]
}

export interface InsightNarrative {
  // Backward-compatible Overview aliases.
  headline: string
  summary: string
  findings: NarrativeFinding[]
  sections: Record<NarrativeSectionKey, NarrativeSection>
  guardrail: string
  limitations: string[]
}

export interface NarrativeInput {
  overview: ConversationOverview
  participants: ParticipantInsight[]
  replies: ReplyDynamics
  activity: ActivitySummary
  relationshipDynamics: RelationshipDynamics
  forecastingResearch: ForecastingResearchReport
}

export function buildInsightNarrative(input: NarrativeInput): InsightNarrative {
  if (input.overview.messageCount === 0) return emptyNarrative()

  const maintenance = maintenanceFinding(input.overview, input.participants, input.relationshipDynamics)
  const balance = balanceFinding(input.participants, input.relationshipDynamics.participantSummaries)
  const pauseStory = pauseStoryFinding(input.relationshipDynamics.pauseSummary)
  const reconnection = reconnectionFinding(input.relationshipDynamics.pauseSummary)
  const replyTiming = replyFinding(input.replies)
  const activity = activityFinding(input.activity)
  const forecasting = forecastingGateFinding(input.forecastingResearch)
  const groupLimit = groupAttributionFinding(input.overview.participantCount)

  const overviewChanges = selectNotableChanges(input.relationshipDynamics).map((change) => changeFinding(change, "overview"))
  const comparisonContext = overviewChanges.length === 0 ? comparisonContextFinding(input.relationshipDynamics) : null
  const overviewCandidates: NarrativeFinding[] = maintenance.id === "maintenance:uneven" ? [maintenance] : []
  overviewCandidates.push(...overviewChanges)
  // A limited "no strong comparison" card must not outrank a maintenance finding
  // that carries real evidence; it stays ahead only of other limited findings.
  if (comparisonContext && comparisonContext.evidenceLevel !== "limited") overviewCandidates.push(comparisonContext)
  if (maintenance.id === "maintenance:balanced") overviewCandidates.push(maintenance)
  if (comparisonContext && comparisonContext.evidenceLevel === "limited") overviewCandidates.push(comparisonContext)
  if (maintenance.id === "maintenance:limited") overviewCandidates.push(maintenance)
  overviewCandidates.push(balance)
  if (reconnection) overviewCandidates.push(reconnection)
  if (replyTiming) overviewCandidates.push(replyTiming)
  if (activity) overviewCandidates.push(activity)

  const overviewFindings = uniqueFindings(overviewCandidates).slice(0, NARRATIVE_MAX_PRIMARY_FINDINGS)
  const overviewHeadline = narrativeHeadline(overviewChanges.length, input.relationshipDynamics, maintenance)
  const overviewLead = overviewFindings[0]?.summary ?? "Only a basic export summary is available."
  const overviewSection: NarrativeSection = {
    id: "overview",
    headline: overviewHeadline,
    summary: `Across ${formatCount(input.overview.messageCount)} ${pluralize("message", input.overview.messageCount)} on ${formatCount(input.overview.activeDays)} active ${pluralize("day", input.overview.activeDays)}, the clearest finding is: ${overviewLead}`,
    findings: overviewFindings,
  }

  const earlyChange = strongestNotableChange(input.relationshipDynamics.earlyLate)
  const recentChange = strongestNotableChange(input.relationshipDynamics.recentPrior)
  const changesFindings: NarrativeFinding[] = []
  if (earlyChange) changesFindings.push(changeFinding(earlyChange, "early_late"))
  if (recentChange) changesFindings.push(changeFinding(recentChange, "recent_prior"))
  if (!earlyChange && !recentChange) changesFindings.push(comparisonContextFinding(input.relationshipDynamics))
  changesFindings.push(forecasting)
  const changesSection: NarrativeSection = {
    id: "changes",
    headline: earlyChange || recentChange ? "The strongest measured changes" : "No measured change crossed the threshold",
    summary: changesSummary(earlyChange, recentChange, input.relationshipDynamics),
    findings: changesFindings,
  }

  const peopleFindings = uniqueFindings([
    maintenance,
    balance,
    ...(reconnection ? [reconnection] : []),
    ...(groupLimit ? [groupLimit] : []),
  ]).slice(0, NARRATIVE_MAX_PRIMARY_FINDINGS)
  const peopleSection: NarrativeSection = {
    id: "people",
    headline: maintenance.title,
    summary: maintenance.summary,
    findings: peopleFindings,
  }

  const rhythmFindings = uniqueFindings([
    pauseStory,
    ...(reconnection ? [reconnection] : []),
    ...(activity ? [activity] : []),
  ]).slice(0, NARRATIVE_MAX_PRIMARY_FINDINGS)
  const rhythmSection: NarrativeSection = {
    id: "rhythm",
    headline: pauseStory.title,
    summary: `${pauseStory.summary} This is historical timing, not a live interpretation of silence.`,
    findings: rhythmFindings,
  }

  return {
    headline: overviewSection.headline,
    summary: overviewSection.summary,
    findings: overviewSection.findings,
    sections: {
      overview: overviewSection,
      changes: changesSection,
      people: peopleSection,
      rhythm: rhythmSection,
    },
    guardrail: NARRATIVE_REQUIRED_GUARDRAIL,
    limitations: [
      "Message content is not interpreted; only timestamps, senders, counts, and derived timing patterns are used.",
      "Nothing in this summary predicts what anyone will do next or recommends how to respond.",
      ...(input.overview.participantCount > 2
        ? ["In group chats, sender-switch reply paths approximate a reply to the immediately previous sender."]
        : []),
    ],
  }
}

function selectNotableChanges(dynamics: RelationshipDynamics): MetricChange[] {
  const selected = new Map<string, MetricChange>()
  for (const comparison of [dynamics.recentPrior, dynamics.earlyLate]) {
    for (const change of sortedNotableChanges(comparison)) {
      const key = `${change.metric}:${change.sender ?? "conversation"}`
      if (!selected.has(key)) selected.set(key, change)
    }
  }
  return [...selected.values()].slice(0, NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS)
}

function strongestNotableChange(comparison: DynamicsComparison): MetricChange | null {
  return sortedNotableChanges(comparison)[0] ?? null
}

function sortedNotableChanges(comparison: DynamicsComparison): MetricChange[] {
  return comparison.changes
    .filter((change) => change.notable && change.evidenceState === "sufficient")
    .sort((left, right) => {
      const scoreDifference = changeStrength(right) - changeStrength(left)
      if (scoreDifference !== 0) return scoreDifference
      if (left.metric !== right.metric) return left.metric.localeCompare(right.metric)
      return (left.sender ?? "").localeCompare(right.sender ?? "")
    })
}

function changeStrength(change: MetricChange): number {
  const absolute = Math.abs(change.absoluteDifference ?? 0)
  const relative = Math.abs(change.relativeDifferencePct ?? 0)
  if (change.metric === "messages_per_active_day") return relative / NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT
  if (change.metric === "turn_share") return absolute / NOTABLE_TURN_SHARE_ABS_PCT
  if (change.metric === "thread_start_share") return absolute / NOTABLE_THREAD_START_SHARE_ABS_PCT
  if (change.metric === "reconnection_share") return absolute / NOTABLE_RECONNECTION_SHARE_ABS_PCT
  if (change.metric === "follow_up_rate") return absolute / NOTABLE_FOLLOW_UP_RATE_ABS_PCT
  if (change.metric === "median_reply_minutes") {
    const earlier = typeof change.earlierValue === "number" ? change.earlierValue : 0
    const later = typeof change.laterValue === "number" ? change.laterValue : 0
    if (earlier <= 0 || later <= 0) return 0
    return Math.max(later / earlier, earlier / later) / NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER
  }
  return 0
}

function changeFinding(change: MetricChange, scope: string): NarrativeFinding {
  const subject = change.sender ? `${change.sender}'s ${change.label.toLowerCase()}` : change.label
  const earlier = formatMetricValue(change, change.earlierValue)
  const later = formatMetricValue(change, change.laterValue)
  const isTimingDirection = change.direction === "faster" || change.direction === "slower"
  const movement = change.direction === "stable"
    ? "was stable"
    : `${isTimingDirection ? "became " : ""}${change.direction} from ${earlier} to ${later}`

  return {
    id: `change:${scope}:${change.metric}:${change.sender ?? "conversation"}`,
    category: categoryForChange(change),
    evidenceLevel: "threshold_crossed",
    title: `${subject} ${isTimingDirection ? "became " : ""}${change.direction}`,
    summary: `${subject} ${movement} across the compared periods, crossing the predefined notable-change threshold.`,
    evidence: [
      {
        label: change.earlierPeriod.label,
        value: earlier,
        detail: periodDetail(change.earlierPeriod.start, change.earlierPeriod.end),
      },
      {
        label: change.laterPeriod.label,
        value: later,
        detail: periodDetail(change.laterPeriod.start, change.laterPeriod.end),
      },
      {
        label: "Evidence samples",
        value: `${formatCount(change.earlierSampleSize)} / ${formatCount(change.laterSampleSize)}`,
        detail: "Earlier / later",
      },
    ],
  }
}

function categoryForChange(change: MetricChange): NarrativeCategory {
  if (change.metric === "median_reply_minutes") return "reply_timing"
  if (change.metric === "messages_per_active_day") return "activity_change"
  if (change.metric === "reconnection_share") return "reconnection"
  if (change.metric === "thread_start_share" || change.metric === "follow_up_rate") return "maintenance"
  return "balance"
}

function comparisonContextFinding(dynamics: RelationshipDynamics): NarrativeFinding {
  const available = [dynamics.recentPrior, dynamics.earlyLate].filter((comparison) => comparison.available)
  if (available.length > 0) {
    const comparison = available[0]
    return {
      id: "comparison:no-notable-change",
      category: "data_quality",
      evidenceLevel: "descriptive",
      title: "No measured shift crossed the threshold",
      summary: "No measured change crossed the predefined threshold in the available period comparison.",
      evidence: comparisonEvidence(comparison),
    }
  }

  const reason = dynamics.recentPrior.unavailableReason ?? dynamics.earlyLate.unavailableReason
  return {
    id: "comparison:limited",
    category: "data_quality",
    evidenceLevel: "limited",
    title: "A strong over-time comparison is not available",
    summary: "The export supports a descriptive snapshot, but not a strong comparison across time.",
    evidence: [{ label: "Evidence status", value: "Limited", detail: reason }],
  }
}

function comparisonEvidence(comparison: DynamicsComparison): NarrativeEvidence[] {
  return [
    {
      label: comparison.earlierPeriod.label,
      value: `${formatCount(comparison.earlierPeriod.messageCount)} ${pluralize("message", comparison.earlierPeriod.messageCount)}`,
      detail: periodDetail(comparison.earlierPeriod.start, comparison.earlierPeriod.end),
    },
    {
      label: comparison.laterPeriod.label,
      value: `${formatCount(comparison.laterPeriod.messageCount)} ${pluralize("message", comparison.laterPeriod.messageCount)}`,
      detail: periodDetail(comparison.laterPeriod.start, comparison.laterPeriod.end),
    },
  ]
}

function maintenanceFinding(
  overview: ConversationOverview,
  participants: ParticipantInsight[],
  dynamics: RelationshipDynamics,
): NarrativeFinding {
  if (participants.length < 2 || dynamics.participantSummaries.length < 2) {
    return limitedMaintenanceFinding(dynamics, "At least two participants are needed for a maintenance comparison.")
  }

  const topMessage = [...participants].sort((left, right) => right.messageShare - left.messageShare)[0]
  const topTurn = [...dynamics.participantSummaries].sort((left, right) => right.turnShare - left.turnShare)[0]
  const threadStarts = dynamics.participantSummaries.reduce((total, participant) => total + participant.threadStarts, 0)
  const reconnections = dynamics.pauseSummary.longPauseCount
  const volumeBalanced =
    topMessage.messageShare <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT &&
    topTurn.turnShare <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT

  const ranked = dynamics.participantSummaries
    .map((participant) => ({ participant, score: maintenanceScore(participant, threadStarts, reconnections) }))
    .sort((left, right) => right.score - left.score || left.participant.sender.localeCompare(right.participant.sender))
  const strongest = ranked[0]

  if (strongest.score >= 1) {
    const participant = strongest.participant
    const maintenancePhrases: string[] = []
    if (
      threadStarts >= NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS &&
      participant.threadStartShare >= NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT
    ) {
      maintenancePhrases.push(`started ${participant.threadStartShare}% of threads`)
    }
    if (
      reconnections >= NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS &&
      participant.reconnectionShare >= NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT
    ) {
      maintenancePhrases.push(
        `sent the first message after ${participant.reconnectionCount} of ${reconnections} pauses of at least 24 hours`,
      )
    }
    if (
      participant.followUpRelevantTurnCount >= NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS &&
      (participant.followUpRate ?? 0) >= NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT
    ) {
      maintenancePhrases.push(`followed up before a reply in ${participant.followUpRate}% of relevant turns`)
    }

    return {
      id: "maintenance:uneven",
      category: "maintenance",
      evidenceLevel: "descriptive",
      title: volumeBalanced ? "Balanced volume, uneven contact maintenance" : "Contact maintenance is uneven",
      summary: `${volumeBalanced ? "Message volume and turn share were relatively balanced, while" : "In the observed maintenance measures,"} ${participant.sender} ${joinPhrases(maintenancePhrases)}.`,
      evidence: maintenanceEvidence(participant, participants, overview.messageCount),
    }
  }

  const hasMaintenanceEvidence =
    threadStarts >= NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS ||
    reconnections >= NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS ||
    dynamics.participantSummaries.some(
      (participant) =>
        participant.followUpRelevantTurnCount >= NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS,
    )
  if (!hasMaintenanceEvidence) {
    return limitedMaintenanceFinding(dynamics, "Too few thread starts, long-pause restarts, or relevant follow-up turns.")
  }

  return {
    id: "maintenance:balanced",
    category: "maintenance",
    evidenceLevel: "descriptive",
    title: volumeBalanced
      ? "Contribution and contact maintenance were relatively balanced"
      : "Observed contact maintenance was relatively balanced",
    summary: volumeBalanced
      ? "Contribution and the available contact-maintenance measures were both relatively balanced in this export."
      : "The available thread-start, restart, and follow-up measures did not concentrate above the narrative threshold for one participant.",
    evidence: balancedMaintenanceEvidence(participants, dynamics.participantSummaries),
  }
}

function maintenanceScore(
  participant: ParticipantDynamicsSummary,
  threadStarts: number,
  reconnections: number,
): number {
  const scores: number[] = []
  if (threadStarts >= NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS) {
    scores.push(participant.threadStartShare / NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT)
  }
  if (reconnections >= NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS) {
    scores.push(participant.reconnectionShare / NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT)
  }
  if (
    participant.followUpRelevantTurnCount >= NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS &&
    participant.followUpRate !== null
  ) {
    scores.push(participant.followUpRate / NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT)
  }
  return Math.max(0, ...scores)
}

function maintenanceEvidence(
  participant: ParticipantDynamicsSummary,
  participants: ParticipantInsight[],
  messageCount: number,
): NarrativeEvidence[] {
  const messageShare = participants.find((candidate) => candidate.sender === participant.sender)?.messageShare ?? 0
  return [
    { label: "Message share", value: `${messageShare}%`, detail: `${formatCount(messageCount)} total messages` },
    { label: "Turn share", value: `${participant.turnShare}%`, detail: `${participant.turnCount} turns` },
    {
      label: "Thread starts",
      value: `${participant.threadStarts} (${participant.threadStartShare}%)`,
      detail: "First message after a 6h thread gap",
    },
    {
      label: "24h restarts",
      value: `${participant.reconnectionCount} (${participant.reconnectionShare}%)`,
      detail: "First message after a pause of at least 24h",
    },
    {
      label: "Follow-ups",
      value: formatCount(participant.followUpCount),
      detail: participant.followUpRate === null
        ? "Limited relevant turns"
        : `${participant.followUpRate}% of relevant turns`,
    },
  ]
}

function balancedMaintenanceEvidence(
  participants: ParticipantInsight[],
  summaries: ParticipantDynamicsSummary[],
): NarrativeEvidence[] {
  return summaries.slice(0, 4).map((summary) => {
    const messageShare = participants.find((participant) => participant.sender === summary.sender)?.messageShare ?? 0
    return {
      label: summary.sender,
      value: `${messageShare}% messages / ${summary.turnShare}% turns`,
      detail: `${summary.threadStartShare}% thread starts; ${summary.reconnectionCount} restarts`,
    }
  })
}

function limitedMaintenanceFinding(dynamics: RelationshipDynamics, reason: string): NarrativeFinding {
  return {
    id: "maintenance:limited",
    category: "maintenance",
    evidenceLevel: "limited",
    title: "Contact-maintenance evidence is limited",
    summary: "This export does not contain enough maintenance events for a stable participant comparison.",
    evidence: [
      {
        label: "Observed events",
        value: `${dynamics.turns.filter((turn) => turn.startsThread).length} threads / ${dynamics.pauseSummary.longPauseCount} restarts`,
        detail: reason,
      },
    ],
  }
}

function balanceFinding(
  participants: ParticipantInsight[],
  summaries: ParticipantDynamicsSummary[],
): NarrativeFinding {
  if (participants.length < 2 || summaries.length < 2) {
    return {
      id: "balance:limited",
      category: "balance",
      evidenceLevel: "limited",
      title: "Participant balance is unavailable",
      summary: "At least two participants are needed for a balance comparison.",
      evidence: [{ label: "Participants", value: formatCount(participants.length), detail: null }],
    }
  }
  const topMessage = [...participants].sort((left, right) => right.messageShare - left.messageShare)[0]
  const topTurn = [...summaries].sort((left, right) => right.turnShare - left.turnShare)[0]
  const balanced =
    topMessage.messageShare <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT &&
    topTurn.turnShare <= NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT
  return {
    id: balanced ? "balance:balanced" : "balance:uneven",
    category: "balance",
    evidenceLevel: "descriptive",
    title: balanced ? "Message and turn shares are relatively balanced" : "Contribution is uneven in this export",
    summary: balanced
      ? `No participant exceeded ${NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT}% of message volume or conversation turns.`
      : `${topMessage.sender} had the largest message share at ${topMessage.messageShare}%; ${topTurn.sender} had the largest turn share at ${topTurn.turnShare}%.`,
    evidence: [
      { label: "Top message share", value: `${topMessage.messageShare}%`, detail: topMessage.sender },
      { label: "Top turn share", value: `${topTurn.turnShare}%`, detail: topTurn.sender },
    ],
  }
}

function pauseStoryFinding(summary: PauseReconnectionSummary): NarrativeFinding {
  if (summary.latestGapMinutes === null) {
    return {
      id: "rhythm:limited",
      category: "rhythm",
      evidenceLevel: "limited",
      title: "Pause evidence is limited",
      summary: "At least two valid messages are needed to describe inter-message gaps.",
      evidence: [{ label: "Observed gaps", value: "0", detail: null }],
    }
  }
  const longest = summary.longestPauses[0]
  const percentileText = summary.latestGapPercentile === null
    ? "There are not enough earlier gaps to rank the latest gap."
    : `The latest gap was as long as or longer than ${summary.latestGapPercentile}% of earlier gaps in this export.`
  return {
    id: "rhythm:pause-story",
    category: "rhythm",
    evidenceLevel: "descriptive",
    title: "Observed pauses in context",
    summary: `The longest observed pause lasted ${formatDuration(longest?.durationMinutes ?? null)}. ${percentileText}`,
    evidence: [
      { label: "Median gap", value: formatDuration(summary.medianInterMessageGapMinutes), detail: "Between consecutive messages" },
      { label: "Longest pause", value: formatDuration(longest?.durationMinutes ?? null), detail: null },
      { label: "Pauses at least 24h", value: formatCount(summary.longPauseCount), detail: null },
      {
        label: "Latest gap",
        value: formatDuration(summary.latestGapMinutes),
        detail: summary.latestGapPercentile === null
          ? "Percentile unavailable"
          : `${formatOrdinal(summary.latestGapPercentile)} percentile`,
      },
    ],
  }
}

function reconnectionFinding(summary: PauseReconnectionSummary): NarrativeFinding | null {
  if (summary.latestGapMinutes === null) return null
  if (summary.longPauseCount === 0) {
    return {
      id: "reconnection:none",
      category: "reconnection",
      evidenceLevel: "descriptive",
      title: "No pause reached 24 hours",
      summary: "No first-message-after-24h restart was available to attribute in this export.",
      evidence: [{ label: "24h pauses", value: "0", detail: "Historical export gaps" }],
    }
  }
  const top = summary.reconnectingParticipants[0]
  return {
    id: "reconnection:observed",
    category: "reconnection",
    evidenceLevel: "descriptive",
    title: `${formatCount(summary.longPauseCount)} ${pluralize("restart", summary.longPauseCount)} after 24-hour pauses`,
    summary: top
      ? `${top.sender} sent the first message after ${top.count} of ${summary.longPauseCount} observed pauses of at least 24 hours.`
      : `${summary.longPauseCount} pauses of at least 24 hours were observed.`,
    evidence: summary.reconnectingParticipants.slice(0, 4).map((participant) => ({
      label: participant.sender,
      value: `${participant.count} (${participant.share}%)`,
      detail: "First messages after 24h pauses",
    })),
  }
}

function replyFinding(replies: ReplyDynamics): NarrativeFinding | null {
  if (replies.replyCount === 0) return null
  return {
    id: "replies:historical-timing",
    category: "reply_timing",
    evidenceLevel: "descriptive",
    title: "Historical sender-switch timing",
    summary: `${replies.withinOneHourRate}% of observed sender-switch replies arrived within 1 hour, and ${replies.withinDayRate}% within 24 hours.`,
    evidence: [
      {
        label: "Median reply",
        value: formatDuration(replies.medianReplyMinutes),
        detail: `${formatCount(replies.replyCount)} observed ${pluralize("reply", replies.replyCount)}`,
      },
      { label: "Within 6 hours", value: `${replies.withinSixHoursRate}%`, detail: "Historical share" },
    ],
  }
}

function activityFinding(activity: ActivitySummary): NarrativeFinding | null {
  if (activity.recentTrend === "not_enough_data") return null
  const change = activity.recentVsPriorPct
  return {
    id: "activity:recent-week",
    category: "activity_change",
    evidenceLevel: "descriptive",
    title: `Recent message activity is ${activity.recentTrend}`,
    summary: change === null
      ? `Recent message activity is ${activity.recentTrend} compared with the preceding seven days.`
      : `Recent message activity is ${activity.recentTrend}, with a ${Math.abs(change)}% difference from the preceding seven days.`,
    evidence: [
      { label: "Recent trend", value: capitalize(activity.recentTrend), detail: "Latest 7 days versus prior 7 days" },
      { label: "Relative difference", value: change === null ? "Unavailable" : `${change}%`, detail: null },
    ],
  }
}

function forecastingGateFinding(forecasting: ForecastingResearchReport): NarrativeFinding {
  const oneHour = forecasting.tasks.replyWithinHorizon["60"]
  const promotion = oneHour?.promotion
  const evaluated = oneHour?.metrics.candidate.evaluatedCount ?? 0
  const reason = promotion?.reasons[0] ?? forecasting.summary.reasons[0] ?? "No promotion evidence is available."
  return {
    id: "forecasting:blocked",
    category: "forecasting_gate",
    evidenceLevel: "limited",
    title: "Forecasting remains blocked",
    summary: "This export and method have not earned product forecasting, so no live forecast is shown.",
    evidence: [
      {
        label: "Method gate",
        value: promotion?.methodGatePassed ? "Passed historically" : "Not passed",
        detail: reason,
      },
      { label: "Product promotion", value: forecasting.summary.productPromotion ? "Passed" : "Blocked", detail: null },
      { label: "Evaluated opportunities", value: formatCount(evaluated), detail: "1-hour reply research task" },
    ],
  }
}

function groupAttributionFinding(participantCount: number): NarrativeFinding | null {
  if (participantCount <= 2) return null
  return {
    id: "data-quality:group-attribution",
    category: "data_quality",
    evidenceLevel: "limited",
    title: "Group attribution is approximate",
    summary: "Sender-switch paths attribute each message to the immediately previous sender and do not resolve quoted replies or side threads.",
    evidence: [{ label: "Participants", value: formatCount(participantCount), detail: "Group export" }],
  }
}

function changesSummary(
  early: MetricChange | null,
  recent: MetricChange | null,
  dynamics: RelationshipDynamics,
): string {
  if (early && recent) {
    return "The strongest lifetime-period change and the strongest recent-period change are summarized before the full evidence cards."
  }
  if (early) return "One early-versus-late measure crossed its predefined threshold; no recent-prior measure did."
  if (recent) return "One recent-prior measure crossed its predefined threshold; no early-versus-late measure did."
  return comparisonContextFinding(dynamics).summary
}

function narrativeHeadline(
  notableCount: number,
  dynamics: RelationshipDynamics,
  maintenance: NarrativeFinding,
): string {
  if (maintenance.id === "maintenance:uneven") return maintenance.title
  if (notableCount > 0) return "This export shows measurable changes over time"
  if (dynamics.earlyLate.available || dynamics.recentPrior.available) {
    return "No measured change crossed the notable threshold"
  }
  return "This export supports a descriptive snapshot"
}

function uniqueFindings(findings: NarrativeFinding[]): NarrativeFinding[] {
  const seen = new Set<string>()
  return findings.filter((finding) => {
    if (seen.has(finding.id)) return false
    seen.add(finding.id)
    return true
  })
}

function formatMetricValue(change: MetricChange, value: MetricChange["earlierValue"]): string {
  if (value === null) return "unavailable"
  if (typeof value === "string") return value
  if (change.metric === "median_reply_minutes") return formatDuration(value)
  if (["turn_share", "thread_start_share", "reconnection_share", "follow_up_rate"].includes(change.metric)) {
    return `${value}%`
  }
  return String(value)
}

function periodDetail(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  return start === end ? start : `${start} to ${end}`
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "Unavailable"
  if (minutes < 60) return `${Math.round(minutes)}m`
  if (minutes < 1440) return `${round(minutes / 60, 1)}h`
  return `${round(minutes / 1440, 1)}d`
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

function capitalize(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value
}

function pluralize(noun: string, count: number): string {
  return count === 1 ? noun : `${noun}s`
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length <= 1) return phrases[0] ?? "had the highest observed maintenance share"
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`
  return `${phrases.slice(0, -1).join(", ")}, and ${phrases.at(-1)}`
}

function formatOrdinal(value: number): string {
  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`
  const suffix = value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"
  return `${value}${suffix}`
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function emptySection(id: NarrativeSectionKey, headline: string): NarrativeSection {
  return {
    id,
    headline,
    summary: "Import a WhatsApp export with valid messages to build this local summary.",
    findings: [],
  }
}

function emptyNarrative(): InsightNarrative {
  const overview = emptySection("overview", "No behavioral summary is available yet")
  return {
    headline: overview.headline,
    summary: overview.summary,
    findings: overview.findings,
    sections: {
      overview,
      changes: emptySection("changes", "No change summary is available yet"),
      people: emptySection("people", "No maintenance summary is available yet"),
      rhythm: emptySection("rhythm", "No pause summary is available yet"),
    },
    guardrail: NARRATIVE_REQUIRED_GUARDRAIL,
    limitations: [
      "Message content is not interpreted; only timestamps, senders, counts, and derived timing patterns are used.",
      "Nothing in this summary predicts what anyone will do next or recommends how to respond.",
    ],
  }
}
