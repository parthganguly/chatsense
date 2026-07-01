# ChatSense Runtime Boundaries

ChatSense has one shipped behavioral engine and one research/reference implementation.

- **`@chatsense/core` is the production behavioral engine.** It owns WhatsApp text parsing, date-order inference, behavioral calculations, shared analysis types, deterministic insights, contract constants, and parity normalization.
- **The evidence-backed narrative is core output.** The Android UI renders `ChatAnalysis.narrative`; it does not invent, reorder, or embellish findings. Narrative text is deterministic and derived only from existing observable metrics.
- **Next.js/Capacitor is the current application shell.** It owns React UI, browser file handling, ZIP extraction, safe import errors, and Android share-sheet orchestration through the native `SharedFile` plugin.
- **Python is research/reference only.** `python/chatsense_ml` owns offline analytics, parquet output, notebooks, classical ML experiments, and the Python parity reference. Python is not bundled into Android.
- **Contracts and fixtures prevent drift.** `contracts/behavioral_contract.json`, `contracts/report.schema.json`, `fixtures/whatsapp`, and `fixtures/expected` define behavior both implementations must preserve.
- **Forecasting remains behind a research gate.** `contracts/forecasting_contract.json` defines leakage-safe evaluation and promotion gates. `contracts/forecasting_report.schema.json` defines the benchmark artifact shape. Passing a method gate is not enough to show product forecasts.

The mobile app remains local-only: imported chats are processed in memory, not uploaded, not persisted by the app, and not analyzed by an LLM.

## Relationship Dynamics Boundary

Stage 4 adds descriptive relationship-dynamics summaries to `@chatsense/core`.
These summaries split the exported message history into adaptive calendar
windows, build conversational turns, and compare eligible early/late and
recent/prior periods with metric-specific sample checks. They summarize
observable changes in:

- messages per active day;
- participant turn share;
- median sender-switch reply timing;
- thread-start share;
- reconnection share after 24-hour pauses;
- follow-up-before-reply rate.

Notable-change thresholds are contract-owned: 30% for messages per active day,
10 percentage points for turn share, 15 percentage points for thread-start
share and follow-up rate, 20 percentage points for reconnection share, and for
reply latency both a 2x ratio and a 10-minute absolute change.

These comparisons are not predictions and do not inspect message meaning. They
must not be described as proof of motive, affection, attachment, personality,
mental health, relationship quality, or relationship status.

## Promotion Rule

New behavioral definitions should start in Python when they need pandas, notebooks, or research iteration. A metric is only considered shipped when it is:

1. Defined in `contracts/behavioral_contract.json` or `docs/data_contract.md`.
2. Implemented in `@chatsense/core`.
3. Covered by shared parity fixtures.

Forward-looking labels, sklearn models, survival analysis, anomaly experiments, and notebook visualizations are research-only unless they go through that promotion path.

## Forecasting Research Boundary

Stage 5 adds deterministic forecasting validation to TypeScript and Python.

Allowed tasks:

- reply within 1h, 6h, or 24h from a turn-based reply opportunity;
- conditional delay bucket among observed responses;
- next completed adaptive-window activity.

The runtime may show research gate status and sample counts. It must not show live forecasts or response recommendations. Forecasting uses no message content, sentiment, embeddings, LLMs, personality inference, motive inference, remote processing, telemetry, neural nets, React Native, or Expo code.

Stage 6 remains outside forecasting. A narrative finding can describe a past
change only when Stage 4 marks it notable with sufficient evidence. It cannot
state or imply what will happen next. Overview's evidence labels and safety
language are part of the product contract, not optional UI decoration.

The current status is not validated for product use.

Stage 5 reply opportunities are closed by the first valid future event: observed different-participant response, same-sender new-thread supersession, or export end. Superseded opportunities are censored for horizons that have not elapsed, preventing later responses from being attached to stale source turns.

Cross-language forecasting parity is enforced with `npm run test:forecast-parity`, and synthetic benchmark reports are generated with `npm run forecast:eval` and `python -m chatsense_ml.forecasting.evaluate`.

## Import Boundary

The import feature owns browser `File` handling, TXT reading, ZIP extraction, file validation, loading state, safe errors, and calling `parseWhatsAppChat()` plus `analyzeChat()`.

Screens and UI components receive already-computed `ChatAnalysis` values. They may format or visualize values, but they must not independently calculate behavioral metrics.

## Android Boundary

The Android native boundary owns only file access and lifecycle mechanics:

- `MainActivity` registers `SharedFilePlugin` and forwards share intents.
- `SharedFilePlugin` accepts Android share/view `content://` URIs, validates supported ZIP/TXT inputs, copies the stream into app-private cache, emits retained Capacitor events, and exposes `getPendingSharedFile()` for startup races.
- `platform/android/sharedFileBridge.ts` converts the native cache URI with `Capacitor.convertFileSrc()`, fetches it into a browser `File`, calls the existing import path, then calls `releaseSharedFile()` in a cleanup path.
- Native cache is best-effort released after import and also pruned on plugin load if stale.

Android must not compute behavioral analytics. It must not use Python, an LLM, a backend, telemetry, broad storage permissions, or direct WebView code injection for shared file contents.
