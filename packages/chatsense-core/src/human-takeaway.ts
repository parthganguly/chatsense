import { NARRATIVE_TAKEAWAY_CONFIDENCE_LABELS } from "./contract"

/**
 * Stage 6.2 human takeaway types.
 *
 * A takeaway is a deterministic translation of the Stage 6 evidence-backed
 * narrative into plain orientation: what the export looks like, why it looks
 * that way, and how much weight the read deserves. It adds no behavioral
 * score, inspects no message content, and never states motive, emotion,
 * advice, prediction, or relationship status. The builders live next to the
 * narrative selection logic in insight-narrative.ts so both read the same
 * computed values.
 */

export type TakeawayTone =
  | "balanced"
  | "uneven"
  | "changed"
  | "stable"
  | "limited"
  | "caution"

export type TakeawayConfidence = "strong" | "moderate" | "limited"

export interface HumanTakeaway {
  /** Fixed per-tab heading, e.g. "What this looks like". */
  title: string
  /** The one sentence a user should remember. */
  oneLineRead: string
  /** One short paragraph of orientation in plain language. */
  whatThisMeans: string
  /** Evidence bullets; every takeaway must carry at least one. */
  whyItLooksThatWay: string[]
  confidence: TakeawayConfidence
  tone: TakeawayTone
  guardrail: string
}

/** Product-facing confidence wording; not a statistical claim. */
export function takeawayConfidenceLabel(confidence: TakeawayConfidence): string {
  return NARRATIVE_TAKEAWAY_CONFIDENCE_LABELS[confidence]
}
