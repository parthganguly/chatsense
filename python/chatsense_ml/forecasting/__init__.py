"""Research-only forecasting validation.

This package validates whether transparent, content-independent communication
forecasts can beat simple baselines under leakage-safe chronological backtests.
It is not used by the Android runtime.
"""

from chatsense_ml.forecasting.evaluation import (
    assert_no_forecasting_leakage,
    assess_reply_horizon_promotion,
    build_reply_opportunities,
    evaluate_forecasting_research,
    outcome_for_horizon,
)

__all__ = [
    "assert_no_forecasting_leakage",
    "assess_reply_horizon_promotion",
    "build_reply_opportunities",
    "evaluate_forecasting_research",
    "outcome_for_horizon",
]
