import { parseWhatsAppChat } from "./chat-parser"
import { evaluateForecastingResearch, type ForecastingResearchReport } from "./forecasting"

export interface NormalizedForecastingParity {
  contract_version: string
  status: string
  summary: unknown
  validation_evidence: unknown
  opportunities: unknown
  tasks: unknown
  safety: unknown
}

export function normalizedForecastingParityFromText(
  text: string,
  sourceName = "forecasting-fixture.txt",
): NormalizedForecastingParity {
  const report = evaluateForecastingResearch(parseWhatsAppChat(text), {
    datasetKind: "synthetic",
    datasetIdentity: sourceName,
  })
  return normalizeForecastingReport(report) as NormalizedForecastingParity
}

export function normalizeForecastingReport(report: ForecastingResearchReport): unknown {
  return normalizeValue(report)
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeValue(item))
  if (typeof value === "number") {
    const normalized = Number.isInteger(value) ? value : Number(value.toFixed(6))
    return Object.is(normalized, -0) ? 0 : normalized
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return localDateTimeKey(value)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]): [string, unknown] => [camelToSnake(key), normalizeValue(entry)])
        .sort(([left], [right]) => left.localeCompare(right)),
    )
  }
  return value
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
}

function localDateTimeKey(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}
