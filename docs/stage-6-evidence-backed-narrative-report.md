# Stage 6 Evidence-backed Insight Narrative

## Objective

Stage 6 makes the first screen answer "What does this export actually show?"
without content interpretation, prediction, generated advice, or psychological
claims.

## Runtime design

`packages/chatsense-core/src/insight-narrative.ts` builds an
`InsightNarrative` after the existing analysis is complete. It consumes only:

- export message and active-day counts;
- participant message shares;
- historical sender-switch reply timing;
- Stage 4 pause/reconnection summaries;
- Stage 4 evidence-safe comparisons and notable-change flags;
- the existing recent activity comparison.

It does not read message content and does not consume the Stage 5 forecasting
report. The builder returns at most four findings. Up to two sufficient notable
changes can lead; otherwise the first finding plainly states either that no
measured change crossed the threshold or that the export cannot support a strong
over-time comparison.

## Evidence and language rules

Every finding has visible evidence entries. Change findings show earlier and
later values, period dates, and sample counts. Descriptive findings show the
underlying counts, percentages, or durations. Limited evidence includes the
canonical comparison-unavailability reason.

The mandatory guardrail is owned by
`contracts/behavioral_contract.json`. It says that exported timing and volume do
not prove motive, love, rejection, affection, attachment, personality, mental
health, relationship quality, or relationship status. Separate limitations
state that content is not interpreted, nothing predicts future behavior, and
group-chat sender-switch paths are approximate.

## Product presentation

Overview now renders:

1. the narrative headline and one-sentence synthesis;
2. prioritized findings with their evidence;
3. the mandatory guardrail and limitations;
4. the existing at-a-glance metrics and historical reply timing as supporting
   detail.

The Changes, Rhythm, People, import, native share, and forecasting-gate flows are
unchanged.

## Regression coverage

`tests/insight-narrative.ts` verifies:

- sufficient notable changes lead and expose periods and sample counts;
- insufficient exports state limited evidence;
- rewriting all message content does not change the narrative;
- findings are bounded, uniquely identified, and always carry evidence;
- prohibited speculative phrases are absent;
- group-chat approximation language appears when applicable;
- Overview places the narrative before the metric grid.

Contract parity tests verify the TypeScript and Python constants against the
canonical JSON.

## Scope boundary

Stage 6 adds no sentiment analysis, embeddings, LLM, prediction, coaching,
reply advice, attachment-style labels, interest claims, withdrawal claims, or
new behavioral calculations. Forecasting remains blocked by the Stage 5 gate.

## Verification

Local verification on July 1, 2026:

- `npm ci` passed under Node 22. It reported the existing one moderate and one
  critical audit finding plus existing Next.js and Recharts deprecation notices.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test` passed, including the Stage 6 narrative suite.
- `npm run test:parity` passed for 21 behavioral fixtures.
- `npm run test:forecast-parity` passed for 10 forecasting fixtures.
- `npm run forecast:eval` passed for 10 forecasting fixtures.
- `npm run build` passed after removing only the repo-local generated `.next`
  cache. The first attempt hit the known stale Webpack `WasmHash` cache failure.
- `python -m pip install -e ".[dev]"` passed.
- `python -m pytest` passed: 38 tests.
- `python -m chatsense_ml.forecasting.evaluate` passed for 10 fixtures.
- `npx cap sync android` passed under Node 22.
- `android\\gradlew.bat -p android test` passed.
- `android\\gradlew.bat -p android assembleDebug` passed.
- The mobile app shell was checked at 390 by 844 pixels: it rendered meaningful
  content with no horizontal overflow, framework overlay, console warning, or
  console error. Imported-analysis presentation remains covered by deterministic
  fixture tests because the browser harness cannot drive the native file chooser.

GitHub Actions results are recorded in the Stage 6 pull request after push.
