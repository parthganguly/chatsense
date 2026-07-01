from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_CONTRACT_PATH = Path(__file__).resolve().parents[3] / "contracts" / "forecasting_contract.json"


@lru_cache(maxsize=1)
def load_forecasting_contract() -> dict:
    return json.loads(_CONTRACT_PATH.read_text(encoding="utf-8"))


def forecasting_contract_path() -> Path:
    return _CONTRACT_PATH


_contract = load_forecasting_contract()
_evaluation = _contract["evaluation"]
_smoothing = _contract["smoothing"]
_gates = _contract["promotion_gates"]

FORECASTING_CONTRACT_VERSION = _contract["contract_version"]
REPLY_HORIZONS_MINUTES = tuple(_contract["tasks"]["reply_within_horizon"]["horizons_minutes"])
FORECASTING_DELAY_BUCKETS = tuple(_contract["tasks"]["conditional_reply_delay_bucket"]["buckets"])
FORECASTING_WARM_UP_REPLY_OPPORTUNITIES = _evaluation["warm_up_reply_opportunities"]
FORECASTING_WARM_UP_WINDOWS = _evaluation["warm_up_windows"]
FORECASTING_PROBABILITY_CLIP = _evaluation["probability_clip"]
FORECASTING_CALIBRATION_BINS = _evaluation["calibration_bins"]
FORECASTING_RECENT_WINDOW_SIZE = _evaluation["recent_window_size"]
_bootstrap = _evaluation["bootstrap"]
FORECASTING_BOOTSTRAP_SEED = _bootstrap["seed"]
FORECASTING_BOOTSTRAP_RESAMPLE_COUNT = _bootstrap["resample_count"]
FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL = _bootstrap["confidence_level"]
FORECASTING_BOOTSTRAP_STRONGLY_INFERIOR_MARGIN = _bootstrap["strongly_inferior_margin"]
_subgroup_checks = _evaluation["subgroup_checks"]
FORECASTING_SUBGROUP_MIN_EVALUATED = _subgroup_checks["min_evaluated"]
FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION = _subgroup_checks["catastrophic_brier_degradation"]
FORECASTING_SMOOTHING_ALPHA = _smoothing["alpha"]
FORECASTING_SMOOTHING_BETA = _smoothing["beta"]
FORECASTING_MIN_CONTEXT_SAMPLES = _smoothing["min_context_samples"]
FORECASTING_MIN_PARTICIPANT_SAMPLES = _smoothing["min_participant_samples"]

_reply_gate = _gates["reply_horizon"]
FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL = _reply_gate["min_evaluated_overall"]
FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT = _reply_gate[
    "min_evaluated_for_displayed_participant"
]
FORECASTING_PROMOTION_REPLY_MIN_POSITIVE = _reply_gate["min_positive"]
FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE = _reply_gate["min_negative"]
FORECASTING_PROMOTION_REPLY_MIN_BRIER_IMPROVEMENT_PCT = _reply_gate["min_brier_improvement_over_best_baseline_pct"]
FORECASTING_PROMOTION_REPLY_MAX_CALIBRATION_ERROR = _reply_gate["max_calibration_error"]

FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES = _gates["conditional_delay_bucket"]["min_observed_responses"]
FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS = _gates["activity"]["min_completed_target_windows"]
FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT = _gates["activity"]["min_mae_improvement_over_best_baseline_pct"]

FORECASTING_SAFETY_WORDING = {
    "not_validated": _contract["safety_wording"]["not_validated"],
    "no_motive": _contract["safety_wording"]["no_motive"],
    "synthetic_limit": _contract["safety_wording"]["synthetic_limit"],
}
