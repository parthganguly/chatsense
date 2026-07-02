import type { ChatMessage } from "./chat-parser"
import { getSenders } from "./chat-parser"
import {
  QUICK_REPLY_MAX_MIN,
  SILENCE_ANOMALY_FLOOR_MIN,
  SILENCE_ANOMALY_K,
  SILENCE_ANOMALY_SCALE,
  THREAD_GAP_MIN,
  WITHIN_ONE_DAY_MAX_MIN,
  WITHIN_ONE_HOUR_MAX_MIN,
  WITHIN_SIX_HOURS_MAX_MIN,
} from "./contract"
import { evaluateForecastingResearch, type ForecastingResearchReport } from "./forecasting"
import { buildInsightNarrative, type InsightNarrative } from "./insight-narrative"
import {
  analyzeRelationshipDynamics,
  getDefaultRelationshipDynamics,
  type RelationshipDynamics,
} from "./relationship-dynamics"

const MINUTE_MS = 60 * 1000
const THREAD_GAP_MINUTES = THREAD_GAP_MIN

export interface ConversationOverview {
  messageCount: number
  participantCount: number
  activeDays: number
  totalWords: number
  avgMessagesPerActiveDay: number
  startedAt: string
  endedAt: string
}

export interface ParticipantInsight {
  sender: string
  messageCount: number
  messageShare: number
  wordCount: number
  replyCount: number
  medianReplyMinutes: number | null
  initiationCount: number
}

export interface ReplyDynamics {
  replyCount: number
  avgReplyMinutes: number | null
  medianReplyMinutes: number | null
  quickReplyRate: number
  withinOneHourRate: number
  withinSixHoursRate: number
  withinDayRate: number
}

export interface SilenceSummary {
  longestSilenceMinutes: number | null
  unusualSilenceCount: number
  unusualSilenceThresholdMinutes: number | null
  latestUnusualSilence: {
    startedAt: string
    endedAt: string
    durationMinutes: number
  } | null
}

export interface ActivityPoint {
  label: string
  count: number
}

export interface ActivitySummary {
  peakHour: number
  peakDay: string
  recentTrend: "rising" | "stable" | "falling" | "not_enough_data"
  recentVsPriorPct: number | null
  nightMessageRate: number
  hourlyCounts: ActivityPoint[]
  weekdayCounts: ActivityPoint[]
  dailyCounts: ActivityPoint[]
}

export interface ReplyEdge {
  from: string
  to: string
  count: number
}

export interface ObservableInsight {
  tone: "watch" | "pattern" | "context"
  title: string
  detail: string
}

export interface ChatAnalysis {
  overview: ConversationOverview
  participants: ParticipantInsight[]
  replyDynamics: ReplyDynamics
  silenceSummary: SilenceSummary
  activity: ActivitySummary
  relationshipDynamics: RelationshipDynamics
  forecastingResearch: ForecastingResearchReport
  narrative: InsightNarrative
  replyEdges: ReplyEdge[]
  threadCount: number
  insights: ObservableInsight[]
}

interface ReplyEvent {
  messageIndex: number
  sender: string
  previousSender: string
  delayMinutes: number
}

interface SilenceEvent {
  startedAt: Date
  endedAt: Date
  durationMinutes: number
}

export function analyzeChat(inputMessages: ChatMessage[]): ChatAnalysis {
  const messages = [...inputMessages]
    .filter((message) => !Number.isNaN(message.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())

  if (messages.length === 0) {
    return getDefaultAnalysis()
  }

  const senders = getSenders(messages)
  const gaps = getGaps(messages)
  const replyEvents = getReplyEvents(messages)
  const threadStarts = messages.map((message, index) => {
    if (index === 0) return true
    return gapMinutes(messages[index - 1], message) >= THREAD_GAP_MINUTES
  })
  const activity = analyzeActivity(messages)
  const silenceSummary = analyzeSilences(messages, gaps)
  const participants = analyzeParticipants(messages, senders, replyEvents, threadStarts)
  const replyDynamics = analyzeReplies(replyEvents)
  const relationshipDynamics = analyzeRelationshipDynamics(messages)
  const forecastingResearch = evaluateForecastingResearch(messages)
  const replyEdges = buildReplyEdges(replyEvents)
  const overview = buildOverview(messages, senders)
  const narrative = buildInsightNarrative({
    overview,
    participants,
    replies: replyDynamics,
    activity,
    relationshipDynamics,
    forecastingResearch,
  })

  return {
    overview,
    participants,
    replyDynamics,
    silenceSummary,
    activity,
    relationshipDynamics,
    forecastingResearch,
    narrative,
    replyEdges,
    threadCount: threadStarts.filter(Boolean).length,
    insights: buildInsights(overview, participants, replyDynamics, activity, relationshipDynamics),
  }
}

function buildOverview(messages: ChatMessage[], senders: string[]): ConversationOverview {
  const activeDays = new Set(messages.map((message) => toDateKey(message.timestamp))).size
  const totalWords = messages.reduce((total, message) => total + countWords(message.content), 0)

  return {
    messageCount: messages.length,
    participantCount: senders.length,
    activeDays,
    totalWords,
    avgMessagesPerActiveDay: round(messages.length / Math.max(activeDays, 1), 1),
    startedAt: messages[0].timestamp.toISOString(),
    endedAt: messages[messages.length - 1].timestamp.toISOString(),
  }
}

function analyzeParticipants(
  messages: ChatMessage[],
  senders: string[],
  replyEvents: ReplyEvent[],
  threadStarts: boolean[],
): ParticipantInsight[] {
  return senders
    .map((sender) => {
      const senderMessages = messages.filter((message) => message.sender === sender)
      const replyDelays = replyEvents
        .filter((event) => event.sender === sender)
        .map((event) => event.delayMinutes)
      const initiationCount = messages.reduce(
        (total, message, index) => total + (threadStarts[index] && message.sender === sender ? 1 : 0),
        0,
      )

      return {
        sender,
        messageCount: senderMessages.length,
        messageShare: round((senderMessages.length / messages.length) * 100),
        wordCount: senderMessages.reduce((total, message) => total + countWords(message.content), 0),
        replyCount: replyDelays.length,
        medianReplyMinutes: median(replyDelays),
        initiationCount,
      }
    })
    .sort((left, right) => right.messageCount - left.messageCount)
}

function analyzeReplies(replyEvents: ReplyEvent[]): ReplyDynamics {
  const delays = replyEvents.map((event) => event.delayMinutes)
  if (delays.length === 0) {
    return {
      replyCount: 0,
      avgReplyMinutes: null,
      medianReplyMinutes: null,
      quickReplyRate: 0,
      withinOneHourRate: 0,
      withinSixHoursRate: 0,
      withinDayRate: 0,
    }
  }

  return {
    replyCount: delays.length,
    avgReplyMinutes: round(delays.reduce((total, delay) => total + delay, 0) / delays.length),
    medianReplyMinutes: median(delays),
    quickReplyRate: percentage(delays.filter((delay) => delay < QUICK_REPLY_MAX_MIN).length, delays.length),
    withinOneHourRate: percentage(delays.filter((delay) => delay <= WITHIN_ONE_HOUR_MAX_MIN).length, delays.length),
    withinSixHoursRate: percentage(delays.filter((delay) => delay <= WITHIN_SIX_HOURS_MAX_MIN).length, delays.length),
    withinDayRate: percentage(delays.filter((delay) => delay <= WITHIN_ONE_DAY_MAX_MIN).length, delays.length),
  }
}

function analyzeSilences(messages: ChatMessage[], gaps: number[]): SilenceSummary {
  if (gaps.length === 0) {
    return {
      longestSilenceMinutes: null,
      unusualSilenceCount: 0,
      unusualSilenceThresholdMinutes: null,
      latestUnusualSilence: null,
    }
  }

  const medianGap = median(gaps) ?? 0
  const absoluteDeviations = gaps.map((gap) => Math.abs(gap - medianGap))
  const medianAbsoluteDeviation = median(absoluteDeviations) ?? 0
  const robustThreshold = medianGap + SILENCE_ANOMALY_K * SILENCE_ANOMALY_SCALE * medianAbsoluteDeviation
  const threshold = Math.max(SILENCE_ANOMALY_FLOOR_MIN, robustThreshold)
  const unusualSilences: SilenceEvent[] = []

  for (let index = 1; index < messages.length; index += 1) {
    const durationMinutes = gapMinutes(messages[index - 1], messages[index])
    if (durationMinutes > threshold) {
      unusualSilences.push({
        startedAt: messages[index - 1].timestamp,
        endedAt: messages[index].timestamp,
        durationMinutes,
      })
    }
  }

  const latest = unusualSilences.at(-1)
  return {
    longestSilenceMinutes: round(Math.max(...gaps)),
    unusualSilenceCount: unusualSilences.length,
    unusualSilenceThresholdMinutes: round(threshold),
    latestUnusualSilence: latest
      ? {
          startedAt: latest.startedAt.toISOString(),
          endedAt: latest.endedAt.toISOString(),
          durationMinutes: round(latest.durationMinutes),
        }
      : null,
  }
}

function analyzeActivity(messages: ChatMessage[]): ActivitySummary {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ label: String(hour), count: 0 }))
  const weekdays = dayNames.map((day) => ({ label: day, count: 0 }))
  const dailyMap = new Map<string, number>()

  for (const message of messages) {
    hourly[message.timestamp.getHours()].count += 1
    weekdays[message.timestamp.getDay()].count += 1
    const dateKey = toDateKey(message.timestamp)
    dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + 1)
  }

  const dailyCounts = fillDailyCounts(messages[0].timestamp, messages.at(-1)!.timestamp, dailyMap)
  const peakHour = highestIndex(hourly.map((item) => item.count))
  const peakDayIndex = highestIndex(weekdays.map((item) => item.count))
  const trend = getRecentTrend(dailyCounts)
  const nightMessages = messages.filter((message) => {
    const hour = message.timestamp.getHours()
    return hour >= 22 || hour < 6
  }).length

  return {
    peakHour,
    peakDay: dayNames[peakDayIndex],
    recentTrend: trend.label,
    recentVsPriorPct: trend.deltaPct,
    nightMessageRate: percentage(nightMessages, messages.length),
    hourlyCounts: hourly,
    weekdayCounts: weekdays,
    dailyCounts: dailyCounts.slice(-30),
  }
}

function buildReplyEdges(replyEvents: ReplyEvent[]): ReplyEdge[] {
  const edges = new Map<string, ReplyEdge>()
  for (const event of replyEvents) {
    const key = `${event.sender}\u0000${event.previousSender}`
    const edge = edges.get(key) ?? { from: event.sender, to: event.previousSender, count: 0 }
    edge.count += 1
    edges.set(key, edge)
  }
  return [...edges.values()].sort((left, right) => right.count - left.count)
}

function buildInsights(
  overview: ConversationOverview,
  participants: ParticipantInsight[],
  replies: ReplyDynamics,
  activity: ActivitySummary,
  relationshipDynamics: RelationshipDynamics,
): ObservableInsight[] {
  const insights: ObservableInsight[] = []
  const topParticipant = participants[0]

  if (participants.length > 1 && topParticipant.messageShare >= 65) {
    insights.push({
      tone: "watch",
      title: "Message volume is uneven",
      detail: `${topParticipant.sender} sent ${topParticipant.messageShare}% of messages in this export. This describes volume, not intent.`,
    })
  } else if (participants.length > 1) {
    insights.push({
      tone: "pattern",
      title: "Message volume is fairly distributed",
      detail: `The most active participant sent ${topParticipant.messageShare}% of ${formatNumber(overview.messageCount)} messages.`,
    })
  }

  if (relationshipDynamics.pauseSummary.longPauseCount > 0) {
    const longestPause = relationshipDynamics.pauseSummary.longestPauses[0]
    const reconnectors = relationshipDynamics.pauseSummary.reconnectingParticipants
      .slice(0, 3)
      .map((participant) => participant.sender)
      .join(", ")
    insights.push({
      tone: "watch",
      title: `${relationshipDynamics.pauseSummary.longPauseCount} pause${
        relationshipDynamics.pauseSummary.longPauseCount === 1 ? "" : "s"
      } of at least 24h`,
      detail: `The longest observed pause lasted ${formatDuration(longestPause?.durationMinutes ?? null)}.${
        reconnectors ? ` First messages after 24h pauses came from: ${reconnectors}.` : ""
      }`,
    })
  }

  if (activity.recentTrend !== "not_enough_data") {
    insights.push({
      tone: activity.recentTrend === "falling" ? "watch" : "pattern",
      title: `Recent activity is ${activity.recentTrend}`,
      detail:
        activity.recentVsPriorPct === null
          ? "The recent 7-day window differs from the preceding week."
          : `The latest 7 days changed by ${Math.abs(activity.recentVsPriorPct)}% compared with the preceding 7 days.`,
    })
  }

  if (replies.replyCount > 0) {
    insights.push({
      tone: "context",
      title: `${replies.withinOneHourRate}% of replies arrive within 1 hour`,
      detail: `${replies.withinSixHoursRate}% arrive within 6 hours and ${replies.withinDayRate}% within 24 hours, based on ${formatNumber(replies.replyCount)} observed replies.`,
    })
  }

  const changingDynamics = relationshipDynamics.changeInsights.find((insight) => insight.tone === "pattern")
  if (changingDynamics) {
    insights.push(changingDynamics)
  }

  return insights.slice(0, 4)
}

function getGaps(messages: ChatMessage[]): number[] {
  return messages.slice(1).map((message, index) => gapMinutes(messages[index], message))
}

function getReplyEvents(messages: ChatMessage[]): ReplyEvent[] {
  const events: ReplyEvent[] = []
  for (let index = 1; index < messages.length; index += 1) {
    const previous = messages[index - 1]
    const current = messages[index]
    if (previous.sender !== current.sender) {
      events.push({
        messageIndex: index,
        sender: current.sender,
        previousSender: previous.sender,
        delayMinutes: gapMinutes(previous, current),
      })
    }
  }
  return events
}

function fillDailyCounts(start: Date, end: Date, counts: Map<string, number>): ActivityPoint[] {
  const result: ActivityPoint[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const finalDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cursor <= finalDate) {
    const key = toDateKey(cursor)
    result.push({ label: key, count: counts.get(key) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function getRecentTrend(daily: ActivityPoint[]): {
  label: ActivitySummary["recentTrend"]
  deltaPct: number | null
} {
  if (daily.length < 8) return { label: "not_enough_data", deltaPct: null }
  const recent = daily.slice(-7).reduce((total, day) => total + day.count, 0)
  const prior = daily.slice(-14, -7).reduce((total, day) => total + day.count, 0)
  if (prior === 0) return { label: recent === 0 ? "stable" : "rising", deltaPct: null }
  const deltaPct = round(((recent - prior) / prior) * 100)
  if (deltaPct >= 20) return { label: "rising", deltaPct }
  if (deltaPct <= -20) return { label: "falling", deltaPct }
  return { label: "stable", deltaPct }
}

function gapMinutes(previous: ChatMessage, current: ChatMessage): number {
  return Math.max(0, (current.timestamp.getTime() - previous.timestamp.getTime()) / MINUTE_MS)
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return round(
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
  )
}

function highestIndex(values: number[]): number {
  return values.indexOf(Math.max(...values))
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : round((count / total) * 100)
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "No data"
  if (minutes < 60) return `${Math.round(minutes)}m`
  if (minutes < 24 * 60) return `${round(minutes / 60, 1)}h`
  return `${round(minutes / (24 * 60), 1)}d`
}

function getDefaultAnalysis(): ChatAnalysis {
  return {
    overview: {
      messageCount: 0,
      participantCount: 0,
      activeDays: 0,
      totalWords: 0,
      avgMessagesPerActiveDay: 0,
      startedAt: "",
      endedAt: "",
    },
    participants: [],
    replyDynamics: {
      replyCount: 0,
      avgReplyMinutes: null,
      medianReplyMinutes: null,
      quickReplyRate: 0,
      withinOneHourRate: 0,
      withinSixHoursRate: 0,
      withinDayRate: 0,
    },
    silenceSummary: {
      longestSilenceMinutes: null,
      unusualSilenceCount: 0,
      unusualSilenceThresholdMinutes: null,
      latestUnusualSilence: null,
    },
    activity: {
      peakHour: 0,
      peakDay: "",
      recentTrend: "not_enough_data",
      recentVsPriorPct: null,
      nightMessageRate: 0,
      hourlyCounts: [],
      weekdayCounts: [],
      dailyCounts: [],
    },
    relationshipDynamics: getDefaultRelationshipDynamics(),
    forecastingResearch: evaluateForecastingResearch([]),
    narrative: buildInsightNarrative({
      overview: {
        messageCount: 0,
        participantCount: 0,
        activeDays: 0,
        totalWords: 0,
        avgMessagesPerActiveDay: 0,
        startedAt: "",
        endedAt: "",
      },
      participants: [],
      replies: {
        replyCount: 0,
        avgReplyMinutes: null,
        medianReplyMinutes: null,
        quickReplyRate: 0,
        withinOneHourRate: 0,
        withinSixHoursRate: 0,
        withinDayRate: 0,
      },
      activity: {
        peakHour: 0,
        peakDay: "",
        recentTrend: "not_enough_data",
        recentVsPriorPct: null,
        nightMessageRate: 0,
        hourlyCounts: [],
        weekdayCounts: [],
        dailyCounts: [],
      },
      relationshipDynamics: getDefaultRelationshipDynamics(),
      forecastingResearch: evaluateForecastingResearch([]),
    }),
    replyEdges: [],
    threadCount: 0,
    insights: [],
  }
}
