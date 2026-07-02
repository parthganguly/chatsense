# Insight Narrative

## Purpose

The Stage 6 narrative translates existing observable metrics into concise,
evidence-backed language. It is deterministic, local, content-independent,
non-diagnostic, and non-predictive.

`ChatAnalysis.narrative.sections` contains:

- `overview`: the highest-priority export story before at-a-glance metrics;
- `changes`: strongest early-versus-late and recent-prior changes, plus the
  forecasting gate, before raw comparison cards;
- `people`: contribution balance, contact maintenance, restarts, and group
  attribution limits before participant cards;
- `rhythm`: median and longest gaps, 24-hour pauses, latest-gap percentile,
  reconnecting participants, and recent activity before charts and pause tables.

The original `headline`, `summary`, and `findings` fields remain aliases for the
Overview section.

## Categories

Product narrative uses these explicit categories:

- `balance`;
- `maintenance`;
- `reconnection`;
- `reply_timing`;
- `activity_change`;
- `rhythm`;
- `forecasting_gate`;
- `data_quality`.

First-pass category aliases remain in the TypeScript union for compatibility,
but new product findings use the explicit categories above.

## Contact maintenance

Maintenance describes who starts threads after six-hour gaps, sends the first
message after pauses of at least 24 hours, or follows up before another
participant replies. It does not measure affection, effort, importance, or
intent.

Contract rules:

- balanced contribution requires both the top message share and top turn share
  to be at or below 60%;
- an uneven thread-start or restart measure requires at least 65% share and its
  event minimum;
- an uneven follow-up measure requires a rate of at least 60% and at least three
  relevant turns;
- too few eligible maintenance events produce a limited-evidence finding.

This supports the distinctive observation that message volume can be balanced
while contact maintenance is uneven. Every maintenance finding shows message
share, turn share, thread starts, 24-hour restarts, and follow-up evidence when
available.

## Forecasting gate

The Changes narrative always includes a low-priority forecasting-gate finding.
It may show method-gate status, product-promotion status, evaluated opportunity
count, and the first gate reason. It never displays a live forecast. Current
product wording is: "This export and method have not earned product forecasting."

## Language safety

`tests/helpers/narrative-safety.ts` owns the central high-risk-term list. The
reusable scanner checks every generated headline, summary, finding title,
finding summary, evidence label/value/detail, limitation, and guardrail.
High-risk terms are rejected unless they occur in an explicitly allowed
negation, including the exact required guardrail.

The guardrail remains:

> These observations describe exported timing and volume only. They do not
> prove motive, love, rejection, affection, attachment, personality, mental
> health, relationship quality, or relationship status.

## Evidence and ordering

Every finding has at least one evidence entry. Changes show earlier/later values,
period dates, and sample sizes. Maintenance and rhythm findings show their source
counts, shares, durations, or percentiles. Limited evidence carries the reason it
is limited.

The core selects and orders findings. Screens format the result but do not
recalculate, rephrase, or reorder it.
