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

# Reply-dynamics thresholds (minutes).
QUICK_REPLY_MAX_MIN: int = _thresholds["quick_reply_max"]
WITHIN_ONE_HOUR_MAX_MIN: int = _thresholds["within_one_hour_max"]
WITHIN_SIX_HOURS_MAX_MIN: int = _thresholds["within_six_hours_max"]
WITHIN_ONE_DAY_MAX_MIN: int = _thresholds["within_one_day_max"]
LATE_REPLY_MIN_EXCLUSIVE_MIN: int = _thresholds["late_reply_min_exclusive"]

# Thread / initiation silence threshold (minutes).
THREAD_GAP_MIN: int = _thresholds["thread_gap_min"]

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
