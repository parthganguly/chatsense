/**
 * Shared behavioral contract — TypeScript constants layer.
 *
 * The canonical source of truth is `contracts/behavioral_contract.json` at the
 * repository root. These constants mirror that file so the Android runtime never
 * hand-duplicates thresholds. They are intentionally plain values (no filesystem
 * access) so they work in the browser/WebView bundle. `tests/contract.test.ts`
 * loads the JSON and proves every value here matches it, and the Python side
 * mirrors the same file through `chatsense_ml/contract.py`.
 *
 * Do not edit a number here without editing the JSON; the test will fail otherwise.
 */

export const CONTRACT_VERSION = "2.0"

// Reply-dynamics thresholds (minutes).
export const QUICK_REPLY_MAX_MIN = 5
export const WITHIN_ONE_HOUR_MAX_MIN = 60
export const WITHIN_SIX_HOURS_MAX_MIN = 360
export const WITHIN_ONE_DAY_MAX_MIN = 1440
export const LATE_REPLY_MIN_EXCLUSIVE_MIN = 1440

// Thread / initiation silence threshold (minutes).
export const THREAD_GAP_MIN = 360
export const RECONNECTION_GAP_MIN = 1440
export const FOLLOW_UP_MIN = 15

// Relationship-dynamics adaptive windows.
export const ADAPTIVE_WINDOW_RULES = [
  { maxSpanDays: 90, windowDays: 7 },
  { maxSpanDays: 365, windowDays: 14 },
  { maxSpanDays: null, windowDays: 30 },
] as const

// Relationship-dynamics evidence thresholds.
export const MIN_WINDOW_MESSAGES = 20
export const MIN_WINDOW_ACTIVE_DAYS = 2
export const EARLY_LATE_MIN_ELIGIBLE_WINDOWS = 4
export const EARLY_LATE_WINDOW_COUNT = 2
export const RECENT_PRIOR_WINDOW_COUNT = 1
export const MIN_REPLY_LATENCY_PER_PARTICIPANT = 5
export const MIN_THREAD_STARTS_PER_PERIOD = 3
export const MIN_RECONNECTIONS_PER_PERIOD = 2
export const MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT = 3

// Relationship-dynamics notable-change thresholds.
export const NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT = 30
export const NOTABLE_TURN_SHARE_ABS_PCT = 10
export const NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER = 2
export const NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN = 10
export const NOTABLE_THREAD_START_SHARE_ABS_PCT = 15
export const NOTABLE_RECONNECTION_SHARE_ABS_PCT = 20
export const NOTABLE_FOLLOW_UP_RATE_ABS_PCT = 15

// Evidence-backed narrative presentation limits and mandatory safety language.
export const NARRATIVE_MAX_PRIMARY_FINDINGS = 4
export const NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS = 2
export const NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT = 60
export const NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT = 65
export const NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT = 60
export const NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS = 3
export const NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS = 2
export const NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS = 3
export const NARRATIVE_TAKEAWAY_STRONG_EVIDENCE_MULTIPLIER = 2
export const NARRATIVE_TAKEAWAY_CONFIDENCE_LABELS = {
  strong: "Strong read",
  moderate: "Useful read",
  limited: "Light read",
} as const
// Short orientation line on the takeaway card; the full guardrail remains in
// the detailed narrative and screen footers.
export const NARRATIVE_TAKEAWAY_SAFETY_LINE = "Observed in this export; it does not explain why."
export const NARRATIVE_REQUIRED_GUARDRAIL =
  "These observations describe exported timing and volume only. They do not prove motive, love, rejection, affection, attachment, personality, mental health, relationship quality, or relationship status."

// Canonical runtime silence-anomaly definition (modified z-score, floored).
export const SILENCE_ANOMALY_SCALE = 1.4826
export const SILENCE_ANOMALY_K = 3.5
export const SILENCE_ANOMALY_FLOOR_MIN = THREAD_GAP_MIN

// Date-order policy.
export const DATE_ORDER_DEFAULT: "dmy" | "mdy" = "dmy"
export const TWO_DIGIT_YEAR_PIVOT = 2000

// Supported message types.
export const SUPPORTED_MESSAGE_TYPES = ["text", "media", "deleted", "system"] as const
export const MEDIA_MARKERS = ["media omitted", "<attached:"] as const
export const DELETED_MARKERS = ["message was deleted", "deleted this message"] as const
