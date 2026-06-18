/**
 * Canonical normalized parity output (TypeScript side).
 *
 * Produces ONLY the metrics both implementations promise to share, in a shape that
 * is deep-equal with the Python `chatsense_ml/parity.py` output. Both languages are
 * tested against the same `fixtures/expected/*.json`.
 *
 * The runtime parser (`parseWhatsAppChat`) never emits system notices, so the
 * parity scope (non-system messages) holds automatically here. `analyzeChat`
 * already rounds rates and delays with `Math.round`; the Python side mirrors that,
 * so every shared value is an integer or categorical and comparisons are exact.
 */

import { analyzeChat } from "./chat-analyzer"
import { parseWhatsAppChat } from "./chat-parser"
import type { DynamicsComparison, RelationshipDynamics } from "./relationship-dynamics"

export interface NormalizedParticipant {
  sender: string
  message_count: number
  word_count: number
  message_share_pct: number
}

export interface NormalizedReplyEdge {
  from: string
  to: string
  count: number
}

export interface NormalizedParity {
  message_count: number
  participant_count: number
  participants: NormalizedParticipant[]
  reply_count: number
  thread_count: number
  peak_hour: number | null
  peak_weekday: string | null
  quick_reply_rate_pct: number
  within_one_hour_rate_pct: number
  within_six_hours_rate_pct: number
  within_one_day_rate_pct: number
  avg_reply_delay_min: number | null
  median_reply_delay_min: number | null
  longest_silence_min: number | null
  unusual_silence_count: number
  reply_edges: NormalizedReplyEdge[]
  relationship_dynamics: NormalizedRelationshipDynamics
}

export interface NormalizedRelationshipDynamics {
  turn_count: number
  turns: Array<{
    sender: string
    message_count: number
    word_count: number
    duration_min: number
    starts_thread: boolean
    open_at_export_end: boolean
  }>
  participants: Array<{
    sender: string
    turn_count: number
    turn_share_pct: number
    median_reply_delay_min: number | null
    reply_sample_count: number
    thread_starts: number
    reconnections: number
    follow_ups: number
    follow_up_relevant_turns: number
    follow_up_rate_pct: number | null
  }>
  pause_summary: {
    long_pause_count: number
    latest_gap_percentile: number | null
    reconnecting_participants: Array<{ sender: string; count: number; share_pct: number }>
  }
  adaptive_windows: Array<{
    start: string
    end: string
    partial: boolean
    eligible: boolean
    message_count: number
    active_days: number
    turn_count: number
    thread_count: number
    reconnection_count: number
  }>
  early_late: NormalizedComparison
  recent_prior: NormalizedComparison
}

export interface NormalizedComparison {
  available: boolean
  unavailable_reason: string | null
  earlier_period: { start: string | null; end: string | null; message_count: number; active_days: number }
  later_period: { start: string | null; end: string | null; message_count: number; active_days: number }
  changes: Array<{
    metric: string
    sender: string | null
    evidence_state: string
    direction: string
    notable: boolean
    earlier_value: number | string | null
    later_value: number | string | null
    earlier_sample_size: number
    later_sample_size: number
  }>
}

export function normalizedParityFromText(text: string): NormalizedParity {
  const messages = parseWhatsAppChat(text)
  const analysis = analyzeChat(messages)

  if (analysis.overview.messageCount === 0) {
    return {
      message_count: 0,
      participant_count: 0,
      participants: [],
      reply_count: 0,
      thread_count: 0,
      peak_hour: null,
      peak_weekday: null,
      quick_reply_rate_pct: 0,
      within_one_hour_rate_pct: 0,
      within_six_hours_rate_pct: 0,
      within_one_day_rate_pct: 0,
      avg_reply_delay_min: null,
      median_reply_delay_min: null,
      longest_silence_min: null,
      unusual_silence_count: 0,
      reply_edges: [],
      relationship_dynamics: normalizeRelationshipDynamics(analysis.relationshipDynamics),
    }
  }

  const participants: NormalizedParticipant[] = analysis.participants
    .map((participant) => ({
      sender: participant.sender,
      message_count: participant.messageCount,
      word_count: participant.wordCount,
      message_share_pct: participant.messageShare,
    }))
    .sort((left, right) => (left.sender < right.sender ? -1 : left.sender > right.sender ? 1 : 0))

  const reply_edges: NormalizedReplyEdge[] = analysis.replyEdges
    .map((edge) => ({ from: edge.from, to: edge.to, count: edge.count }))
    .sort((left, right) =>
      left.from === right.from
        ? left.to < right.to
          ? -1
          : left.to > right.to
            ? 1
            : 0
        : left.from < right.from
          ? -1
          : 1,
    )

  return {
    message_count: analysis.overview.messageCount,
    participant_count: analysis.overview.participantCount,
    participants,
    reply_count: analysis.replyDynamics.replyCount,
    thread_count: analysis.threadCount,
    peak_hour: analysis.activity.peakHour,
    peak_weekday: analysis.activity.peakDay,
    quick_reply_rate_pct: analysis.replyDynamics.quickReplyRate,
    within_one_hour_rate_pct: analysis.replyDynamics.withinOneHourRate,
    within_six_hours_rate_pct: analysis.replyDynamics.withinSixHoursRate,
    within_one_day_rate_pct: analysis.replyDynamics.withinDayRate,
    avg_reply_delay_min: analysis.replyDynamics.avgReplyMinutes,
    median_reply_delay_min: analysis.replyDynamics.medianReplyMinutes,
    longest_silence_min: analysis.silenceSummary.longestSilenceMinutes,
    unusual_silence_count: analysis.silenceSummary.unusualSilenceCount,
    reply_edges,
    relationship_dynamics: normalizeRelationshipDynamics(analysis.relationshipDynamics),
  }
}

function normalizeRelationshipDynamics(dynamics: RelationshipDynamics): NormalizedRelationshipDynamics {
  return {
    turn_count: dynamics.turns.length,
    turns: dynamics.turns.map((turn) => ({
      sender: turn.sender,
      message_count: turn.messageCount,
      word_count: turn.wordCount,
      duration_min: turn.durationMinutes,
      starts_thread: turn.startsThread,
      open_at_export_end: turn.openAtExportEnd,
    })),
    participants: dynamics.participantSummaries
      .map((participant) => ({
        sender: participant.sender,
        turn_count: participant.turnCount,
        turn_share_pct: participant.turnShare,
        median_reply_delay_min: participant.medianReplyMinutes,
        reply_sample_count: participant.replySampleCount,
        thread_starts: participant.threadStarts,
        reconnections: participant.reconnectionCount,
        follow_ups: participant.followUpCount,
        follow_up_relevant_turns: participant.followUpRelevantTurnCount,
        follow_up_rate_pct: participant.followUpRate,
      }))
      .sort((left, right) => left.sender.localeCompare(right.sender)),
    pause_summary: {
      long_pause_count: dynamics.pauseSummary.longPauseCount,
      latest_gap_percentile: dynamics.pauseSummary.latestGapPercentile,
      reconnecting_participants: dynamics.pauseSummary.reconnectingParticipants.map((participant) => ({
        sender: participant.sender,
        count: participant.count,
        share_pct: participant.share,
      })),
    },
    adaptive_windows: dynamics.adaptiveWindows.map((bucket) => ({
      start: bucket.start,
      end: bucket.end,
      partial: bucket.partial,
      eligible: bucket.eligible,
      message_count: bucket.messageCount,
      active_days: bucket.activeDays,
      turn_count: bucket.turnCount,
      thread_count: bucket.threadCount,
      reconnection_count: bucket.reconnectionCount,
    })),
    early_late: normalizeComparison(dynamics.earlyLate),
    recent_prior: normalizeComparison(dynamics.recentPrior),
  }
}

function normalizeComparison(comparison: DynamicsComparison): NormalizedComparison {
  return {
    available: comparison.available,
    unavailable_reason: comparison.unavailableReason,
    earlier_period: {
      start: comparison.earlierPeriod.start,
      end: comparison.earlierPeriod.end,
      message_count: comparison.earlierPeriod.messageCount,
      active_days: comparison.earlierPeriod.activeDays,
    },
    later_period: {
      start: comparison.laterPeriod.start,
      end: comparison.laterPeriod.end,
      message_count: comparison.laterPeriod.messageCount,
      active_days: comparison.laterPeriod.activeDays,
    },
    changes: comparison.changes
      .map((change) => ({
        metric: change.metric,
        sender: change.sender,
        evidence_state: change.evidenceState,
        direction: change.direction,
        notable: change.notable,
        earlier_value: change.earlierValue,
        later_value: change.laterValue,
        earlier_sample_size: change.earlierSampleSize,
        later_sample_size: change.laterSampleSize,
      }))
      .sort((left, right) =>
        left.metric === right.metric
          ? (left.sender ?? "").localeCompare(right.sender ?? "")
          : left.metric.localeCompare(right.metric),
      ),
  }
}
