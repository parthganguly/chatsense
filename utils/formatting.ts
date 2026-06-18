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

export function formatPhaseLabel(label: ChatAnalysis["relationshipDynamics"]["phases"][number]["label"]): string {
  if (label === "full") return "Full export"
  return label[0].toUpperCase() + label.slice(1)
}

export function formatChangeDirection(
  direction: ChatAnalysis["relationshipDynamics"]["activityChange"]["direction"],
): string {
  const labels = {
    rising: "Rising",
    falling: "Falling",
    stable: "Stable",
    faster: "Faster",
    slower: "Slower",
    more_balanced: "More balanced",
    more_one_sided: "More one-sided",
    shifted: "Shifted",
    not_enough_data: "Limited data",
  }
  return labels[direction]
}
