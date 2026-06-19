# ChatSense Runtime Boundaries

ChatSense has one shipped behavioral engine and one research/reference implementation.

- **`@chatsense/core` is the production behavioral engine.** It owns WhatsApp text parsing, date-order inference, behavioral calculations, shared analysis types, deterministic insights, contract constants, and parity normalization.
- **Next.js/Capacitor is the current application shell.** It owns React UI, browser file handling, ZIP extraction, safe import errors, and Android share-sheet orchestration through the native `SharedFile` plugin.
- **Python is research/reference only.** `python/chatsense_ml` owns offline analytics, parquet output, notebooks, classical ML experiments, and the Python parity reference. Python is not bundled into Android.
- **Contracts and fixtures prevent drift.** `contracts/behavioral_contract.json`, `contracts/report.schema.json`, `fixtures/whatsapp`, and `fixtures/expected` define behavior both implementations must preserve.

The mobile app remains local-only: imported chats are processed in memory, not uploaded, not persisted by the app, and not analyzed by an LLM.

## Promotion Rule

New behavioral definitions should start in Python when they need pandas, notebooks, or research iteration. A metric is only considered shipped when it is:

1. Defined in `contracts/behavioral_contract.json` or `docs/data_contract.md`.
2. Implemented in `@chatsense/core`.
3. Covered by shared parity fixtures.

Forward-looking labels, sklearn models, survival analysis, anomaly experiments, and notebook visualizations are research-only unless they go through that promotion path.

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
