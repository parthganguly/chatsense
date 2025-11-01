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

export interface ChatAnalysis {
  relationshipSummary: RelationshipSummary
  conversationStyle: ConversationStyle
  energyPeaks: EnergyPeaks
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

  return {
    relationshipSummary,
    conversationStyle,
    energyPeaks,
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
 * Helper: Get unique days from messages
 */
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

/**
 * Returns default analysis when no data is available
 */
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
  }
}
