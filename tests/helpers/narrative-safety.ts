import assert from "node:assert/strict"
import type { InsightNarrative } from "@chatsense/core"
import { NARRATIVE_REQUIRED_GUARDRAIL } from "@chatsense/core/contract"

export const NARRATIVE_HIGH_RISK_TERMS = [
  "love",
  "interest",
  "disinterest",
  "withdrawal",
  "avoidant",
  "anxious",
  "secure attachment",
  "narcissistic",
  "manipulative",
  "toxic",
  "gaslighting",
  "breadcrumbing",
  "rejection",
  "care more",
  "doesn't care",
  "compatible",
  "will reply",
  "should message",
  "relationship status",
  "future",
] as const

export function assertNarrativeLanguageSafe(narrative: InsightNarrative, label: string): void {
  for (const entry of narrativeTextEntries(narrative)) {
    assertTextHasNoUnnegatedRiskTerm(entry.text, `${label} ${entry.path}`)
  }
}

function narrativeTextEntries(narrative: InsightNarrative): Array<{ path: string; text: string }> {
  const entries: Array<{ path: string; text: string }> = [
    { path: "headline", text: narrative.headline },
    { path: "summary", text: narrative.summary },
    { path: "guardrail", text: narrative.guardrail },
    ...narrative.limitations.map((text, index) => ({ path: `limitations[${index}]`, text })),
  ]

  for (const [sectionKey, section] of Object.entries(narrative.sections)) {
    entries.push(
      { path: `sections.${sectionKey}.headline`, text: section.headline },
      { path: `sections.${sectionKey}.summary`, text: section.summary },
    )
    section.findings.forEach((finding, findingIndex) => {
      entries.push(
        { path: `sections.${sectionKey}.findings[${findingIndex}].title`, text: finding.title },
        { path: `sections.${sectionKey}.findings[${findingIndex}].summary`, text: finding.summary },
      )
      finding.evidence.forEach((evidence, evidenceIndex) => {
        entries.push(
          {
            path: `sections.${sectionKey}.findings[${findingIndex}].evidence[${evidenceIndex}].label`,
            text: evidence.label,
          },
          {
            path: `sections.${sectionKey}.findings[${findingIndex}].evidence[${evidenceIndex}].value`,
            text: evidence.value,
          },
        )
        if (evidence.detail) {
          entries.push({
            path: `sections.${sectionKey}.findings[${findingIndex}].evidence[${evidenceIndex}].detail`,
            text: evidence.detail,
          })
        }
      })
    })
  }
  return entries
}

function assertTextHasNoUnnegatedRiskTerm(text: string, path: string): void {
  const normalized = text.toLowerCase()
  if (normalized === NARRATIVE_REQUIRED_GUARDRAIL.toLowerCase()) return

  const withoutAllowedFutureNegations = normalized
    .replace(/does not predict the future/g, "")
    .replace(/doesn't predict the future/g, "")
    .replace(/nothing[^.]{0,100}predicts?[^.]{0,60}future/g, "")

  for (const term of NARRATIVE_HIGH_RISK_TERMS) {
    const expression = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")
    assert.doesNotMatch(withoutAllowedFutureNegations, expression, `${path} contains high-risk term '${term}': ${text}`)
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
