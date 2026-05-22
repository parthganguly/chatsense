import type { ChatMessage } from './chat-parser'
import { getSenders } from './chat-parser'

export interface RelationshipSummary {
  strength: number // 0-100
  balance: number // 0-100 (50 = perfectly balanced)
  description: string
}

export interface ConversationStyle {
  avgReplyTime: number // minutes
  quickReplyRate: number // percentage of replies under 5 minutes
  description: string
}

export interface EnergyPeaks {
  peakHour: number // 0-23
  peakDay: string // day of week
  description: string
}

export interface CyclePhase {
  phase: 'PMS' | 'Ovulation' | 'Follicular' | 'Luteal' | 'Unknown'
  confidence: number // 0-100
  currentPhase?: string // current predicted phase
  advice: string // actionable guidance
  nextPhase?: string // upcoming phase prediction
  nextPhaseDate?: string
}

export interface MoodPattern {
  hasCycle: boolean
  cycleLength: number // days
  phases: string[]
  description: string
  moodScores: { date: string; score: number; phase?: string }[] // for visualization
  currentPhase: CyclePhase
}

export interface ConversationInitiators {
  sender1Starts: number
  sender2Starts: number
  sender1Percentage: number
  description: string
}

export interface SentimentAnalysis {
  averageSentiment: number // -1 to 1 (negative to positive)
  weeklyTrend: { week: string; sentiment: number }[]
  dailyScores: { date: string; sentiment: number; phase?: string }[]
  description: string
  phaseCorrelation: { phase: string; avgSentiment: number }[] // sentiment by phase
  actionableInsight: string // real guidance based on trends
}

export interface TurningPoint {
  date: string
  type: 'emotional_spike' | 'conflict' | 'tone_change' | 'gap' | 'intense_conversation' | 'low_energy' | 'reconnection' | 'big_talk' | 'argument' | 'resolved'
  description: string
  significance: number // 0-100
  emotionalIntensity: number // 0-100
  context: string // what happened that day
  phase?: string // associated cycle phase if applicable
  eventType?: string // 'big talk', 'argument', 'reconnection', etc.
}

export interface PersonaInsight {
  persona: 'romantic' | 'boss' | 'family' | 'friend' | 'unknown'
  advice: string
  confidence: number // 0-100
  context: string
}

export interface GuidedAdvice {
  title: string
  advice: string
  timing: 'now' | 'soon' | 'later' | 'wait'
  phase?: string
  mood?: string
  reasoning: string
}

export interface WordFrequency {
  word: string
  frequency: number
}

export interface MessageStyle {
  avgLength: number // characters
  avgWords: number
  shortMessages: number // < 50 chars
  longMessages: number // > 200 chars
  silentDays: number
  burstDays: number // days with > 2x average messages
  description: string
}

export interface VolumeData {
  date: string
  messages: number
}

export interface ReplyTimeData {
  timeRange: string // e.g., "0-5 min"
  count: number
}

export interface ActiveHoursData {
  hour: number
  dayOfWeek: string
  messageCount: number
}

export interface ChatAnalysis {
  relationshipSummary: RelationshipSummary
  conversationStyle: ConversationStyle
  energyPeaks: EnergyPeaks
  moodPattern: MoodPattern
  conversationInitiators: ConversationInitiators
  sentimentAnalysis: SentimentAnalysis
  turningPoints: TurningPoint[]
  personaInsights: PersonaInsight[]
  guidedAdvice: GuidedAdvice[]
  // Removed: topWords, volumeData, replyTimeData (not actionable)
  // Kept activeHoursData for potential future use, but not displayed by default
  activeHoursData: ActiveHoursData[]
}

/**
 * Analyzes chat messages and generates insights
 */
export function analyzeChat(messages: ChatMessage[]): ChatAnalysis {
  if (messages.length === 0) {
    return getDefaultAnalysis()
  }

  const senders = getSenders(messages)
  if (senders.length === 0) {
    return getDefaultAnalysis()
  }

  // For MVP, assume two-person chat and identify primary sender
  const primarySender = senders[0]
  const otherSender = senders.length > 1 ? senders[1] : primarySender

  const relationshipSummary = analyzeRelationship(messages, primarySender, otherSender)
  const conversationStyle = analyzeConversationStyle(messages, primarySender, otherSender)
  const energyPeaks = analyzeEnergyPeaks(messages)
  const moodPattern = analyzeMoodPatterns(messages, primarySender, otherSender)
  const conversationInitiators = analyzeConversationInitiators(messages, primarySender, otherSender)
  const sentimentAnalysis = analyzeSentiment(messages)
  const turningPoints = detectTurningPoints(messages, primarySender, otherSender)
  const personaInsights = analyzePersona(messages, primarySender, otherSender, moodPattern, sentimentAnalysis)
  const guidedAdvice = generateGuidedAdvice(moodPattern, sentimentAnalysis, turningPoints, personaInsights)
  const activeHoursData = calculateActiveHours(messages) // Keep for potential future use

  return {
    relationshipSummary,
    conversationStyle,
    energyPeaks,
    moodPattern,
    conversationInitiators,
    sentimentAnalysis,
    turningPoints,
    personaInsights,
    guidedAdvice,
    activeHoursData,
  }
}

/**
 * Analyzes relationship strength and balance
 */
function analyzeRelationship(
  messages: ChatMessage[],
  sender1: string,
  sender2: string
): RelationshipSummary {
  if (messages.length === 0) {
    return {
      strength: 0,
      balance: 50,
      description: 'No messages to analyze.',
    }
  }

  const sender1Messages = messages.filter((m) => m.sender === sender1).length
  const sender2Messages = messages.filter((m) => m.sender === sender2).length
  const totalMessages = sender1Messages + sender2Messages

  // Calculate balance (0-100, 50 = perfectly balanced)
  const sender1Percentage = totalMessages > 0 ? (sender1Messages / totalMessages) * 100 : 50
  const balance = Math.abs(50 - sender1Percentage) * 2 // Convert to 0-100 scale where 0 = perfectly balanced
  const normalizedBalance = 100 - balance // Invert so higher = more balanced

  // Calculate strength based on message frequency and consistency
  const daysActive = getUniqueDays(messages).length
  const avgMessagesPerDay = messages.length / Math.max(daysActive, 1)

  // Strength factors:
  // - Message count (0-40 points): more messages = stronger
  // - Consistency (0-30 points): more days active = stronger
  // - Balance (0-30 points): more balanced = stronger
  const messageScore = Math.min(40, (messages.length / 1000) * 40)
  const consistencyScore = Math.min(30, (daysActive / 30) * 30)
  const balanceScore = (normalizedBalance / 100) * 30

  const strength = Math.min(100, Math.round(messageScore + consistencyScore + balanceScore))

  // Generate description
  let description = ''
  if (strength >= 80) {
    description = `You share a very strong connection with ${sender2 === sender1 ? 'this person' : sender2}, with active, balanced communication.`
  } else if (strength >= 60) {
    description = `You have a solid relationship with ${sender2 === sender1 ? 'this person' : sender2}, with regular interaction.`
  } else if (strength >= 40) {
    description = `You maintain a moderate connection with ${sender2 === sender1 ? 'this person' : sender2}.`
  } else {
    description = `You have a casual connection with ${sender2 === sender1 ? 'this person' : sender2}.`
  }

  if (normalizedBalance >= 70) {
    description += ' Communication is well-balanced.'
  } else if (normalizedBalance >= 50) {
    description += ' Communication shows moderate balance.'
  } else {
    description += ' Communication patterns show some imbalance.'
  }

  return {
    strength,
    balance: normalizedBalance,
    description,
  }
}

/**
 * Analyzes conversation style and reply speed
 */
function analyzeConversationStyle(
  messages: ChatMessage[],
  sender1: string,
  sender2: string
): ConversationStyle {
  if (messages.length < 2) {
    return {
      avgReplyTime: 0,
      quickReplyRate: 0,
      description: 'Not enough messages to analyze conversation style.',
    }
  }

  // Calculate reply times (time between messages from different senders)
  const replyTimes: number[] = [] // in minutes

  for (let i = 1; i < messages.length; i++) {
    const prevMsg = messages[i - 1]
    const currMsg = messages[i]

    // Only count if different senders (actual reply)
    if (prevMsg.sender !== currMsg.sender) {
      const timeDiff = currMsg.timestamp.getTime() - prevMsg.timestamp.getTime()
      const minutes = timeDiff / (1000 * 60)

      // Only count reasonable reply times (less than 24 hours)
      if (minutes > 0 && minutes < 24 * 60) {
        replyTimes.push(minutes)
      }
    }
  }

  if (replyTimes.length === 0) {
    return {
      avgReplyTime: 0,
      quickReplyRate: 0,
      description: 'No reply patterns detected.',
    }
  }

  // Calculate average reply time
  const avgReplyTime = replyTimes.reduce((sum, time) => sum + time, 0) / replyTimes.length

  // Calculate quick reply rate (replies under 5 minutes)
  const quickReplies = replyTimes.filter((time) => time < 5).length
  const quickReplyRate = (quickReplies / replyTimes.length) * 100

  // Generate description
  let description = ''
  if (avgReplyTime < 5) {
    description = `Your chats are very quick and responsive, with an average reply time of ${Math.round(avgReplyTime)} minutes.`
  } else if (avgReplyTime < 30) {
    description = `Your chats are typically quick and responsive, with an average reply time of ${Math.round(avgReplyTime)} minutes.`
  } else if (avgReplyTime < 120) {
    description = `Your chats show moderate response times, averaging ${Math.round(avgReplyTime)} minutes to reply.`
  } else {
    description = `Your chats have slower response patterns, with an average reply time of ${Math.round(avgReplyTime / 60)} hours.`
  }

  if (quickReplyRate >= 50) {
    description += ' You often reply within 5 minutes.'
  } else if (quickReplyRate >= 30) {
    description += ' You sometimes reply quickly.'
  }

  return {
    avgReplyTime: Math.round(avgReplyTime),
    quickReplyRate: Math.round(quickReplyRate),
    description,
  }
}

/**
 * Analyzes energy peaks (most active times)
 */
function analyzeEnergyPeaks(messages: ChatMessage[]): EnergyPeaks {
  if (messages.length === 0) {
    return {
      peakHour: 12,
      peakDay: 'Monday',
      description: 'No activity data available.',
    }
  }

  // Count messages by hour
  const hourCounts = new Array(24).fill(0)
  messages.forEach((msg) => {
    const hour = msg.timestamp.getHours()
    hourCounts[hour]++
  })

  // Find peak hour
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

  // Count messages by day of week
  const dayCounts = new Map<string, number>()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  messages.forEach((msg) => {
    const dayName = dayNames[msg.timestamp.getDay()]
    dayCounts.set(dayName, (dayCounts.get(dayName) || 0) + 1)
  })

  // Find peak day
  let peakDay = 'Monday'
  let maxDayCount = 0
  dayCounts.forEach((count, day) => {
    if (count > maxDayCount) {
      maxDayCount = count
      peakDay = day
    }
  })

  // Generate description
  const hour12 = peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour
  const period = peakHour >= 12 ? 'PM' : 'AM'

  let description = ''
  if (peakHour >= 6 && peakHour < 12) {
    description = `You're most active in the mornings, especially around ${hour12} ${period}.`
  } else if (peakHour >= 12 && peakHour < 17) {
    description = `You're most active in the afternoons, especially around ${hour12} ${period}.`
  } else if (peakHour >= 17 && peakHour < 21) {
    description = `You're most active in the evenings, especially around ${hour12} ${period}.`
  } else {
    description = `You're most active during ${peakHour >= 21 ? 'late evening' : 'night'}, especially around ${hour12} ${period}.`
  }

  description += ` Your most active day is ${peakDay}.`

  return {
    peakHour,
    peakDay,
    description,
  }
}

/**
 * Analyzes mood/cycle patterns based on message frequency and emotional intensity
 * Detects menstrual cycle phases and provides actionable advice
 */
function analyzeMoodPatterns(
  messages: ChatMessage[],
  sender1: string,
  sender2: string
): MoodPattern {
  if (messages.length < 10) {
    return {
      hasCycle: false,
      cycleLength: 0,
      phases: [],
      description: 'Not enough data to detect mood patterns.',
      moodScores: [],
      currentPhase: {
        phase: 'Unknown',
        confidence: 0,
        advice: 'Need more data to predict cycle phase.',
      },
    }
  }

  // Group messages by day and calculate daily mood scores
  const dailyMessages = new Map<string, ChatMessage[]>()
  const moodScores: { date: string; score: number; phase?: string }[] = []

  messages.forEach((msg) => {
    const dateKey = formatDateKey(msg.timestamp)
    if (!dailyMessages.has(dateKey)) {
      dailyMessages.set(dateKey, [])
    }
    dailyMessages.get(dateKey)!.push(msg)
  })

  // Calculate daily mood scores based on message frequency, length, and sentiment
  dailyMessages.forEach((msgs, dateKey) => {
    const messageCount = msgs.length
    const avgLength = msgs.reduce((sum, m) => sum + m.content.length, 0) / msgs.length
    const sentiment = calculateSimpleSentiment(msgs.map(m => m.content).join(' '))

    // Combine factors: more messages + longer messages + positive sentiment = higher mood score
    const score = Math.min(100, (messageCount * 2 + avgLength / 10 + (sentiment + 1) * 50))
    moodScores.push({ date: dateKey, score })
  })

  moodScores.sort((a, b) => a.date.localeCompare(b.date))

  // Detect cycle phases (28-day menstrual cycle pattern)
  let hasCycle = false
  let cycleLength = 28
  const phases: string[] = []
  let currentPhase: CyclePhase = {
    phase: 'Unknown',
    confidence: 0,
    advice: 'Unable to detect cycle pattern.',
  }

  if (moodScores.length >= 14) {
    // Analyze pattern for 28-day cycle (most common)
    const monthlyVariance = calculateCycleVariance(moodScores, 28)

    if (monthlyVariance < 0.4 && moodScores.length >= 28) {
      hasCycle = true
      phases.push('Follicular', 'Ovulation', 'Luteal', 'PMS')

      // Predict current phase based on recent mood scores
      const recentScores = moodScores.slice(-7)
      const avgRecentScore = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length
      const recentSentiment = calculateSimpleSentiment(
        recentScores.map((s) => {
          const dateMsgs = dailyMessages.get(s.date) || []
          return dateMsgs.map(m => m.content).join(' ')
        }).join(' ')
      )

      // Phase detection logic based on mood patterns
      let predictedPhase: 'PMS' | 'Ovulation' | 'Follicular' | 'Luteal' = 'Follicular'
      let confidence = 60
      let advice = ''

      if (avgRecentScore < 40 && recentSentiment < -0.2) {
        // Low mood + negative sentiment = PMS
        predictedPhase = 'PMS'
        confidence = 75
        advice = 'Low mood detected. Best to avoid tough conversations and practice self-care. Great time for patience and gentle communication.'
      } else if (avgRecentScore > 60 && recentSentiment > 0.3) {
        // High mood + positive sentiment = Ovulation
        predictedPhase = 'Ovulation'
        confidence = 70
        advice = 'High energy phase detected. Great time for fun plans and positive conversations!'
      } else if (avgRecentScore > 50 && recentSentiment > 0) {
        // Moderate-high mood + positive = Follicular
        predictedPhase = 'Follicular'
        confidence = 65
        advice = 'Stable mood phase. Good time for balanced conversations and planning.'
      } else {
        // Moderate mood = Luteal
        predictedPhase = 'Luteal'
        confidence = 60
        advice = 'Moderate energy phase. Good time for routine conversations and maintaining connection.'
      }

      currentPhase = {
        phase: predictedPhase,
        confidence,
        advice,
        currentPhase: predictedPhase,
      }

      // Add phase labels to mood scores
      moodScores.forEach((score, idx) => {
        const dayInCycle = idx % 28
        if (dayInCycle < 7) score.phase = 'Follicular'
        else if (dayInCycle < 14) score.phase = 'Ovulation'
        else if (dayInCycle < 21) score.phase = 'Luteal'
        else score.phase = 'PMS'
      })
    } else {
      // Less clear pattern, but still try to detect
      hasCycle = false
      const avgScore = moodScores.reduce((sum, s) => sum + s.score, 0) / moodScores.length
      const avgSentiment = calculateSimpleSentiment(
        messages.map(m => m.content).join(' ')
      )

      if (avgScore < 45 && avgSentiment < -0.1) {
        currentPhase = {
          phase: 'PMS',
          confidence: 50,
          advice: 'Low mood patterns detected. Practice patience and avoid difficult conversations.',
        }
      } else if (avgScore > 55 && avgSentiment > 0.2) {
        currentPhase = {
          phase: 'Ovulation',
          confidence: 50,
          advice: 'High energy patterns detected. Great time for positive activities!',
        }
      }
    }
  }

  let description = ''
  if (hasCycle && currentPhase.phase !== 'Unknown') {
    description = `Detected a ${cycleLength}-day cycle pattern. Currently in ${currentPhase.phase} phase (${currentPhase.confidence}% confidence).`
  } else {
    description = currentPhase.advice || 'Your conversation patterns are more irregular, without a clear cyclical pattern.'
  }

  return {
    hasCycle,
    cycleLength,
    phases,
    description,
    moodScores,
    currentPhase,
  }
}

/**
 * Analyzes who initiates conversations
 */
function analyzeConversationInitiators(
  messages: ChatMessage[],
  sender1: string,
  sender2: string
): ConversationInitiators {
  if (messages.length < 2) {
    return {
      sender1Starts: 0,
      sender2Starts: 0,
      sender1Percentage: 50,
      description: 'Not enough data to analyze conversation initiators.',
    }
  }

  // Group messages by day
  const dailyMessages = new Map<string, ChatMessage[]>()
  messages.forEach((msg) => {
    const dateKey = formatDateKey(msg.timestamp)
    if (!dailyMessages.has(dateKey)) {
      dailyMessages.set(dateKey, [])
    }
    dailyMessages.get(dateKey)!.push(msg)
  })

  // Count who starts each day's conversation
  let sender1Starts = 0
  let sender2Starts = 0

  dailyMessages.forEach((msgs) => {
    if (msgs.length > 0) {
      const firstSender = msgs[0].sender
      if (firstSender === sender1) {
        sender1Starts++
      } else if (firstSender === sender2) {
        sender2Starts++
      }
    }
  })

  const totalDays = sender1Starts + sender2Starts
  const sender1Percentage = totalDays > 0 ? (sender1Starts / totalDays) * 100 : 50

  let description = ''
  if (sender1Percentage >= 70) {
    description = `You initiate ${Math.round(sender1Percentage)}% of conversations. You're the conversation starter!`
  } else if (sender1Percentage >= 50) {
    description = `You initiate ${Math.round(sender1Percentage)}% of conversations. You often start the chat.`
  } else if (sender1Percentage >= 30) {
    description = `You initiate ${Math.round(sender1Percentage)}% of conversations. Conversations are fairly balanced.`
  } else {
    description = `You initiate ${Math.round(sender1Percentage)}% of conversations. The other person often starts conversations.`
  }

  return {
    sender1Starts,
    sender2Starts,
    sender1Percentage: Math.round(sender1Percentage),
    description,
  }
}

/**
 * Analyzes sentiment over time with phase-aware insights
 */
function analyzeSentiment(messages: ChatMessage[]): SentimentAnalysis {
  if (messages.length === 0) {
    return {
      averageSentiment: 0,
      weeklyTrend: [],
      dailyScores: [],
      description: 'No messages to analyze sentiment.',
      phaseCorrelation: [],
      actionableInsight: 'Need more data to provide insights.',
    }
  }

  // Calculate daily sentiment scores
  const dailyMessages = new Map<string, ChatMessage[]>()
  messages.forEach((msg) => {
    const dateKey = formatDateKey(msg.timestamp)
    if (!dailyMessages.has(dateKey)) {
      dailyMessages.set(dateKey, [])
    }
    dailyMessages.get(dateKey)!.push(msg)
  })

  const dailyScores: { date: string; sentiment: number; phase?: string }[] = []
  let totalSentiment = 0

  dailyMessages.forEach((msgs, dateKey) => {
    const combinedText = msgs.map(m => m.content).join(' ')
    const sentiment = calculateSimpleSentiment(combinedText)

    // Determine phase for this date (simple 28-day cycle estimation)
    const date = new Date(dateKey)
    const daysSinceStart = Math.floor((date.getTime() - messages[0].timestamp.getTime()) / (1000 * 60 * 60 * 24))
    const dayInCycle = daysSinceStart % 28
    let phase = 'Follicular'
    if (dayInCycle < 7) phase = 'Follicular'
    else if (dayInCycle < 14) phase = 'Ovulation'
    else if (dayInCycle < 21) phase = 'Luteal'
    else phase = 'PMS'

    dailyScores.push({ date: dateKey, sentiment, phase })
    totalSentiment += sentiment
  })

  dailyScores.sort((a, b) => a.date.localeCompare(b.date))
  const averageSentiment = totalSentiment / dailyScores.length

  // Calculate phase correlations
  const phaseGroups = new Map<string, number[]>()
  dailyScores.forEach(({ phase, sentiment }) => {
    if (phase) {
      if (!phaseGroups.has(phase)) {
        phaseGroups.set(phase, [])
      }
      phaseGroups.get(phase)!.push(sentiment)
    }
  })

  const phaseCorrelation: { phase: string; avgSentiment: number }[] = []
  phaseGroups.forEach((scores, phase) => {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
    phaseCorrelation.push({ phase, avgSentiment: avg })
  })

  // Calculate weekly trends
  const weeklyTrend: { week: string; sentiment: number }[] = []
  const weekGroups = new Map<string, number[]>()

  dailyScores.forEach(({ date, sentiment }) => {
    const weekKey = getWeekKey(date)
    if (!weekGroups.has(weekKey)) {
      weekGroups.set(weekKey, [])
    }
    weekGroups.get(weekKey)!.push(sentiment)
  })

  weekGroups.forEach((scores, weekKey) => {
    const avgSentiment = scores.reduce((sum, s) => sum + s, 0) / scores.length
    weeklyTrend.push({ week: weekKey, sentiment: avgSentiment })
  })

  weeklyTrend.sort((a, b) => a.week.localeCompare(b.week))

  // Generate actionable insights
  const recentScores = dailyScores.slice(-7)
  const avgRecentSentiment = recentScores.reduce((sum, s) => sum + s.sentiment, 0) / recentScores.length
  const recentTrend = weeklyTrend.length >= 2
    ? weeklyTrend[weeklyTrend.length - 1].sentiment - weeklyTrend[weeklyTrend.length - 2].sentiment
    : 0

  let actionableInsight = ''
  if (avgRecentSentiment < -0.3) {
    actionableInsight = 'Low mood week detected. Practice patience, avoid difficult conversations, and focus on self-care. This phase will pass.'
  } else if (avgRecentSentiment < -0.1) {
    actionableInsight = 'Moderate-low mood detected. Be gentle with yourself and others. Good time for supportive communication.'
  } else if (avgRecentSentiment > 0.3) {
    actionableInsight = 'High positive energy! Great time for fun plans, deep conversations, and making positive memories.'
  } else if (avgRecentSentiment > 0.1) {
    actionableInsight = 'Stable positive mood. Good time for routine conversations and maintaining connection.'
  } else {
    actionableInsight = 'Neutral mood patterns. Good time for balanced, everyday communication.'
  }

  // Add trend-based advice
  if (recentTrend > 0.3) {
    actionableInsight += ' Mood is trending upward—great time to engage in positive activities!'
  } else if (recentTrend < -0.3) {
    actionableInsight += ' Mood is trending downward—prioritize self-care and avoid stress.'
  }

  let description = ''
  if (averageSentiment > 0.3) {
    description = `Your conversations are generally positive (avg ${averageSentiment.toFixed(2)}).`
  } else if (averageSentiment > 0) {
    description = `Your conversations are mostly neutral to positive (avg ${averageSentiment.toFixed(2)}).`
  } else if (averageSentiment > -0.3) {
    description = `Your conversations are mostly neutral (avg ${averageSentiment.toFixed(2)}).`
  } else {
    description = `Your conversations show more negative sentiment (avg ${averageSentiment.toFixed(2)}).`
  }

  // Check trend
  if (weeklyTrend.length >= 2) {
    const overallTrend = weeklyTrend[weeklyTrend.length - 1].sentiment - weeklyTrend[0].sentiment
    if (overallTrend > 0.2) {
      description += ' Trend: Recent conversations have been more positive.'
    } else if (overallTrend < -0.2) {
      description += ' Trend: Recent conversations have been less positive.'
    }
  }

  return {
    averageSentiment,
    weeklyTrend,
    dailyScores,
    description,
    phaseCorrelation,
    actionableInsight,
  }
}

/**
 * Detects turning points focusing on emotional events, conflicts, and tone changes
 * Enhanced to detect specific event types: reconnection, big talk, argument, resolved
 */
function detectTurningPoints(messages: ChatMessage[], sender1: string, sender2: string): TurningPoint[] {
  if (messages.length < 5) {
    return []
  }

  const turningPoints: TurningPoint[] = []
  const dailyMessages = new Map<string, ChatMessage[]>()
  const dailySentiment = new Map<string, number>()
  const dailyEmotionalIntensity = new Map<string, number>()

  // Group messages by day
  messages.forEach((msg) => {
    const dateKey = formatDateKey(msg.timestamp)
    if (!dailyMessages.has(dateKey)) {
      dailyMessages.set(dateKey, [])
    }
    dailyMessages.get(dateKey)!.push(msg)
  })

  // Calculate daily sentiment and emotional intensity
  dailyMessages.forEach((msgs, dateKey) => {
    const combinedText = msgs.map(m => m.content).join(' ')
    const sentiment = calculateSimpleSentiment(combinedText)
    dailySentiment.set(dateKey, sentiment)

    // Calculate emotional intensity based on sentiment strength and message patterns
    const sentimentStrength = Math.abs(sentiment)
    const messageCount = msgs.length
    const avgLength = msgs.reduce((sum, m) => sum + m.content.length, 0) / msgs.length
    const intensity = Math.min(100, (sentimentStrength * 50) + (messageCount / 10) + (avgLength / 20))
    dailyEmotionalIntensity.set(dateKey, intensity)
  })

  const sortedDates = Array.from(dailyMessages.keys()).sort()
  const avgSentiment = Array.from(dailySentiment.values()).reduce((sum, s) => sum + s, 0) / dailySentiment.size

  // Detect emotional events (spikes, conflicts, tone changes)
  sortedDates.forEach((date, index) => {
    const sentiment = dailySentiment.get(date) || 0
    const intensity = dailyEmotionalIntensity.get(date) || 0
    const msgs = dailyMessages.get(date) || []
    const messageCount = msgs.length

    // Detect conflicts/arguments (high negative sentiment + high message count)
    if (sentiment < -0.4 && messageCount > 10) {
      const conflictWords = ['sorry', 'upset', 'angry', 'mad', 'hate', 'wrong', 'problem', 'issue', 'fight', 'frustrated', 'disappointed']
      const resolutionWords = ['sorry', 'understand', 'agree', 'thanks', 'love', 'appreciate']

      const hasConflictIndicators = msgs.some(m =>
        conflictWords.some(word => m.content.toLowerCase().includes(word))
      )

      const hasResolutionIndicators = msgs.some(m =>
        resolutionWords.some(word => m.content.toLowerCase().includes(word))
      )

      if (hasConflictIndicators) {
        // Check if resolved later in the conversation
        let isResolved = false
        if (index < sortedDates.length - 1) {
          const nextDate = sortedDates[index + 1]
          const nextSentiment = dailySentiment.get(nextDate) || 0
          const nextMsgs = dailyMessages.get(nextDate) || []
          const hasNextResolution = nextMsgs.some(m =>
            resolutionWords.some(word => m.content.toLowerCase().includes(word))
          )
          if (nextSentiment > 0.2 || hasNextResolution) {
            isResolved = true
          }
        }

        turningPoints.push({
          date,
          type: isResolved ? 'resolved' : 'argument',
          description: isResolved
            ? 'Argument or disagreement detected, followed by resolution.'
            : 'Argument or disagreement detected.',
          significance: Math.min(100, Math.round((Math.abs(sentiment) * 80) + (intensity / 2))),
          emotionalIntensity: Math.round(intensity),
          context: `${messageCount} messages with strongly negative sentiment.`,
          phase: detectPhaseForDate(date, messages[0]?.timestamp),
          eventType: isResolved ? 'conflict resolved' : 'argument',
        })
      }
    }

    // Detect reconnection (gap followed by positive engagement)
    if (index > 0 && sentiment > 0.3 && messageCount > 15) {
      const prevDate = sortedDates[index - 1]
      const prevCount = (dailyMessages.get(prevDate) || []).length
      if (prevCount < 5) {
        turningPoints.push({
          date,
          type: 'reconnection',
          description: 'Significant reconnection after a quieter period.',
          significance: 70,
          emotionalIntensity: Math.round(intensity),
          context: `${messageCount} messages with positive sentiment after low activity.`,
          phase: detectPhaseForDate(date, messages[0]?.timestamp),
          eventType: 'reconnection',
        })
      }
    }

    // Detect "big talk" (long messages + high emotional intensity)
    const avgMsgLength = msgs.reduce((sum, m) => sum + m.content.length, 0) / msgs.length
    if (avgMsgLength > 150 && intensity > 50 && messageCount > 5) {
      const deepTalkWords = ['feel', 'think', 'want', 'need', 'understand', 'important', 'relationship', 'future', 'together']
      const hasDeepTalk = msgs.some(m =>
        deepTalkWords.some(word => m.content.toLowerCase().includes(word))
      )

      if (hasDeepTalk) {
        turningPoints.push({
          date,
          type: 'intense_conversation',
          description: 'Deep, meaningful conversation detected.',
          significance: 65,
          emotionalIntensity: Math.round(intensity),
          context: `Long, thoughtful messages with high emotional engagement.`,
          phase: detectPhaseForDate(date, messages[0]?.timestamp),
          eventType: 'big talk',
        })
      }
    }

    // Detect emotional spikes (high positive sentiment + high intensity)
    if (sentiment > avgSentiment + 0.5 && intensity > 60) {
      turningPoints.push({
        date,
        type: 'emotional_spike',
        description: 'Notable positive emotional peak detected.',
        significance: Math.min(100, Math.round((sentiment * 100) + (intensity / 3))),
        emotionalIntensity: Math.round(intensity),
        context: `High positive energy with ${messageCount} messages.`,
        phase: detectPhaseForDate(date, messages[0]?.timestamp),
      })
    }

    // Detect tone changes (significant shift from previous day)
    if (index > 0) {
      const prevDate = sortedDates[index - 1]
      const prevSentiment = dailySentiment.get(prevDate) || 0
      const sentimentChange = sentiment - prevSentiment

      if (Math.abs(sentimentChange) > 0.6) {
        turningPoints.push({
          date,
          type: 'tone_change',
          description: sentimentChange > 0
            ? 'Significant shift toward more positive tone.'
            : 'Significant shift toward more negative tone.',
          significance: Math.min(100, Math.round(Math.abs(sentimentChange) * 70)),
          emotionalIntensity: Math.round(intensity),
          context: `Sentiment changed by ${(sentimentChange * 100).toFixed(0)}% from previous day.`,
          phase: detectPhaseForDate(date, messages[0]?.timestamp),
        })
      }
    }

    // Detect intense conversations (high message count + high intensity)
    if (messageCount > 20 && intensity > 50) {
      turningPoints.push({
        date,
        type: 'intense_conversation',
        description: `Intense conversation day with ${messageCount} messages.`,
        significance: Math.min(100, Math.round((messageCount / 2) + (intensity / 3))),
        emotionalIntensity: Math.round(intensity),
        context: `High engagement and emotional intensity.`,
        phase: detectPhaseForDate(date, messages[0]?.timestamp),
      })
    }

    // Detect low energy days (very low sentiment + low activity)
    if (sentiment < -0.3 && messageCount < 5) {
      turningPoints.push({
        date,
        type: 'low_energy',
        description: 'Low energy day with minimal conversation.',
        significance: 50,
        emotionalIntensity: Math.round(intensity),
        context: 'Withdrawn communication patterns.',
        phase: detectPhaseForDate(date, messages[0]?.timestamp),
      })
    }
  })

  // Detect significant gaps (more than 3 days)
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1])
    const currDate = new Date(sortedDates[i])
    const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 3) {
      turningPoints.push({
        date: sortedDates[i],
        type: 'gap',
        description: `Communication gap of ${Math.round(daysDiff)} days.`,
        significance: Math.min(100, Math.round(daysDiff * 8)),
        emotionalIntensity: 20,
        context: `No messages for ${Math.round(daysDiff)} days.`,
        phase: detectPhaseForDate(sortedDates[i], messages[0]?.timestamp),
      })
    }
  }

  // Sort by significance and limit to top 8
  return turningPoints
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 8)
}

/**
 * Analyzes persona/relationship type based on conversation patterns
 */
function analyzePersona(
  messages: ChatMessage[],
  sender1: string,
  sender2: string,
  moodPattern: MoodPattern,
  sentimentAnalysis: SentimentAnalysis
): PersonaInsight[] {
  if (messages.length < 10) {
    return [{
      persona: 'unknown',
      advice: 'Need more data to analyze relationship type.',
      confidence: 0,
      context: 'Insufficient data.',
    }]
  }

  const insights: PersonaInsight[] = []
  const allText = messages.map(m => m.content.toLowerCase()).join(' ')

  // Romantic indicators
  const romanticWords = ['love', 'miss', 'baby', 'honey', 'darling', 'sweetheart', 'together', 'forever', 'heart', 'kiss', 'romantic', 'date', 'relationship', 'boyfriend', 'girlfriend', 'partner', 'spouse']
  const romanticCount = romanticWords.filter(word => allText.includes(word)).length

  // Boss/work indicators
  const workWords = ['meeting', 'project', 'deadline', 'work', 'boss', 'manager', 'task', 'report', 'office', 'client', 'business', 'professional', 'team', 'schedule']
  const workCount = workWords.filter(word => allText.includes(word)).length

  // Family indicators
  const familyWords = ['mom', 'dad', 'mother', 'father', 'sister', 'brother', 'family', 'home', 'visit', 'together', 'grandma', 'grandpa', 'parent', 'child', 'kids']
  const familyCount = familyWords.filter(word => allText.includes(word)).length

  // Friend indicators
  const friendWords = ['friend', 'hang', 'party', 'fun', 'weekend', 'plans', 'catch up', 'best friend']
  const friendCount = friendWords.filter(word => allText.includes(word)).length

  const currentPhase = moodPattern.currentPhase.phase
  const currentSentiment = sentimentAnalysis.averageSentiment
  const recentInsight = sentimentAnalysis.actionableInsight

  // Determine primary persona
  let primaryPersona: 'romantic' | 'boss' | 'family' | 'friend' | 'unknown' = 'unknown'
  let confidence = 0

  if (romanticCount >= 3 || romanticCount > workCount && romanticCount > familyCount) {
    primaryPersona = 'romantic'
    confidence = Math.min(100, 50 + (romanticCount * 10))

    // Romantic advice based on phase and mood
    let advice = ''
    if (currentPhase === 'Ovulation' && currentSentiment > 0.2) {
      advice = 'High energy phase detected. Good week for intimacy, fun dates, or deepening connection. Perfect timing for romantic gestures or making exciting plans together.'
    } else if (currentPhase === 'PMS' && currentSentiment < -0.1) {
      advice = 'Low mood phase detected. Best to avoid serious conversations about the relationship. Focus on gentle support, patience, and understanding. Small gestures matter most now.'
    } else if (currentSentiment > 0.3) {
      advice = 'Positive energy detected. Great time for quality time together, sharing appreciation, or making plans for the future.'
    } else if (currentSentiment < -0.2) {
      advice = 'Tense period detected. Prioritize open communication, active listening, and avoiding blame. Consider giving space if needed.'
    } else {
      advice = 'Stable mood phase. Good time for routine connection and maintaining your bond. Small daily interactions help sustain intimacy.'
    }

    insights.push({
      persona: 'romantic',
      advice,
      confidence,
      context: `Based on ${romanticCount} romantic indicators and current ${currentPhase} phase.`,
    })
  }

  if (workCount >= 3 || workCount > romanticCount && workCount > familyCount) {
    primaryPersona = 'boss'
    confidence = Math.min(100, 50 + (workCount * 10))

    // Boss/work advice based on mood
    let advice = ''
    if (currentSentiment > 0.3 && currentPhase !== 'PMS') {
      advice = "Today's mood is receptive and positive. Now is a good time to make requests, propose new ideas, or discuss important matters. The person is likely to be open and responsive."
    } else if (currentSentiment < -0.2 || currentPhase === 'PMS') {
      advice = 'Stress or low mood detected. Hold off on big asks or difficult conversations for a day or two. Wait for a more receptive moment when energy is higher.'
    } else if (currentSentiment > 0.1) {
      advice = 'Moderate positive mood. Good time for routine work communication and standard requests. Avoid major asks, but normal business can proceed.'
    } else {
      advice = 'Neutral mood detected. Safe time for standard professional communication. Keep messages clear and concise.'
    }

    insights.push({
      persona: 'boss',
      advice,
      confidence,
      context: `Based on ${workCount} work-related indicators and current sentiment patterns.`,
    })
  }

  if (familyCount >= 3 || familyCount > romanticCount && familyCount > workCount) {
    primaryPersona = 'family'
    confidence = Math.min(100, 50 + (familyCount * 10))

    // Family advice
    let advice = ''
    if (currentSentiment > 0.2) {
      advice = 'Conversation tone is warm and nurturing. Reach out for support, share good news, or make plans to visit. Family connection is strong right now.'
    } else if (currentSentiment < -0.2) {
      advice = 'Tense or difficult period detected. Offer support without pressure. Sometimes just checking in quietly shows you care. Avoid demanding responses.'
    } else {
      advice = 'Stable family communication. Good time for regular check-ins and maintaining connection. Small messages help sustain family bonds.'
    }

    insights.push({
      persona: 'family',
      advice,
      confidence,
      context: `Based on ${familyCount} family indicators and current mood patterns.`,
    })
  }

  if (friendCount >= 2 && primaryPersona === 'unknown') {
    primaryPersona = 'friend'
    confidence = 60

    insights.push({
      persona: 'friend',
      advice: currentSentiment > 0.2
        ? 'Positive energy with your friend. Great time for fun plans, sharing updates, or catching up!'
        : 'Friendship connection is stable. Good time for casual check-ins or making plans together.',
      confidence,
      context: `Based on ${friendCount} friend indicators.`,
    })
  }

  return insights.length > 0 ? insights : [{
    persona: 'unknown',
    advice: 'Unable to determine relationship type. Generic advice: Match your communication to the other person\'s current mood and energy level.',
    confidence: 0,
    context: 'Insufficient indicators found.',
  }]
}

/**
 * Generates guided, actionable advice cards based on phase, mood, and persona
 */
function generateGuidedAdvice(
  moodPattern: MoodPattern,
  sentimentAnalysis: SentimentAnalysis,
  turningPoints: TurningPoint[],
  personaInsights: PersonaInsight[]
): GuidedAdvice[] {
  const advice: GuidedAdvice[] = []
  const currentPhase = moodPattern.currentPhase
  const currentSentiment = sentimentAnalysis.averageSentiment
  const recentTrend = sentimentAnalysis.weeklyTrend.length >= 2
    ? sentimentAnalysis.weeklyTrend[sentimentAnalysis.weeklyTrend.length - 1].sentiment
      - sentimentAnalysis.weeklyTrend[sentimentAnalysis.weeklyTrend.length - 2].sentiment
    : 0

  // Phase-based advice
  if (currentPhase.phase !== 'Unknown') {
    if (currentPhase.phase === 'Ovulation' && currentSentiment > 0.2) {
      advice.push({
        title: 'Optimal Timing for Positive Interactions',
        advice: 'Try proposing plans or ideas now—her mood pattern is optimal for receptivity and engagement.',
        timing: 'now',
        phase: 'Ovulation',
        mood: 'positive',
        reasoning: `Current phase is ${currentPhase.phase} with ${(currentSentiment * 100).toFixed(0)}% positive sentiment. Energy and receptivity are high.`,
      })
    }

    if (currentPhase.phase === 'PMS' && currentSentiment < -0.1) {
      advice.push({
        title: 'Practice Patience & Avoid Big Asks',
        advice: 'Low mood phase detected. Hold off on difficult conversations or major requests. Focus on gentle support instead.',
        timing: 'wait',
        phase: 'PMS',
        mood: 'low',
        reasoning: `PMS phase with ${(currentSentiment * 100).toFixed(0)}% sentiment. Best to wait for more receptive phase.`,
      })
    }
  }

  // Sentiment-based advice
  if (currentSentiment < -0.3) {
    advice.push({
      title: 'Support Mode Activated',
      advice: 'Significant stress or low mood detected. Offer emotional support, avoid making demands, and practice active listening.',
      timing: 'now',
      mood: 'low',
      reasoning: `Very negative sentiment (${(currentSentiment * 100).toFixed(0)}%) indicates need for support rather than requests.`,
    })
  }

  if (currentSentiment > 0.4 && recentTrend > 0.2) {
    advice.push({
      title: 'Seize the Momentum',
      advice: 'Positive trend detected. Great time to propose fun plans, share good news, or make exciting requests.',
      timing: 'now',
      mood: 'high',
      reasoning: `High positive sentiment (${(currentSentiment * 100).toFixed(0)}%) with upward trend. Energy is building.`,
    })
  }

  // Persona-specific advice
  const romanticInsight = personaInsights.find(p => p.persona === 'romantic')
  if (romanticInsight && currentPhase.phase === 'Ovulation' && currentSentiment > 0.2) {
    advice.push({
      title: 'Romance Timing Alert',
      advice: 'Try proposing this weekend—her mood pattern is optimal for romance, connection, and positive experiences.',
      timing: 'soon',
      phase: 'Ovulation',
      mood: 'positive',
      reasoning: 'Romantic relationship detected in high-energy, positive phase. Optimal timing for intimate activities or special dates.',
    })
  }

  const bossInsight = personaInsights.find(p => p.persona === 'boss')
  if (bossInsight && currentSentiment < -0.2) {
    advice.push({
      title: 'Hold Off on Big Requests',
      advice: 'Boss is stressed or in low mood. Hold off on big asks for a day or two. Wait for a more receptive moment.',
      timing: 'wait',
      mood: 'low',
      reasoning: 'Professional relationship detected during stressful period. Requests more likely to be rejected or poorly received.',
    })
  }

  // Recent event-based advice
  const recentConflict = turningPoints.find(tp => tp.type === 'argument' && tp.significance > 70)
  if (recentConflict) {
    advice.push({
      title: 'Post-Conflict Recovery',
      advice: 'Recent argument detected. Give space, then reach out gently. Focus on understanding rather than being understood.',
      timing: 'later',
      reasoning: `Argument detected on ${recentConflict.date} with high emotional intensity. Recovery time needed.`,
    })
  }

  const recentReconnection = turningPoints.find(tp => tp.type === 'reconnection')
  if (recentReconnection) {
    advice.push({
      title: 'Nurture the Reconnection',
      advice: 'Positive reconnection detected. Continue building on this momentum with regular, warm communication.',
      timing: 'now',
      reasoning: `Reconnection event on ${recentReconnection.date}. Good time to strengthen bonds.`,
    })
  }

  return advice.slice(0, 5) // Limit to top 5 most relevant
}

/**
 * Detects cycle phase for a given date
 */
function detectPhaseForDate(dateStr: string, startDate?: Date): string {
  if (!startDate) return 'Unknown'

  const date = new Date(dateStr)
  const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const dayInCycle = daysSinceStart % 28

  if (dayInCycle < 7) return 'Follicular'
  if (dayInCycle < 14) return 'Ovulation'
  if (dayInCycle < 21) return 'Luteal'
  return 'PMS'
}

/**
 * Analyzes word frequency, filtering out WhatsApp-specific and common words
 */
function analyzeWordFrequency(messages: ChatMessage[]): WordFrequency[] {
  if (messages.length === 0) {
    return []
  }

  const wordCounts = new Map<string, number>()
  const stopWords = new Set([
    // Common English stop words
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
    'am', 'pm', 'lol', 'haha', 'omg', 'wtf',
    // WhatsApp-specific words to filter
    'media', 'omitted', 'image', 'video', 'audio', 'document', 'file', 'attachment',
    'this', 'message', 'was', 'deleted', 'starred', 'forwarded', 'location', 'shared',
    'contact', 'vcard', 'gif', 'sticker', 'status', 'end', 'encrypted'
  ])

  messages.forEach((msg) => {
    // Skip messages that are just system messages
    const content = msg.content.toLowerCase().trim()
    if (content.includes('media omitted') ||
        content.includes('image omitted') ||
        content.includes('this message was deleted') ||
        content.length < 3) {
      return
    }

    const words = msg.content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        // Filter out stop words, very short words, and WhatsApp-specific terms
        return word.length > 2 &&
               !stopWords.has(word) &&
               !word.match(/^\d+$/) && // Filter pure numbers
               !word.match(/^https?:\/\//) // Filter URLs
      })

    words.forEach((word) => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
  })

  return Array.from(wordCounts.entries())
    .map(([word, frequency]) => ({ word, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 15) // Reduced to top 15 meaningful words
}

/**
 * Analyzes message style (length, patterns, etc.)
 */
function analyzeMessageStyle(messages: ChatMessage[]): MessageStyle {
  if (messages.length === 0) {
    return {
      avgLength: 0,
      avgWords: 0,
      shortMessages: 0,
      longMessages: 0,
      silentDays: 0,
      burstDays: 0,
      description: 'No messages to analyze.',
    }
  }

  let totalLength = 0
  let totalWords = 0
  let shortCount = 0
  let longCount = 0

  messages.forEach((msg) => {
    const length = msg.content.length
    const words = msg.content.split(/\s+/).length

    totalLength += length
    totalWords += words

    if (length < 50) shortCount++
    if (length > 200) longCount++
  })

  const avgLength = Math.round(totalLength / messages.length)
  const avgWords = Math.round(totalWords / messages.length)

  // Calculate silent days and burst days
  const dailyCounts = new Map<string, number>()
  messages.forEach((msg) => {
    const dateKey = formatDateKey(msg.timestamp)
    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1)
  })

  const avgPerDay = messages.length / dailyCounts.size
  let silentDays = 0
  let burstDays = 0

  dailyCounts.forEach((count) => {
    if (count === 0) silentDays++
    if (count > avgPerDay * 2) burstDays++
  })

  let description = ''
  if (avgLength < 50) {
    description = `You prefer short, quick messages (avg ${avgLength} chars).`
  } else if (avgLength < 150) {
    description = `Your messages are moderate in length (avg ${avgLength} chars).`
  } else {
    description = `You tend to send longer, detailed messages (avg ${avgLength} chars).`
  }

  description += ` ${shortCount} short messages, ${longCount} long messages.`

  return {
    avgLength,
    avgWords,
    shortMessages: shortCount,
    longMessages: longCount,
    silentDays,
    burstDays,
    description,
  }
}

/**
 * Calculates message volume over time
 */
function calculateVolumeOverTime(messages: ChatMessage[]): VolumeData[] {
  const volumeMap = new Map<string, number>()

  messages.forEach((msg) => {
    const dateKey = formatDateKey(msg.timestamp)
    volumeMap.set(dateKey, (volumeMap.get(dateKey) || 0) + 1)
  })

  return Array.from(volumeMap.entries())
    .map(([date, messages]) => ({ date, messages }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calculates reply time distribution
 */
function calculateReplyTimeDistribution(
  messages: ChatMessage[],
  sender1: string,
  sender2: string
): ReplyTimeData[] {
  const replyTimes: number[] = []

  for (let i = 1; i < messages.length; i++) {
    const prevMsg = messages[i - 1]
    const currMsg = messages[i]

    if (prevMsg.sender !== currMsg.sender) {
      const timeDiff = currMsg.timestamp.getTime() - prevMsg.timestamp.getTime()
      const minutes = timeDiff / (1000 * 60)

      if (minutes > 0 && minutes < 24 * 60) {
        replyTimes.push(minutes)
      }
    }
  }

  const ranges = [
    { label: '0-5 min', min: 0, max: 5 },
    { label: '5-15 min', min: 5, max: 15 },
    { label: '15-30 min', min: 15, max: 30 },
    { label: '30-60 min', min: 30, max: 60 },
    { label: '1-3 hours', min: 60, max: 180 },
    { label: '3-12 hours', min: 180, max: 720 },
    { label: '12+ hours', min: 720, max: Infinity },
  ]

  return ranges.map((range) => ({
    timeRange: range.label,
    count: replyTimes.filter((t) => t >= range.min && t < range.max).length,
  }))
}

/**
 * Calculates active hours heatmap data
 */
function calculateActiveHours(messages: ChatMessage[]): ActiveHoursData[] {
  const hourMap = new Map<string, number>()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  messages.forEach((msg) => {
    const hour = msg.timestamp.getHours()
    const dayOfWeek = dayNames[msg.timestamp.getDay()]
    const key = `${dayOfWeek}-${hour}`
    hourMap.set(key, (hourMap.get(key) || 0) + 1)
  })

  const result: ActiveHoursData[] = []
  dayNames.forEach((day) => {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${day}-${hour}`
      result.push({
        hour,
        dayOfWeek: day,
        messageCount: hourMap.get(key) || 0,
      })
    }
  })

  return result
}

// Helper functions

function getUniqueDays(messages: ChatMessage[]): Date[] {
  const days = new Set<string>()
  messages.forEach((msg) => {
    const dateKey = `${msg.timestamp.getFullYear()}-${msg.timestamp.getMonth()}-${msg.timestamp.getDate()}`
    days.add(dateKey)
  })
  return Array.from(days).map((key) => {
    const [year, month, day] = key.split('-').map(Number)
    return new Date(year, month, day)
  })
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekKey(dateKey: string): string {
  const date = new Date(dateKey)
  const year = date.getFullYear()
  const week = Math.ceil(date.getDate() / 7)
  return `${year}-W${week}`
}

function calculateSimpleSentiment(text: string): number {
  // Simple sentiment analysis based on keywords
  const positiveWords = [
    'love', 'loved', 'happy', 'great', 'good', 'amazing', 'wonderful', 'excellent', 'fantastic',
    'perfect', 'beautiful', 'awesome', 'nice', 'best', 'better', 'thanks', 'thank', 'appreciate',
    'excited', 'joy', 'pleased', 'smile', 'laugh', 'haha', 'lol', 'yay', 'yes', 'yeah'
  ]

  const negativeWords = [
    'hate', 'hated', 'sad', 'bad', 'terrible', 'awful', 'horrible', 'worst', 'disappointed',
    'angry', 'mad', 'frustrated', 'upset', 'worried', 'anxious', 'sorry', 'regret', 'no',
    'dont', 'cant', 'wont', 'shouldnt'
  ]

  const lowerText = text.toLowerCase()
  let positiveCount = 0
  let negativeCount = 0

  positiveWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = lowerText.match(regex)
    if (matches) positiveCount += matches.length
  })

  negativeWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = lowerText.match(regex)
    if (matches) negativeCount += matches.length
  })

  const total = positiveCount + negativeCount
  if (total === 0) return 0

  // Return value between -1 (negative) and 1 (positive)
  return (positiveCount - negativeCount) / Math.max(total, 1)
}

function calculateCycleVariance(scores: { date: string; score: number }[], cycleLength: number): number {
  if (scores.length < cycleLength) return 1

  // Group scores by position in cycle
  const cycleGroups = new Map<number, number[]>()

  scores.forEach(({ score }, index) => {
    const cyclePos = index % cycleLength
    if (!cycleGroups.has(cyclePos)) {
      cycleGroups.set(cyclePos, [])
    }
    cycleGroups.get(cyclePos)!.push(score)
  })

  // Calculate average for each cycle position
  const cycleAverages = Array.from(cycleGroups.entries()).map(([pos, values]) => ({
    pos,
    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
  }))

  // Calculate variance
  const overallAvg = cycleAverages.reduce((sum, c) => sum + c.avg, 0) / cycleAverages.length
  const variance = cycleAverages.reduce((sum, c) => sum + Math.pow(c.avg - overallAvg, 2), 0) / cycleAverages.length

  // Normalize variance (0 = perfect cycle, 1 = no cycle)
  return Math.min(1, variance / (overallAvg * overallAvg))
}

function getDefaultAnalysis(): ChatAnalysis {
  return {
    relationshipSummary: {
      strength: 0,
      balance: 50,
      description: 'No chat data available.',
    },
    conversationStyle: {
      avgReplyTime: 0,
      quickReplyRate: 0,
      description: 'No conversation data available.',
    },
    energyPeaks: {
      peakHour: 12,
      peakDay: 'Monday',
      description: 'No activity data available.',
    },
    moodPattern: {
      hasCycle: false,
      cycleLength: 0,
      phases: [],
      description: 'No mood pattern data available.',
      moodScores: [],
      currentPhase: {
        phase: 'Unknown',
        confidence: 0,
        advice: 'Need more data to predict cycle phase.',
      },
    },
    conversationInitiators: {
      sender1Starts: 0,
      sender2Starts: 0,
      sender1Percentage: 50,
      description: 'No initiator data available.',
    },
    sentimentAnalysis: {
      averageSentiment: 0,
      weeklyTrend: [],
      dailyScores: [],
      description: 'No sentiment data available.',
      phaseCorrelation: [],
      actionableInsight: 'Need more data to provide insights.',
    },
    turningPoints: [],
    personaInsights: [{
      persona: 'unknown',
      advice: 'Need more data to provide persona-specific insights.',
      confidence: 0,
      context: 'Insufficient data.',
    }],
    guidedAdvice: [],
    activeHoursData: [],
  }
}
