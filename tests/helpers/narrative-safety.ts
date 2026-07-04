import assert from "node:assert/strict"
import type { InsightNarrative } from "@chatsense/core"
import { NARRATIVE_REQUIRED_GUARDRAIL } from "@chatsense/core/contract"

// Kept for compatibility with earlier imports; the enforced source of truth is
// the pattern lists below, which also catch morphological variants.
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

// Psychological, motive, diagnostic, relationship-status, and prediction claims.
// Stems are intentional: "love" must also reject "loves"/"loved", "interest"
// must also reject "interested"/"uninterested", "rejection" must also reject
// "rejected", and so on.
export const NARRATIVE_HIGH_RISK_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "love", pattern: /\blov(?:e|es|ed|ing)\b/i },
  { name: "interest", pattern: /\b(?:dis|un)?interest(?:s|ed|ing)?\b/i },
  { name: "withdrawal", pattern: /\bwithdraw(?:al|s|n|ing|ed)?\b/i },
  { name: "avoidant", pattern: /\bavoidant\b/i },
  { name: "anxious", pattern: /\banxious(?:ly)?\b|\banxiety\b/i },
  { name: "attachment", pattern: /\battachment\b/i },
  { name: "narcissistic", pattern: /\bnarcissis\w*\b/i },
  { name: "manipulative", pattern: /\bmanipulat\w*\b/i },
  { name: "toxic", pattern: /\btoxic\w*\b/i },
  { name: "gaslighting", pattern: /\bgasligh\w*\b/i },
  { name: "breadcrumbing", pattern: /\bbreadcrumb\w*\b/i },
  { name: "rejection", pattern: /\breject(?:s|ed|ing|ion)?\b/i },
  { name: "care more / does not care", pattern: /\bcares? more\b|\b(?:does not|doesn't|no longer) care\b/i },
  { name: "compatible", pattern: /\b(?:in)?compatib\w*\b/i },
  { name: "will reply / respond", pattern: /\bwill (?:reply|respond|message|text|answer)\b/i },
  { name: "should message / reply", pattern: /\bshould (?:message|text|reply|respond|reach out)\b/i },
  { name: "relationship status", pattern: /\brelationship status\b/i },
  { name: "future", pattern: /\bfuture\b/i },
]

// Softer motive-flavored wording. Not psychological diagnoses, but the app must
// still describe behavior with neutral observable language ("contact
// maintenance", "thread starts", "restarts after long pauses") instead.
export const NARRATIVE_SOFT_RISK_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "effort", pattern: /\beffort\w*\b/i },
  { name: "investment", pattern: /\binvest\w*\b/i },
  { name: "emotional", pattern: /\bemotion\w*\b/i },
  { name: "repair", pattern: /\brepair\w*\b/i },
  { name: "chasing", pattern: /\bchas(?:e|es|ed|ing)\b/i },
  { name: "ignored", pattern: /\bignor(?:e|es|ed|ing)\b/i },
  { name: "ghosting", pattern: /\bghost\w*\b/i },
  { name: "pulling away", pattern: /\bpull(?:s|ed|ing)? away\b/i },
  { name: "clingy / needy", pattern: /\bclingy\b|\bneedy\b/i },
]

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

  const withoutAllowedNegations = normalized
    .replace(/does not predict the future/g, "")
    .replace(/doesn't predict the future/g, "")
    .replace(/nothing[^.]{0,100}predicts?[^.]{0,60}future/g, "")
    .replace(/does not prove[^.]{0,120}\./g, "")
    .replace(/do not prove[^.]{0,120}\./g, "")

  for (const { name, pattern } of [...NARRATIVE_HIGH_RISK_PATTERNS, ...NARRATIVE_SOFT_RISK_PATTERNS]) {
    assert.doesNotMatch(
      withoutAllowedNegations,
      pattern,
      `${path} contains risk term '${name}': ${text}`,
    )
  }
}
