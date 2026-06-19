import type { ChatMessage } from "./chat-parser"
import {
  ADAPTIVE_WINDOW_RULES,
  EARLY_LATE_MIN_ELIGIBLE_WINDOWS,
  EARLY_LATE_WINDOW_COUNT,
  FOLLOW_UP_MIN,
  MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
  MIN_RECONNECTIONS_PER_PERIOD,
  MIN_REPLY_LATENCY_PER_PARTICIPANT,
  MIN_THREAD_STARTS_PER_PERIOD,
  MIN_WINDOW_ACTIVE_DAYS,
  MIN_WINDOW_MESSAGES,
  NOTABLE_FOLLOW_UP_RATE_ABS_PCT,
  NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
  NOTABLE_RECONNECTION_SHARE_ABS_PCT,
  NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN,
  NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER,
  NOTABLE_THREAD_START_SHARE_ABS_PCT,
  NOTABLE_TURN_SHARE_ABS_PCT,
  RECONNECTION_GAP_MIN,
  RECENT_PRIOR_WINDOW_COUNT,
  THREAD_GAP_MIN,
} from "./contract"

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

export type EvidenceState = "sufficient" | "insufficient" | "unavailable"
export type ChangeDirection = "increased" | "decreased" | "stable" | "faster" | "slower" | "shifted" | "unavailable"
export type ComparisonKind = "early_late" | "recent_prior"
export type MetricKey =
  | "messages_per_active_day"
  | "turn_share"
  | "median_reply_minutes"
  | "thread_start_share"
  | "reconnection_share"
  | "follow_up_rate"

export interface ConversationTurn {
  id: number
  sender: string
  start: string
  end: string
  startMessageIndex: number
  endMessageIndex: number
  messageCount: number
  wordCount: number
  durationMinutes: number
  startsThread: boolean
  openAtExportEnd: boolean
}

export interface ParticipantDynamicsSummary {
  sender: string
  messageCount: number
  turnCount: number
  turnShare: number
  messagesPerTurn: number | null
  wordsPerTurn: number | null
  medianTurnMessageCount: number | null
  medianReplyMinutes: number | null
  replySampleCount: number
  threadStarts: number
  threadStartShare: number
  reconnectionCount: number
  reconnectionShare: number
  medianSubsequentThreadDurationMinutes: number | null
  medianSubsequentThreadTurnCount: number | null
  followUpCount: number
  followUpRelevantTurnCount: number
  followUpRate: number | null
  medianFollowUpDelayMinutes: number | null
}

export interface AdaptiveWindow {
  index: number
  start: string
  end: string
  partial: boolean
  eligible: boolean
  messageCount: number
  activeDays: number
  turnCount: number
  threadCount: number
  reconnectionCount: number
  participants: ParticipantDynamicsSummary[]
}

export interface PauseReconnectionSummary {
  longPauseCount: number
  latestGapMinutes: number | null
  latestGapPercentile: number | null
  medianInterMessageGapMinutes: number | null
  longestPauses: PauseEntry[]
  reconnectingParticipants: Array<{ sender: string; count: number; share: number }>
}

export interface PauseEntry {
  startedAt: string
  endedAt: string
  durationMinutes: number
  reconnectingSender: string | null
}

export interface ComparisonPeriod {
  label: string
  start: string | null
  end: string | null
  windowIndices: number[]
  messageCount: number
  activeDays: number
  turnCount: number
  threadCount: number
  reconnectionCount: number
}

export interface MetricChange {
  metric: MetricKey
  label: string
  sender: string | null
  earlierValue: number | string | null
  laterValue: number | string | null
  absoluteDifference: number | null
  relativeDifferencePct: number | null
  earlierPeriod: Pick<ComparisonPeriod, "label" | "start" | "end">
  laterPeriod: Pick<ComparisonPeriod, "label" | "start" | "end">
  earlierSampleSize: number
  laterSampleSize: number
  direction: ChangeDirection
  evidenceState: EvidenceState
  notable: boolean
  explanation: string
  guardrail: string
}

export interface DynamicsComparison {
  kind: ComparisonKind
  label: string
  available: boolean
  unavailableReason: string | null
  earlierPeriod: ComparisonPeriod
  laterPeriod: ComparisonPeriod
  changes: MetricChange[]
}

export interface ObservableInsight {
  tone: "watch" | "pattern" | "context"
  title: string
  detail: string
}

export interface RelationshipDynamics {
  windowSizeDays: number
  turns: ConversationTurn[]
  adaptiveWindows: AdaptiveWindow[]
  participantSummaries: ParticipantDynamicsSummary[]
  pauseSummary: PauseReconnectionSummary
  earlyLate: DynamicsComparison
  recentPrior: DynamicsComparison
  notableChanges: MetricChange[]
  changeInsights: ObservableInsight[]
}

interface ReplyEvent {
  messageIndex: number
  sender: string
  previousSender: string
  delayMinutes: number
}

interface ReconnectionEvent {
  messageIndex: number
  sender: string
  timestamp: Date
  gapMinutes: number
  subsequentThreadDurationMinutes: number
  subsequentThreadTurnCount: number
}

interface FollowUpEvent {
  messageIndex: number
  turnId: number
  sender: string
  timestamp: Date
  delayMinutes: number
}

interface ThreadSummary {
  id: number
  startTurnIndex: number
  endTurnIndex: number
  startMessageIndex: number
  endMessageIndex: number
  start: Date
  end: Date
  durationMinutes: number
  turnCount: number
}

interface PeriodInternals {
  period: ComparisonPeriod
  participants: ParticipantDynamicsSummary[]
}

export function analyzeRelationshipDynamics(messages: ChatMessage[]): RelationshipDynamics {
  if (messages.length === 0) return getDefaultRelationshipDynamics()

  const participants = uniqueSenders(messages)
  const turns = buildTurns(messages)
  const threads = buildThreads(turns)
  const turnByMessageIndex = indexTurnsByMessage(turns)
  const replyEvents = buildReplyEvents(messages)
  const reconnections = buildReconnectionEvents(messages, turns, threads, turnByMessageIndex)
  const followUps = buildFollowUpEvents(messages, turnByMessageIndex)
  const windows = buildAdaptiveWindows(messages, turns, replyEvents, reconnections, followUps, participants)
  const participantSummaries = summarizeScope(
    "Full export",
    allWindowIndices(windows),
    messages,
    turns,
    replyEvents,
    reconnections,
    followUps,
    participants,
    () => true,
  ).participants
  const earlyLate = buildEarlyLateComparison(windows, messages, turns, replyEvents, reconnections, followUps, participants)
  const recentPrior = buildRecentPriorComparison(windows, messages, turns, replyEvents, reconnections, followUps, participants)
  const notableChanges = [...earlyLate.changes, ...recentPrior.changes].filter((change) => change.notable)
  const changeInsights = buildChangeInsights(notableChanges, earlyLate, recentPrior)

  return {
    windowSizeDays: chooseWindowSize(spanDaysInclusive(messages[0].timestamp, messages.at(-1)!.timestamp)),
    turns,
    adaptiveWindows: windows,
    participantSummaries,
    pauseSummary: buildPauseSummary(messages, reconnections),
    earlyLate,
    recentPrior,
    notableChanges,
    changeInsights,
  }
}

export function getDefaultRelationshipDynamics(): RelationshipDynamics {
  const unavailable = unavailableComparison("early_late", "Early versus late", "No valid messages were found.")
  return {
    windowSizeDays: 7,
    turns: [],
    adaptiveWindows: [],
    participantSummaries: [],
    pauseSummary: {
      longPauseCount: 0,
      latestGapMinutes: null,
      latestGapPercentile: null,
      medianInterMessageGapMinutes: null,
      longestPauses: [],
      reconnectingParticipants: [],
    },
    earlyLate: unavailable,
    recentPrior: unavailableComparison("recent_prior", "Recent versus prior", "No valid messages were found."),
    notableChanges: [],
    changeInsights: [],
  }
}

function buildTurns(messages: ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = []
  let current: MutableTurn | null = null

  messages.forEach((message, index) => {
    const previous = messages[index - 1]
    const gap = previous ? gapMinutes(previous.timestamp, message.timestamp) : null
    const startsThread = index === 0 || (gap !== null && gap >= THREAD_GAP_MIN)
    const startsNewTurn = !current || startsThread || previous?.sender !== message.sender

    if (startsNewTurn) {
      if (current) turns.push(finalizeTurn(current, false))
      current = {
        id: turns.length,
        sender: message.sender,
        start: message.timestamp,
        end: message.timestamp,
        startMessageIndex: index,
        endMessageIndex: index,
        messageCount: 0,
        wordCount: 0,
        startsThread,
      }
    }

    if (!current) return
    current.messageCount += 1
    current.wordCount += countWords(message.content)
    current.end = message.timestamp
    current.endMessageIndex = index
  })

  if (current) turns.push(finalizeTurn(current, true))
  return turns
}

interface MutableTurn {
  id: number
  sender: string
  start: Date
  end: Date
  startMessageIndex: number
  endMessageIndex: number
  messageCount: number
  wordCount: number
  startsThread: boolean
}

function finalizeTurn(turn: MutableTurn, openAtExportEnd: boolean): ConversationTurn {
  return {
    id: turn.id,
    sender: turn.sender,
    start: turn.start.toISOString(),
    end: turn.end.toISOString(),
    startMessageIndex: turn.startMessageIndex,
    endMessageIndex: turn.endMessageIndex,
    messageCount: turn.messageCount,
    wordCount: turn.wordCount,
    durationMinutes: round(gapMinutes(turn.start, turn.end)),
    startsThread: turn.startsThread,
    openAtExportEnd,
  }
}

function buildThreads(turns: ConversationTurn[]): ThreadSummary[] {
  const startIndices = turns.flatMap((turn, index) => (turn.startsThread ? [index] : []))
  return startIndices.map((startTurnIndex, threadIndex) => {
    const endTurnIndex = (startIndices[threadIndex + 1] ?? turns.length) - 1
    const startTurn = turns[startTurnIndex]
    const endTurn = turns[endTurnIndex]
    const start = new Date(startTurn.start)
    const end = new Date(endTurn.end)
    return {
      id: threadIndex,
      startTurnIndex,
      endTurnIndex,
      startMessageIndex: startTurn.startMessageIndex,
      endMessageIndex: endTurn.endMessageIndex,
      start,
      end,
      durationMinutes: round(gapMinutes(start, end)),
      turnCount: endTurnIndex - startTurnIndex + 1,
    }
  })
}

function indexTurnsByMessage(turns: ConversationTurn[]): Map<number, ConversationTurn> {
  const map = new Map<number, ConversationTurn>()
  for (const turn of turns) {
    for (let index = turn.startMessageIndex; index <= turn.endMessageIndex; index += 1) {
      map.set(index, turn)
    }
  }
  return map
}

function buildReplyEvents(messages: ChatMessage[]): ReplyEvent[] {
  const events: ReplyEvent[] = []
  for (let index = 1; index < messages.length; index += 1) {
    const previous = messages[index - 1]
    const current = messages[index]
    if (previous.sender !== current.sender) {
      events.push({
        messageIndex: index,
        sender: current.sender,
        previousSender: previous.sender,
        delayMinutes: gapMinutes(previous.timestamp, current.timestamp),
      })
    }
  }
  return events
}

function buildReconnectionEvents(
  messages: ChatMessage[],
  turns: ConversationTurn[],
  threads: ThreadSummary[],
  turnByMessageIndex: Map<number, ConversationTurn>,
): ReconnectionEvent[] {
  const threadByTurnId = new Map<number, ThreadSummary>()
  for (const thread of threads) {
    for (let turnIndex = thread.startTurnIndex; turnIndex <= thread.endTurnIndex; turnIndex += 1) {
      threadByTurnId.set(turns[turnIndex].id, thread)
    }
  }

  const events: ReconnectionEvent[] = []
  for (let index = 1; index < messages.length; index += 1) {
    const gap = gapMinutes(messages[index - 1].timestamp, messages[index].timestamp)
    if (gap >= RECONNECTION_GAP_MIN) {
      const turn = turnByMessageIndex.get(index)
      const thread = turn ? threadByTurnId.get(turn.id) : null
      events.push({
        messageIndex: index,
        sender: messages[index].sender,
        timestamp: messages[index].timestamp,
        gapMinutes: gap,
        subsequentThreadDurationMinutes: thread?.durationMinutes ?? 0,
        subsequentThreadTurnCount: thread?.turnCount ?? 1,
      })
    }
  }
  return events
}

function buildFollowUpEvents(messages: ChatMessage[], turnByMessageIndex: Map<number, ConversationTurn>): FollowUpEvent[] {
  const events: FollowUpEvent[] = []
  for (let index = 1; index < messages.length; index += 1) {
    const previous = messages[index - 1]
    const current = messages[index]
    const gap = gapMinutes(previous.timestamp, current.timestamp)
    if (previous.sender === current.sender && gap >= FOLLOW_UP_MIN && gap < THREAD_GAP_MIN) {
      const turn = turnByMessageIndex.get(index)
      if (turn) {
        events.push({
          messageIndex: index,
          turnId: turn.id,
          sender: current.sender,
          timestamp: current.timestamp,
          delayMinutes: gap,
        })
      }
    }
  }
  return events
}

function buildAdaptiveWindows(
  messages: ChatMessage[],
  turns: ConversationTurn[],
  replyEvents: ReplyEvent[],
  reconnections: ReconnectionEvent[],
  followUps: FollowUpEvent[],
  participants: string[],
): AdaptiveWindow[] {
  const firstDate = startOfDay(messages[0].timestamp)
  const lastDate = startOfDay(messages.at(-1)!.timestamp)
  const windowSizeDays = chooseWindowSize(spanDaysInclusive(messages[0].timestamp, messages.at(-1)!.timestamp))
  const windows: AdaptiveWindow[] = []
  let cursor = firstDate
  let index = 0

  while (cursor <= lastDate) {
    const start = new Date(cursor)
    const endExclusive = addDays(start, windowSizeDays)
    const endInclusive = addDays(endExclusive, -1)
    const partial = lastDate < endInclusive
    const scope = summarizeScope(
      `Window ${index + 1}`,
      [index],
      messages,
      turns,
      replyEvents,
      reconnections,
      followUps,
      participants,
      (date) => date >= start && date < endExclusive,
    )
    windows.push({
      index,
      start: dateKey(start),
      end: dateKey(partial ? lastDate : endInclusive),
      partial,
      eligible: scope.period.messageCount >= MIN_WINDOW_MESSAGES && scope.period.activeDays >= MIN_WINDOW_ACTIVE_DAYS,
      messageCount: scope.period.messageCount,
      activeDays: scope.period.activeDays,
      turnCount: scope.period.turnCount,
      threadCount: scope.period.threadCount,
      reconnectionCount: scope.period.reconnectionCount,
      participants: scope.participants,
    })
    cursor = endExclusive
    index += 1
  }

  return windows
}

function summarizeScope(
  label: string,
  windowIndices: number[],
  messages: ChatMessage[],
  turns: ConversationTurn[],
  replyEvents: ReplyEvent[],
  reconnections: ReconnectionEvent[],
  followUps: FollowUpEvent[],
  participants: string[],
  includesDate: (date: Date) => boolean,
): PeriodInternals {
  const scopedMessages = messages.filter((message) => includesDate(message.timestamp))
  const scopedTurns = turns.filter((turn) => includesDate(new Date(turn.start)))
  const scopedReplies = replyEvents.filter((event) => includesDate(messages[event.messageIndex].timestamp))
  const scopedReconnections = reconnections.filter((event) => includesDate(event.timestamp))
  const scopedFollowUps = followUps.filter((event) => includesDate(event.timestamp))
  const activeDays = new Set(scopedMessages.map((message) => dateKey(message.timestamp))).size
  const scopedThreadStarts = scopedTurns.filter((turn) => turn.startsThread)
  const totalTurns = scopedTurns.length
  const totalThreadStarts = scopedThreadStarts.length
  const totalReconnections = scopedReconnections.length

  const participantSummaries = participants.map((sender) => {
    const senderMessages = scopedMessages.filter((message) => message.sender === sender)
    const senderTurns = scopedTurns.filter((turn) => turn.sender === sender)
    const senderReplies = scopedReplies.filter((event) => event.sender === sender)
    const senderThreadStarts = scopedThreadStarts.filter((turn) => turn.sender === sender)
    const senderReconnections = scopedReconnections.filter((event) => event.sender === sender)
    const senderFollowUps = scopedFollowUps.filter((event) => event.sender === sender)
    const followUpTurnIds = new Set(senderFollowUps.map((event) => event.turnId))
    const relevantTurns = senderTurns.filter((turn) => isRelevantFollowUpTurn(turn, turns))

    return {
      sender,
      messageCount: senderMessages.length,
      turnCount: senderTurns.length,
      turnShare: percentage(senderTurns.length, totalTurns),
      messagesPerTurn: senderTurns.length ? round(senderMessages.length / senderTurns.length, 1) : null,
      wordsPerTurn: senderTurns.length ? round(sum(senderTurns.map((turn) => turn.wordCount)) / senderTurns.length, 1) : null,
      medianTurnMessageCount: median(senderTurns.map((turn) => turn.messageCount)),
      medianReplyMinutes: median(senderReplies.map((event) => event.delayMinutes)),
      replySampleCount: senderReplies.length,
      threadStarts: senderThreadStarts.length,
      threadStartShare: percentage(senderThreadStarts.length, totalThreadStarts),
      reconnectionCount: senderReconnections.length,
      reconnectionShare: percentage(senderReconnections.length, totalReconnections),
      medianSubsequentThreadDurationMinutes: median(
        senderReconnections.map((event) => event.subsequentThreadDurationMinutes),
      ),
      medianSubsequentThreadTurnCount: median(senderReconnections.map((event) => event.subsequentThreadTurnCount)),
      followUpCount: senderFollowUps.length,
      followUpRelevantTurnCount: relevantTurns.length,
      followUpRate: relevantTurns.length ? percentage(followUpTurnIds.size, relevantTurns.length) : null,
      medianFollowUpDelayMinutes: median(senderFollowUps.map((event) => event.delayMinutes)),
    }
  })

  return {
    period: {
      label,
      start: scopedMessages[0] ? dateKey(scopedMessages[0].timestamp) : null,
      end: scopedMessages.at(-1) ? dateKey(scopedMessages.at(-1)!.timestamp) : null,
      windowIndices,
      messageCount: scopedMessages.length,
      activeDays,
      turnCount: totalTurns,
      threadCount: totalThreadStarts,
      reconnectionCount: totalReconnections,
    },
    participants: participantSummaries,
  }
}

function isRelevantFollowUpTurn(turn: ConversationTurn, allTurns: ConversationTurn[]): boolean {
  if (turn.messageCount > 1) return true
  if (turn.openAtExportEnd) return false
  const nextTurn = allTurns[turn.id + 1]
  return Boolean(nextTurn && !nextTurn.startsThread && nextTurn.sender !== turn.sender)
}

function buildEarlyLateComparison(
  windows: AdaptiveWindow[],
  messages: ChatMessage[],
  turns: ConversationTurn[],
  replies: ReplyEvent[],
  reconnections: ReconnectionEvent[],
  followUps: FollowUpEvent[],
  participants: string[],
): DynamicsComparison {
  const eligible = windows.filter((bucket) => bucket.eligible)
  if (eligible.length < EARLY_LATE_MIN_ELIGIBLE_WINDOWS) {
    return unavailableComparison(
      "early_late",
      "Early versus late",
      `Requires ${EARLY_LATE_MIN_ELIGIBLE_WINDOWS} eligible windows; found ${eligible.length}.`,
    )
  }
  const early = eligible.slice(0, EARLY_LATE_WINDOW_COUNT)
  const late = eligible.slice(-EARLY_LATE_WINDOW_COUNT)
  return buildComparison(
    "early_late",
    "Early versus late",
    "Early eligible windows",
    "Late eligible windows",
    early,
    late,
    messages,
    turns,
    replies,
    reconnections,
    followUps,
    participants,
  )
}

function buildRecentPriorComparison(
  windows: AdaptiveWindow[],
  messages: ChatMessage[],
  turns: ConversationTurn[],
  replies: ReplyEvent[],
  reconnections: ReconnectionEvent[],
  followUps: FollowUpEvent[],
  participants: string[],
): DynamicsComparison {
  const eligible = windows.filter((bucket) => bucket.eligible)
  if (eligible.length < 2) {
    return unavailableComparison("recent_prior", "Recent versus prior", `Requires 2 eligible windows; found ${eligible.length}.`)
  }
  const prior = eligible.slice(-(RECENT_PRIOR_WINDOW_COUNT + 1), -RECENT_PRIOR_WINDOW_COUNT)
  const recent = eligible.slice(-RECENT_PRIOR_WINDOW_COUNT)
  return buildComparison(
    "recent_prior",
    "Recent versus prior",
    "Prior eligible window",
    "Recent eligible window",
    prior,
    recent,
    messages,
    turns,
    replies,
    reconnections,
    followUps,
    participants,
  )
}

function buildComparison(
  kind: ComparisonKind,
  label: string,
  earlierLabel: string,
  laterLabel: string,
  earlierWindows: AdaptiveWindow[],
  laterWindows: AdaptiveWindow[],
  messages: ChatMessage[],
  turns: ConversationTurn[],
  replies: ReplyEvent[],
  reconnections: ReconnectionEvent[],
  followUps: FollowUpEvent[],
  participants: string[],
): DynamicsComparison {
  const earlier = summarizeWindowGroup(earlierLabel, earlierWindows, messages, turns, replies, reconnections, followUps, participants)
  const later = summarizeWindowGroup(laterLabel, laterWindows, messages, turns, replies, reconnections, followUps, participants)
  const changes = buildMetricChanges(earlier, later, participants)
  return {
    kind,
    label,
    available: true,
    unavailableReason: null,
    earlierPeriod: earlier.period,
    laterPeriod: later.period,
    changes,
  }
}

function summarizeWindowGroup(
  label: string,
  windows: AdaptiveWindow[],
  messages: ChatMessage[],
  turns: ConversationTurn[],
  replies: ReplyEvent[],
  reconnections: ReconnectionEvent[],
  followUps: FollowUpEvent[],
  participants: string[],
): PeriodInternals {
  const windowSet = new Set(windows.map((bucket) => bucket.index))
  const ranges = windows.map((bucket) => ({
    start: parseDateKey(bucket.start),
    endExclusive: addDays(parseDateKey(bucket.end), 1),
  }))
  const summary = summarizeScope(
    label,
    [...windowSet],
    messages,
    turns,
    replies,
    reconnections,
    followUps,
    participants,
    (date) => ranges.some((range) => date >= range.start && date < range.endExclusive),
  )
  summary.period.start = windows[0]?.start ?? null
  summary.period.end = windows.at(-1)?.end ?? null
  return summary
}

function buildMetricChanges(earlier: PeriodInternals, later: PeriodInternals, participants: string[]): MetricChange[] {
  const changes: MetricChange[] = [
    numericChange({
      metric: "messages_per_active_day",
      label: "Messages per active day",
      sender: null,
      earlier,
      later,
      earlierValue: rate(earlier.period.messageCount, earlier.period.activeDays),
      laterValue: rate(later.period.messageCount, later.period.activeDays),
      earlierSample: earlier.period.messageCount,
      laterSample: later.period.messageCount,
      threshold: NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
      thresholdType: "relative",
      explanation: "Message count divided by active calendar days in each compared period.",
    }),
  ]

  for (const sender of participants) {
    const left = earlier.participants.find((participant) => participant.sender === sender)
    const right = later.participants.find((participant) => participant.sender === sender)
    if (!left || !right) continue
    changes.push(
      numericChange({
        metric: "turn_share",
        label: "Turn share",
        sender,
        earlier,
        later,
        earlierValue: left.turnShare,
        laterValue: right.turnShare,
        earlierSample: earlier.period.turnCount,
        laterSample: later.period.turnCount,
        threshold: NOTABLE_TURN_SHARE_ABS_PCT,
        thresholdType: "absolute",
        explanation: "Participant turns divided by all turns in each compared period.",
      }),
      numericChange({
        metric: "median_reply_minutes",
        label: "Median reply timing",
        sender,
        earlier,
        later,
        earlierValue: left.medianReplyMinutes,
        laterValue: right.medianReplyMinutes,
        earlierSample: left.replySampleCount,
        laterSample: right.replySampleCount,
        threshold: NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER,
        thresholdType: "relative_ratio",
        minimumAbsoluteDifference: NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN,
        sampleMinimum: MIN_REPLY_LATENCY_PER_PARTICIPANT,
        fasterIsDecrease: true,
        explanation: "Median delay for sender-switch replies by this participant.",
      }),
      numericChange({
        metric: "thread_start_share",
        label: "Thread-start share",
        sender,
        earlier,
        later,
        earlierValue: left.threadStartShare,
        laterValue: right.threadStartShare,
        earlierSample: earlier.period.threadCount,
        laterSample: later.period.threadCount,
        threshold: NOTABLE_THREAD_START_SHARE_ABS_PCT,
        thresholdType: "absolute",
        sampleMinimum: MIN_THREAD_STARTS_PER_PERIOD,
        explanation: "Participant thread starts divided by total thread starts in each period.",
      }),
      numericChange({
        metric: "reconnection_share",
        label: "Reconnection share",
        sender,
        earlier,
        later,
        earlierValue: left.reconnectionShare,
        laterValue: right.reconnectionShare,
        earlierSample: earlier.period.reconnectionCount,
        laterSample: later.period.reconnectionCount,
        threshold: NOTABLE_RECONNECTION_SHARE_ABS_PCT,
        thresholdType: "absolute",
        sampleMinimum: MIN_RECONNECTIONS_PER_PERIOD,
        explanation: "Participant reconnections divided by total reconnections after 24-hour pauses.",
      }),
      numericChange({
        metric: "follow_up_rate",
        label: "Follow-ups before reply",
        sender,
        earlier,
        later,
        earlierValue: left.followUpRate,
        laterValue: right.followUpRate,
        earlierSample: left.followUpRelevantTurnCount,
        laterSample: right.followUpRelevantTurnCount,
        threshold: NOTABLE_FOLLOW_UP_RATE_ABS_PCT,
        thresholdType: "absolute",
        sampleMinimum: MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
        explanation: "Relevant turns with at least one same-sender follow-up before another participant responds.",
      }),
    )
  }

  return changes
}

function numericChange({
  metric,
  label,
  sender,
  earlier,
  later,
  earlierValue,
  laterValue,
  earlierSample,
  laterSample,
  threshold,
  thresholdType,
  minimumAbsoluteDifference,
  sampleMinimum,
  fasterIsDecrease = false,
  explanation,
}: {
  metric: MetricKey
  label: string
  sender: string | null
  earlier: PeriodInternals
  later: PeriodInternals
  earlierValue: number | null
  laterValue: number | null
  earlierSample: number
  laterSample: number
  threshold: number
  thresholdType: "absolute" | "relative" | "relative_ratio"
  minimumAbsoluteDifference?: number
  sampleMinimum?: number
  fasterIsDecrease?: boolean
  explanation: string
}): MetricChange {
  const hasValues = earlierValue !== null && laterValue !== null
  const samplesSufficient =
    sampleMinimum === undefined || (earlierSample >= sampleMinimum && laterSample >= sampleMinimum)
  const evidenceState: EvidenceState = hasValues && samplesSufficient ? "sufficient" : "insufficient"
  const absoluteDifference = hasValues ? round(laterValue - earlierValue, 1) : null
  const relativeDifferencePct =
    hasValues && earlierValue !== 0 ? round(((laterValue - earlierValue) / Math.abs(earlierValue)) * 100) : null
  const relativeRatio =
    hasValues && earlierValue > 0 && laterValue > 0
      ? Math.max(laterValue / earlierValue, earlierValue / laterValue)
      : null
  const absoluteMinimumMet =
    minimumAbsoluteDifference === undefined || Math.abs(absoluteDifference ?? 0) >= minimumAbsoluteDifference
  const notable =
    evidenceState === "sufficient" &&
    absoluteMinimumMet &&
    (thresholdType === "absolute"
      ? Math.abs(absoluteDifference ?? 0) >= threshold
      : thresholdType === "relative_ratio"
        ? (relativeRatio ?? 0) >= threshold
        : Math.abs(relativeDifferencePct ?? 0) >= threshold)

  return {
    metric,
    label,
    sender,
    earlierValue,
    laterValue,
    absoluteDifference,
    relativeDifferencePct,
    earlierPeriod: periodLabel(earlier.period),
    laterPeriod: periodLabel(later.period),
    earlierSampleSize: earlierSample,
    laterSampleSize: laterSample,
    direction: evidenceState === "sufficient" && absoluteDifference !== null
      ? directionForDelta(absoluteDifference, fasterIsDecrease)
      : "unavailable",
    evidenceState,
    notable,
    explanation,
    guardrail: "This is an observable export pattern, not proof of motive or relationship status.",
  }
}

function directionForDelta(delta: number, fasterIsDecrease: boolean): ChangeDirection {
  if (Math.abs(delta) < 0.0001) return "stable"
  if (fasterIsDecrease) return delta < 0 ? "faster" : "slower"
  return delta > 0 ? "increased" : "decreased"
}

function unavailableComparison(kind: ComparisonKind, label: string, reason: string): DynamicsComparison {
  const emptyPeriod = {
    label: "Unavailable",
    start: null,
    end: null,
    windowIndices: [],
    messageCount: 0,
    activeDays: 0,
    turnCount: 0,
    threadCount: 0,
    reconnectionCount: 0,
  }
  return {
    kind,
    label,
    available: false,
    unavailableReason: reason,
    earlierPeriod: emptyPeriod,
    laterPeriod: emptyPeriod,
    changes: [],
  }
}

function buildPauseSummary(messages: ChatMessage[], reconnections: ReconnectionEvent[]): PauseReconnectionSummary {
  const pauseEntries: PauseEntry[] = messages.slice(1).map((message, index) => ({
    startedAt: messages[index].timestamp.toISOString(),
    endedAt: message.timestamp.toISOString(),
    durationMinutes: round(gapMinutes(messages[index].timestamp, message.timestamp)),
    reconnectingSender: message.sender,
  }))
  const gaps = pauseEntries.map((entry) => entry.durationMinutes)
  const latestGap = gaps.at(-1) ?? null
  const earlierGaps = latestGap === null ? [] : gaps.slice(0, -1)
  const counts = new Map<string, number>()
  for (const event of reconnections) {
    counts.set(event.sender, (counts.get(event.sender) ?? 0) + 1)
  }
  const reconnectingParticipants = [...counts.entries()]
    .map(([sender, count]) => ({ sender, count, share: percentage(count, reconnections.length) }))
    .sort((left, right) => right.count - left.count || left.sender.localeCompare(right.sender))
  return {
    longPauseCount: reconnections.length,
    latestGapMinutes: latestGap === null ? null : round(latestGap),
    medianInterMessageGapMinutes: median(gaps),
    latestGapPercentile:
      latestGap === null || earlierGaps.length === 0
        ? null
        : percentage(earlierGaps.filter((gap) => gap <= latestGap).length, earlierGaps.length),
    longestPauses: [...pauseEntries]
      .sort((left, right) => right.durationMinutes - left.durationMinutes || left.startedAt.localeCompare(right.startedAt))
      .slice(0, 5),
    reconnectingParticipants,
  }
}

function buildChangeInsights(
  notableChanges: MetricChange[],
  earlyLate: DynamicsComparison,
  recentPrior: DynamicsComparison,
): ObservableInsight[] {
  if (notableChanges.length === 0) {
    const unavailable = [earlyLate, recentPrior].find((comparison) => !comparison.available)
    return [
      {
        tone: "context",
        title: unavailable ? "More eligible windows are needed" : "No notable change crossed the threshold",
        detail: unavailable?.unavailableReason ?? "The compared periods did not cross the contract's notable-change thresholds.",
      },
    ]
  }

  return notableChanges.slice(0, 4).map((change) => ({
    tone: "pattern",
    title: `${change.sender ? `${change.sender}: ` : ""}${change.label}`,
    detail: `${change.explanation} ${change.guardrail}`,
  }))
}

function chooseWindowSize(spanDays: number): number {
  const rule = ADAPTIVE_WINDOW_RULES.find((candidate) => candidate.maxSpanDays === null || spanDays <= candidate.maxSpanDays)
  return rule?.windowDays ?? 30
}

function uniqueSenders(messages: ChatMessage[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const message of messages) {
    if (!seen.has(message.sender)) {
      seen.add(message.sender)
      result.push(message.sender)
    }
  }
  return result
}

function allWindowIndices(windows: AdaptiveWindow[]): number[] {
  return windows.map((bucket) => bucket.index)
}

function periodLabel(period: ComparisonPeriod): Pick<ComparisonPeriod, "label" | "start" | "end"> {
  return { label: period.label, start: period.start, end: period.end }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function spanDaysInclusive(start: Date, end: Date): number {
  return Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS) + 1
}

function gapMinutes(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / MINUTE_MS)
}

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return round(sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle])
}

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : round((count / total) * 100)
}

function rate(count: number, denominator: number): number | null {
  return denominator === 0 ? null : round(count / denominator, 1)
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
