import type { ChatAnalysis } from "@chatsense/core"

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

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}
