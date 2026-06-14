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

export const CONTRACT_VERSION = "1.0"

// Reply-dynamics thresholds (minutes).
export const QUICK_REPLY_MAX_MIN = 5
export const WITHIN_ONE_HOUR_MAX_MIN = 60
export const WITHIN_SIX_HOURS_MAX_MIN = 360
export const WITHIN_ONE_DAY_MAX_MIN = 1440
export const LATE_REPLY_MIN_EXCLUSIVE_MIN = 1440

// Thread / initiation silence threshold (minutes).
export const THREAD_GAP_MIN = 360

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
