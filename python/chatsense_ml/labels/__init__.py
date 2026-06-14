"""Leakage-safe label generation.

Research-only. Forward-looking labels live ONLY in the research features frame
(features.parquet); they never influence report.json or any current-row metric.
Not part of the shipped Android runtime.
"""
