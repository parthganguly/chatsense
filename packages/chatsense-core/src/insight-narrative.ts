import {
  NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS,
  NARRATIVE_MAX_PRIMARY_FINDINGS,
  NARRATIVE_REQUIRED_GUARDRAIL,
} from "./contract"
import type {
  ActivitySummary,
  ConversationOverview,
  ParticipantInsight,
  ReplyDynamics,
} from "./chat-analyzer"
import type {
  DynamicsComparison,
  MetricChange,
  PauseReconnectionSummary,
  RelationshipDynamics,
} from "./relationship-dynamics"

export type NarrativeCategory =
  | "change"
  | "comparison_context"
  | "participation"
  | "pause_reconnection"
  | "reply_timing"
  | "activity"

export type NarrativeEvidenceLevel = "threshold_crossed" | "descriptive" | "limited"

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

export interface InsightNarrative {
  headline: string
  summary: string
  findings: NarrativeFinding[]
  guardrail: string
  limitations: string[]
}

export interface NarrativeInput {
  overview: ConversationOverview
  participants: ParticipantInsight[]
  replies: ReplyDynamics
  activity: ActivitySummary
  relationshipDynamics: RelationshipDynamics
}

export function buildInsightNarrative(input: NarrativeInput): InsightNarrative {
  const { overview, participants, replies, activity, relationshipDynamics } = input
  if (overview.messageCount === 0) return emptyNarrative()

  const findings: NarrativeFinding[] = []
  const changeFindings = selectNotableChanges(relationshipDynamics).map(changeFinding)
  findings.push(...changeFindings)

  if (changeFindings.length === 0) {
    findings.push(comparisonContextFinding(relationshipDynamics))
  }

  const participation = participationFinding(overview, participants)
  if (participation) findings.push(participation)

  const pauses = pauseFinding(relationshipDynamics.pauseSummary)
  if (pauses) findings.push(pauses)

  const replyTiming = replyFinding(replies)
  if (replyTiming) findings.push(replyTiming)

  const recentActivity = activityFinding(activity)
  if (recentActivity) findings.push(recentActivity)

  const primaryFindings = findings.slice(0, NARRATIVE_MAX_PRIMARY_FINDINGS)
  const headline = narrativeHeadline(changeFindings.length, relationshipDynamics)
  const lead = primaryFindings[0]?.summary ?? "Only a basic export summary is available."

  return {
    headline,
    summary: `Across ${formatCount(overview.messageCount)} ${pluralize("message", overview.messageCount)} on ${formatCount(overview.activeDays)} active ${pluralize("day", overview.activeDays)}, the clearest finding is: ${lead}`,
    findings: primaryFindings,
    guardrail: NARRATIVE_REQUIRED_GUARDRAIL,
    limitations: [
      "Message content is not interpreted; only timestamps, senders, counts, and derived timing patterns are used.",
      "Nothing in this summary predicts what anyone will do next or recommends how to respond.",
      ...(overview.participantCount > 2
        ? ["In group chats, sender-switch reply paths approximate a reply to the immediately previous sender."]
        : []),
    ],
  }
}

function selectNotableChanges(dynamics: RelationshipDynamics): MetricChange[] {
  const selected = new Map<string, MetricChange>()
  for (const comparison of [dynamics.recentPrior, dynamics.earlyLate]) {
    for (const change of comparison.changes) {
      if (!change.notable || change.evidenceState !== "sufficient") continue
      const key = `${change.metric}:${change.sender ?? "conversation"}`
      if (!selected.has(key)) selected.set(key, change)
    }
  }
  return [...selected.values()].slice(0, NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS)
}

function changeFinding(change: MetricChange): NarrativeFinding {
  const subject = change.sender ? `${change.sender}'s ${change.label.toLowerCase()}` : change.label
  const earlier = formatMetricValue(change, change.earlierValue)
  const later = formatMetricValue(change, change.laterValue)
  const isTimingDirection = change.direction === "faster" || change.direction === "slower"
  const movement = change.direction === "stable"
    ? "was stable"
    : `${isTimingDirection ? "became " : ""}${change.direction} from ${earlier} to ${later}`

  return {
    id: `change:${change.metric}:${change.sender ?? "conversation"}:${change.laterPeriod.label}`,
    category: "change",
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

function comparisonContextFinding(dynamics: RelationshipDynamics): NarrativeFinding {
  const available = [dynamics.recentPrior, dynamics.earlyLate].filter((comparison) => comparison.available)
  if (available.length > 0) {
    const comparison = available[0]
    return {
      id: "comparison:no-notable-change",
      category: "comparison_context",
      evidenceLevel: "descriptive",
      title: "No measured shift crossed the threshold",
      summary: "No measured change crossed the predefined threshold in the available period comparison.",
      evidence: comparisonEvidence(comparison),
    }
  }

  const reason = dynamics.recentPrior.unavailableReason ?? dynamics.earlyLate.unavailableReason
  return {
    id: "comparison:limited",
    category: "comparison_context",
    evidenceLevel: "limited",
    title: "A strong over-time comparison is not available",
    summary: "The export supports a descriptive snapshot, but not a strong comparison across time.",
    evidence: [
      {
        label: "Evidence status",
        value: "Limited",
        detail: reason,
      },
    ],
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

function participationFinding(
  overview: ConversationOverview,
  participants: ParticipantInsight[],
): NarrativeFinding | null {
  if (participants.length < 2 || !participants[0]) return null
  const top = participants[0]
  const uneven = top.messageShare >= 65
  return {
    id: "participation:message-share",
    category: "participation",
    evidenceLevel: "descriptive",
    title: uneven ? "Message volume is uneven" : "Participant message counts",
    summary: uneven
      ? `${top.sender} sent ${top.messageShare}% of messages in the export.`
      : `The most active participant sent ${top.messageShare}% of messages in the export.`,
    evidence: [
      {
        label: "Most active",
        value: top.sender,
        detail: `${formatCount(top.messageCount)} ${pluralize("message", top.messageCount)}`,
      },
      { label: "Share of export", value: `${top.messageShare}%`, detail: `${formatCount(overview.messageCount)} total` },
    ],
  }
}

function pauseFinding(summary: PauseReconnectionSummary): NarrativeFinding | null {
  if (summary.latestGapMinutes === null) return null
  if (summary.longPauseCount > 0) {
    const longest = summary.longestPauses[0]
    return {
      id: "pauses:reconnections",
      category: "pause_reconnection",
      evidenceLevel: "descriptive",
      title: `${formatCount(summary.longPauseCount)} pause${summary.longPauseCount === 1 ? "" : "s"} lasted at least 24 hours`,
      summary: `The export contains ${formatCount(summary.longPauseCount)} pause${summary.longPauseCount === 1 ? "" : "s"} of at least 24 hours${longest ? `; the longest lasted ${formatDuration(longest.durationMinutes)}` : ""}.`,
      evidence: [
        { label: "24h pauses", value: formatCount(summary.longPauseCount), detail: "Observed gaps" },
        { label: "Longest pause", value: formatDuration(longest?.durationMinutes ?? null), detail: longest?.reconnectingSender ? `Next sender: ${longest.reconnectingSender}` : null },
      ],
    }
  }
  return {
    id: "pauses:typical-gap",
    category: "pause_reconnection",
    evidenceLevel: "descriptive",
    title: "No 24-hour pause appears in this export",
    summary: `No inter-message gap reached 24 hours; the median observed gap was ${formatDuration(summary.medianInterMessageGapMinutes)}.`,
    evidence: [
      { label: "Median gap", value: formatDuration(summary.medianInterMessageGapMinutes), detail: "Between consecutive messages" },
      { label: "Latest gap", value: formatDuration(summary.latestGapMinutes), detail: summary.latestGapPercentile === null ? null : `${summary.latestGapPercentile}th percentile versus earlier gaps` },
    ],
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
    category: "activity",
    evidenceLevel: "descriptive",
    title: `Recent message activity is ${activity.recentTrend}`,
    summary: change === null
      ? `Recent message activity is ${activity.recentTrend} compared with the preceding seven days.`
      : `Recent message activity is ${activity.recentTrend}, with a ${Math.abs(change)}% difference from the preceding seven days.`,
    evidence: [
      { label: "Recent trend", value: capitalize(activity.recentTrend), detail: "Latest 7 days versus prior 7 days" },
    ],
  }
}

function narrativeHeadline(notableCount: number, dynamics: RelationshipDynamics): string {
  if (notableCount > 0) return "This export shows measurable changes over time"
  if (dynamics.earlyLate.available || dynamics.recentPrior.available) {
    return "No measured change crossed the notable threshold"
  }
  return "This export supports a descriptive snapshot"
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

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function emptyNarrative(): InsightNarrative {
  return {
    headline: "No behavioral summary is available yet",
    summary: "Import a WhatsApp export with valid messages to build a local behavioral summary.",
    findings: [],
    guardrail: NARRATIVE_REQUIRED_GUARDRAIL,
    limitations: [
      "Message content is not interpreted; only timestamps, senders, counts, and derived timing patterns are used.",
      "Nothing in this summary predicts what anyone will do next or recommends how to respond.",
    ],
  }
}
