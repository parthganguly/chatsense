# Stage 5 Forecasting Validation Report

## Starting Point

Stage 5 starts from merged `main` at `5e3dba9f7c03f6bb28f04f20e24b095a854ccd7f`.

Stages 1-4 remain intact:

- TypeScript is the Android runtime.
- Python is the local research/reference implementation.
- Stage 4 relationship dynamics stay descriptive and content-independent.
- No LLM, backend, telemetry, React Native, or Expo work is included.

## Audited Existing Labels

See `docs/forecasting-target-audit.md`.

The legacy row-level labels remain research-only because they are not the Stage 5 prediction unit:

- `next_reply_delay_bucket`;
- `next_window_activity_level`;
- `next_window_imbalance_change`.

Stage 5 uses turn-based reply opportunities and completed adaptive windows instead.

## Implemented Tasks

### Reply Within Horizon

Horizons:

- 60 minutes;
- 360 minutes;
- 1440 minutes.

Prediction unit: end of a conversation turn.

Right-censored opportunities are excluded when the export ends before the horizon can be observed.

### Conditional Reply Delay Bucket

Buckets:

- `under_1h`;
- `1h_6h`;
- `6h_24h`;
- `over_24h`.

This task is conditional on an observed response. It is not a reply-probability task.

### Next Window Activity

Target: next completed adaptive window's messages per active day.

Only completed eligible windows are scored.

### Initiation and Reconnection

Audited only. Not implemented for Stage 5 promotion because single-export sample sizes and independence assumptions are weak.

## Baselines and Candidates

Reply and delay baselines are global, participant, recent, and time-context smoothed estimators. The time-context baseline uses expected responder, weekday/weekend, and a broad hour bucket with hierarchical fallback.

Activity baselines are previous-value, historical mean, rolling mean, and exponentially weighted mean estimators.

Candidates are transparent smoothed or damped-trend estimators. No black-box model is promoted.

## Correctness Updates

Reply opportunities now terminate at the first chronologically valid event:

- observed response from a different participant;
- same-sender new-thread supersession;
- export end.

This prevents a later response from being attached to an older source turn after the source sender has already restarted the conversation. Superseded opportunities are censored for horizons that have not elapsed.

The dedicated fixture matrix is defined in `fixtures/forecasting/manifest.json` and covers 21 Stage 5 cases across 10 committed synthetic fixture files. A few cases are explicit unit-test generators when the exported turn model cannot represent the condition directly.

TypeScript/Python forecasting parity is enforced by:

```bash
npm run test:forecast-parity
```

The command compares fixture-by-fixture normalized opportunities, censoring, horizon outcomes, delay buckets, prediction records, metrics, calibration, bootstrap/subgroup results, and promotion decisions.

## Product Status

The app surfaces a research gate in the Changes screen. It reports counts and gate status, not live predictions.

Current status:

```text
Forecasting is not validated for this export.
```

The implementation is methodologically testable, but general predictive validity has not been established.

## Verification Commands

Stage 5 adds:

```bash
npm run test:forecast-parity
npm run forecast:eval
python -m chatsense_ml.forecasting.evaluate
```

The benchmark commands write generated reports under `artifacts/forecasting/`, which is ignored by git:

- `typescript_report.json`;
- `python_report.json`;
- `parity_report.json`;
- `report.md`.

The JSON reports validate against `contracts/forecasting_report.schema.json`.

## Benchmark Results

Current committed synthetic benchmark matrix:

| Fixture count | Required manifest cases | 1h method gates passed | Product gates passed |
| ---: | ---: | ---: | ---: |
| 10 | 21 | 0 | 0 |

Selected 1h reply-horizon metrics from `artifacts/forecasting/typescript_report.json`:

| Fixture | Evaluated | Candidate Brier | Calibration error | Bootstrap CI | Gate |
| --- | ---: | ---: | ---: | --- | --- |
| `stage5_activity_windows.txt` | 20 | 0.0759 | 0.2625 | [-0.0513, -0.0384] | failed |
| `stage5_group_approximation.txt` | 1 | 0.1837 | 0.4286 | [0, 0] | failed |
| `stage5_horizon_boundaries.txt` | 6 | 0.1229 | 0.3462 | [-0.0182, -0.0065] | failed |
| `stage5_leakage_trap.txt` | 6 | 0.2519 | 0.4801 | [-0.1407, 0.0258] | failed |
| `stage5_method_gate_examples.txt` | 8 | 0.1178 | 0.328 | [-0.0667, -0.0366] | failed |
| `stage5_regime_shift.txt` | 14 | 0.2026 | 0.3216 | [-0.0819, 0.0756] | failed |
| `stage5_reply_censoring.txt` | 0 | n/a | n/a | n/a | failed |
| `stage5_sparse_history.txt` | 0 | n/a | n/a | n/a | failed |
| `stage5_stable_periodic.txt` | 10 | 0.105 | 0.3088 | [-0.0632, -0.0359] | failed |
| `stage5_supersession_and_censoring.txt` | 0 | n/a | n/a | n/a | failed |

Synthetic fixtures validate implementation mechanics and gate behavior. They do not establish general predictive validity and do not unlock product forecasts.

## Local Verification

Run on June 20, 2026 with Node 22 for npm commands:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; reported existing audit warnings: 1 moderate and 1 critical vulnerability. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm run test` | Passed; forecasting research sub-suite reports 13 tests. |
| `npm run test:parity` | Passed for 21 parity fixtures. |
| `npm run test:forecast-parity` | Passed for 10 forecasting fixtures. |
| `npm run forecast:eval` | Passed for 10 forecasting fixtures. |
| `npm run build` | Passed; Next emitted the existing ESLint-plugin warning. |
| `python -m pip install -e ".[dev]"` | Passed. |
| `python -m pytest` | Passed, 38 tests. |
| `python -m chatsense_ml.forecasting.evaluate` | Passed for 10 forecasting fixtures. |
| `npx cap sync android` | Passed. |
| `android\gradlew.bat test` from `android/` | Passed; Gradle emitted unchecked/unsafe Java operation notes. |
| `android\gradlew.bat assembleDebug` from `android/` | Passed; Gradle emitted unchecked/unsafe Java operation notes. |
| `git diff --check` | Passed; Windows line-ending warnings only. |

Debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
7043478 bytes
```
