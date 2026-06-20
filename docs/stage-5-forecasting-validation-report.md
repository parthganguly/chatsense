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

Baselines are global, participant, recent, previous-value, historical-mean, and rolling-mean estimators depending on task.

Candidates are transparent smoothed estimators. No black-box model is promoted.

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
npm run forecast:eval
python -m chatsense_ml.forecasting.evaluate
```

Both commands write generated reports under `artifacts/forecasting/`, which is ignored by git.

## Local Verification

Run on June 20, 2026 with Node 22 for npm commands:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; reported existing audit warnings: 1 moderate and 1 critical vulnerability. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm run test` | Passed. |
| `npm run test:parity` | Passed for 21 parity fixtures. |
| `npm run forecast:eval` | Passed for 25 fixtures. |
| `npm run build` | Passed; Next emitted the existing ESLint-plugin warning. |
| `python -m pip install -e ".[dev]"` | Passed. |
| `python -m pytest` | Passed, 28 tests. |
| `python -m chatsense_ml.forecasting.evaluate` | Passed for 25 fixtures. |
| `npx cap sync android` | Passed. |
| `android\gradlew.bat -p android test` | Passed. |
| `android\gradlew.bat -p android assembleDebug` | Passed. |
| `npm run android:build` | Passed after hardening the script to call local binaries directly. |
| `git diff --check` | Passed; Windows line-ending warnings only. |

Debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
7066115 bytes
```
