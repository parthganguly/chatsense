"""Cross-language rounding helpers.

JavaScript's ``Math.round`` rounds halves toward +Infinity (round-half-up), while
Python's built-in ``round`` uses banker's rounding. To keep the TypeScript runtime
and the Python reference bit-for-bit comparable on rounded integer metrics, the
parity path rounds the JS way.
"""

from __future__ import annotations

import math


def js_round(value: float, digits: int = 0) -> float:
    """Round like JavaScript ``Math.round`` (half-up), optionally to ``digits``."""
    factor = 10 ** digits
    rounded = math.floor(value * factor + 0.5) / factor
    return rounded if digits > 0 else float(int(rounded))
