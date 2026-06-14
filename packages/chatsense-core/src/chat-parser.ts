import { DATE_ORDER_DEFAULT, TWO_DIGIT_YEAR_PIVOT } from "./contract"

export interface ChatMessage {
  timestamp: Date
  sender: string
  content: string
}

/**
 * Parses WhatsApp chat export file (.txt format)
 * Supports common WhatsApp export formats:
 * - [DD/MM/YYYY, HH:MM:SS] Sender: Message
 * - DD/MM/YYYY, HH:MM:SS - Sender: Message
 */
export function parseWhatsAppChat(fileContent: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  const lines = fileContent.split(/\r?\n/)
  const dateOrder = inferDateOrder(lines)

  // Regex patterns for different WhatsApp formats
  const patterns = [
    // Format: [DD/MM/YYYY, HH:MM:SS] Sender: Message
    /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]\s*(.+?):\s*(.+)$/,
    // Format: DD/MM/YYYY, HH:MM:SS - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*-\s*(.+?):\s*(.+)$/,
  ]

  let currentMessage: ChatMessage | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    let matched = false

    // Try each pattern
    for (const pattern of patterns) {
      const match = line.match(pattern)
      if (match) {
        // If we have a previous message, save it
        if (currentMessage) {
          messages.push(currentMessage)
        }

        const dateStr = match[1]
        const timeStr = match[2]
        const sender = match[3].trim()
        const content = match[4].trim()

        // Parse date and time
        const timestamp = parseDateTime(dateStr, timeStr, dateOrder)

        currentMessage = {
          timestamp,
          sender,
          content,
        }
        matched = true
        break
      }
    }

    // If no match, this might be a continuation of the previous message
    if (!matched && currentMessage && !looksLikeSystemLine(line)) {
      currentMessage.content += '\n' + line
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    messages.push(currentMessage)
  }

  return messages
}

/**
 * Parses date and time strings into a Date object
 */
function parseDateTime(dateStr: string, timeStr: string, dateOrder: "dmy" | "mdy"): Date {
  const [first, second, year] = dateStr.split('/').map(Number)
  const day = dateOrder === "dmy" ? first : second
  const month = dateOrder === "dmy" ? second : first
  const fullYear = year < 100 ? TWO_DIGIT_YEAR_PIVOT + year : year

  // Parse time: HH:MM:SS or HH:MM (with optional AM/PM)
  let hours = 0
  let minutes = 0
  let seconds = 0

  const timeLower = timeStr.toLowerCase().trim()
  const isPM = timeLower.includes('pm')
  const isAM = timeLower.includes('am')

  // Remove AM/PM if present
  const timeOnly = timeLower.replace(/[ap]m/i, '').trim()
  const timeParts = timeOnly.split(':').map(Number)

  hours = timeParts[0] || 0
  minutes = timeParts[1] || 0
  seconds = timeParts[2] || 0

  // Handle 12-hour format
  if (isPM && hours !== 12) {
    hours += 12
  } else if (isAM && hours === 12) {
    hours = 0
  }

  // Create Date object (month is 0-indexed in JS Date)
  return new Date(fullYear, month - 1, day, hours, minutes, seconds)
}

function inferDateOrder(lines: string[]): "dmy" | "mdy" {
  for (const line of lines) {
    const match = line.match(/^\[?(\d{1,2})\/(\d{1,2})\/\d{2,4}/)
    if (!match) continue
    const first = Number(match[1])
    const second = Number(match[2])
    if (first > 12) return "dmy"
    if (second > 12) return "mdy"
  }
  return DATE_ORDER_DEFAULT
}

function looksLikeSystemLine(line: string): boolean {
  return /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}/.test(line)
}

/**
 * Extracts unique sender names from messages
 */
export function getSenders(messages: ChatMessage[]): string[] {
  const senders = new Set<string>()
  messages.forEach((msg) => senders.add(msg.sender))
  return Array.from(senders)
}

/**
 * Filters messages by sender
 */
export function filterBySender(messages: ChatMessage[], sender: string): ChatMessage[] {
  return messages.filter((msg) => msg.sender === sender)
}
