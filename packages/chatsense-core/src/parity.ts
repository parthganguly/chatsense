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
  }
}
