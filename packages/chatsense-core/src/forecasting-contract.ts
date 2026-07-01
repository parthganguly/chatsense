/**
 * Shared forecasting validation contract -- TypeScript constants layer.
 *
 * Canonical source: `contracts/forecasting_contract.json`.
 * These values define research evaluation only. They do not authorize product
 * forecasts unless promotion gates pass on an appropriate validation corpus.
 */

export const FORECASTING_CONTRACT_VERSION = "1.0"

export const REPLY_HORIZONS_MINUTES = [60, 360, 1440] as const

export const FORECASTING_DELAY_BUCKETS = [
  { label: "under_1h", minMinutes: 0, maxMinutes: 60, maxInclusive: true },
  { label: "1h_6h", minMinutes: 60, maxMinutes: 360, maxInclusive: true },
  { label: "6h_24h", minMinutes: 360, maxMinutes: 1440, maxInclusive: true },
  { label: "over_24h", minMinutes: 1440, maxMinutes: null, maxInclusive: false },
] as const

export const FORECASTING_WARM_UP_REPLY_OPPORTUNITIES = 5
export const FORECASTING_WARM_UP_WINDOWS = 3
export const FORECASTING_PROBABILITY_CLIP = 0.001
export const FORECASTING_CALIBRATION_BINS = 5
export const FORECASTING_RECENT_WINDOW_SIZE = 20
export const FORECASTING_BOOTSTRAP_SEED = 1729
export const FORECASTING_BOOTSTRAP_RESAMPLE_COUNT = 200
export const FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL = 0.9
export const FORECASTING_BOOTSTRAP_STRONGLY_INFERIOR_MARGIN = 0
export const FORECASTING_SUBGROUP_MIN_EVALUATED = 10
export const FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION = 0.1

export const FORECASTING_SMOOTHING_ALPHA = 1
export const FORECASTING_SMOOTHING_BETA = 1
export const FORECASTING_MIN_CONTEXT_SAMPLES = 5
export const FORECASTING_MIN_PARTICIPANT_SAMPLES = 3

export const FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL = 80
export const FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT = 30
export const FORECASTING_PROMOTION_REPLY_MIN_POSITIVE = 15
export const FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE = 15
export const FORECASTING_PROMOTION_REPLY_MIN_BRIER_IMPROVEMENT_PCT = 5
export const FORECASTING_PROMOTION_REPLY_MAX_CALIBRATION_ERROR = 0.1

export const FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES = 80
export const FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS = 12
export const FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT = 10

export const FORECASTING_MAX_EXPORT_AGE_HOURS_FOR_LIVE_FORECAST = 24

export const FORECASTING_SAFETY_WORDING = {
  notValidated: "Forecasting is not validated for this export.",
  noMotive:
    "A forecast is an estimate from previous observable behavior, not knowledge of intent, affection, attachment, personality or relationship status.",
  syntheticLimit: "Synthetic fixtures validate correctness of the method, not real-world predictive validity.",
} as const
