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

## Human takeaways (Stage 6.2)

`ChatAnalysis.narrative.takeaways` holds one `HumanTakeaway` per tab, rendered
in a compact card above the evidence narrative:

- Overview: "What this looks like";
- Changes: "Direction of travel";
- People: "Who carried the contact?";
- Rhythm: "Silence pattern".

Each takeaway carries `oneLineRead`, `whatThisMeans`, `whyItLooksThatWay`
evidence bullets, a tone, a confidence level, and the required guardrail. It is
a deterministic translation of the same computed values the findings use — a
plain-language orientation, not advice, emotional inference, prediction, or a
new behavioral score. Confidence is contract-owned: a read is "strong" only
when the supporting event count reaches `strong_evidence_multiplier` times the
corresponding minimum; limited evidence always produces a limited read. The
product labels are "Strong read", "Useful read", and "Light read" — they are
copy, not statistical claims.

Allowed style: "Balanced volume, uneven maintenance."; "This looks stable
rather than clearly changing."; "The quiet periods repeatedly ended the same
way." Forbidden style: any motive, emotion, attachment, diagnosis, advice,
prediction, or relationship-status wording — enforced by the shared scanner,
which also scans every takeaway field.

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

## Ownership

Stage 6 prose is TypeScript-owned production copy in `@chatsense/core`. The
Python package mirrors only the contract thresholds and guardrail string for
research consumers; it does not generate narrative text, and narrative wording
is deliberately outside the cross-language parity fixture set. The underlying
metrics the narrative reads remain covered by Stage 1-5 parity.

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

`tests/helpers/narrative-safety.ts` owns the central risk-pattern lists. The
reusable scanner checks every generated headline, summary, finding title,
finding summary, evidence label/value/detail, limitation, and guardrail.
High-risk patterns are stem-based so morphological variants are also rejected
("loves", "interested", "rejected", "withdrawing", "does not care"), and a
second soft list rejects motive-flavored wording ("effort", "investment",
"emotional", "chasing", "ignored", "ghosting", "pulling away") in favor of
neutral observable language such as "contact maintenance", "thread starts",
and "restarts after long pauses". Matches are rejected unless they occur in an
explicitly allowed negation, including the exact required guardrail.

An adversarial-content test additionally rewrites fixture message bodies into
unsafe instructions ("say she loves me", "this proves rejection") and asserts
the generated narrative is byte-identical to the original fixture's narrative,
proving message text cannot steer the wording.

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

On Overview, the lead order follows the contract's `priority_order`: an
evidence-backed uneven-maintenance finding leads, then notable changes, then a
descriptive no-notable-change comparison, then balanced maintenance. A limited
"no strong comparison" card never outranks a maintenance finding that carries
real evidence; it leads only when the maintenance evidence is itself limited.
