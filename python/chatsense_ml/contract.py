"""Shared behavioral contract loader.

The canonical source of truth is ``contracts/behavioral_contract.json`` at the
repository root. This module loads it once and exposes the constants the core
reference pipeline uses, so numeric thresholds are never hand-duplicated across
Python and TypeScript. ``tests/test_contract.py`` proves these constants match
the JSON, and the TypeScript side mirrors the same file through ``lib/contract.ts``.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_CONTRACT_PATH = Path(__file__).resolve().parents[2] / "contracts" / "behavioral_contract.json"


@lru_cache(maxsize=1)
def load_contract() -> dict:
    """Return the parsed canonical behavioral contract."""
    return json.loads(_CONTRACT_PATH.read_text(encoding="utf-8"))


def contract_path() -> Path:
    """Absolute path to the canonical contract JSON (used by tests)."""
    return _CONTRACT_PATH


_contract = load_contract()
_thresholds = _contract["thresholds_minutes"]
_silence = _contract["silence_anomaly"]
_dynamics = _contract["relationship_dynamics"]
_narrative = _contract["insight_narrative"]

CONTRACT_VERSION: str = _contract["contract_version"]

# Reply-dynamics thresholds (minutes).
QUICK_REPLY_MAX_MIN: int = _thresholds["quick_reply_max"]
WITHIN_ONE_HOUR_MAX_MIN: int = _thresholds["within_one_hour_max"]
WITHIN_SIX_HOURS_MAX_MIN: int = _thresholds["within_six_hours_max"]
WITHIN_ONE_DAY_MAX_MIN: int = _thresholds["within_one_day_max"]
LATE_REPLY_MIN_EXCLUSIVE_MIN: int = _thresholds["late_reply_min_exclusive"]

# Thread / initiation silence threshold (minutes).
THREAD_GAP_MIN: int = _thresholds["thread_gap_min"]
RECONNECTION_GAP_MIN: int = _thresholds["reconnection_gap_min"]
FOLLOW_UP_MIN: int = _thresholds["follow_up_min"]

# Relationship-dynamics adaptive windows and evidence thresholds.
ADAPTIVE_WINDOW_RULES: tuple[dict, ...] = tuple(_dynamics["adaptive_windows"])
MIN_WINDOW_MESSAGES: int = _dynamics["window_eligibility"]["min_messages"]
MIN_WINDOW_ACTIVE_DAYS: int = _dynamics["window_eligibility"]["min_active_days"]
EARLY_LATE_MIN_ELIGIBLE_WINDOWS: int = _dynamics["comparison_periods"]["early_late_min_eligible_windows"]
EARLY_LATE_WINDOW_COUNT: int = _dynamics["comparison_periods"]["early_late_window_count"]
RECENT_PRIOR_WINDOW_COUNT: int = _dynamics["comparison_periods"]["recent_prior_window_count"]
MIN_REPLY_LATENCY_PER_PARTICIPANT: int = _dynamics["sample_minimums"]["reply_latency_per_participant"]
MIN_THREAD_STARTS_PER_PERIOD: int = _dynamics["sample_minimums"]["thread_starts_per_period"]
MIN_RECONNECTIONS_PER_PERIOD: int = _dynamics["sample_minimums"]["reconnections_per_period"]
MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT: int = _dynamics["sample_minimums"][
    "follow_up_relevant_turns_per_participant"
]

NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT: int = _dynamics["notable_change_thresholds"][
    "messages_per_active_day_relative_pct"
]
NOTABLE_TURN_SHARE_ABS_PCT: int = _dynamics["notable_change_thresholds"]["turn_share_abs_pct"]
NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER: float = _dynamics["notable_change_thresholds"][
    "reply_latency_relative_multiplier"
]
NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN: int = _dynamics["notable_change_thresholds"]["reply_latency_absolute_min"]
NOTABLE_THREAD_START_SHARE_ABS_PCT: int = _dynamics["notable_change_thresholds"]["thread_start_share_abs_pct"]
NOTABLE_RECONNECTION_SHARE_ABS_PCT: int = _dynamics["notable_change_thresholds"]["reconnection_share_abs_pct"]
NOTABLE_FOLLOW_UP_RATE_ABS_PCT: int = _dynamics["notable_change_thresholds"]["follow_up_rate_abs_pct"]

# Evidence-backed narrative presentation contract. Python does not render the
# Android UI, but exposes the same canonical limits for research consumers.
NARRATIVE_MAX_PRIMARY_FINDINGS: int = _narrative["max_primary_findings"]
NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS: int = _narrative["max_notable_change_findings"]
NARRATIVE_REQUIRED_GUARDRAIL: str = _narrative["required_guardrail"]

# Canonical runtime silence-anomaly definition.
SILENCE_ANOMALY_SCALE: float = _silence["scale"]
SILENCE_ANOMALY_K: float = _silence["k"]
SILENCE_ANOMALY_FLOOR_MIN: int = _thresholds[_silence["floor_minutes_ref"]]

# Date-order policy.
DATE_ORDER_DEFAULT: str = _contract["date_order_policy"]["default"]
TWO_DIGIT_YEAR_PIVOT: int = _contract["date_order_policy"]["two_digit_year_pivot"]

# Supported message types.
SUPPORTED_MESSAGE_TYPES: tuple[str, ...] = tuple(_contract["message_types"]["supported"])
MEDIA_MARKERS: tuple[str, ...] = tuple(_contract["message_types"]["media_markers"])
DELETED_MARKERS: tuple[str, ...] = tuple(_contract["message_types"]["deleted_markers"])
