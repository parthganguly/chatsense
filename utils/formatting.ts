import type { ChangeDirection, ChatAnalysis } from "@chatsense/core"

export function formatTrend(trend: ChatAnalysis["activity"]["recentTrend"]): string {
  return trend === "not_enough_data" ? "Limited data" : trend[0].toUpperCase() + trend.slice(1)
}

export function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour} ${suffix}`
}

export function formatDate(value: string): string {
  if (!value) return "No data"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

export function formatDateTime(value: string): string {
  if (!value) return "No data"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatChangeDirection(direction: ChangeDirection): string {
  const labels = {
    increased: "Increased",
    decreased: "Decreased",
    stable: "Stable",
    faster: "Faster",
    slower: "Slower",
    shifted: "Shifted",
    unavailable: "Insufficient evidence",
  }
  return labels[direction]
}
