# ChatSense

ChatSense is a local-first WhatsApp export analyzer. The current app is a Next.js static shell wrapped by Capacitor for Android, with behavioral parsing and analytics provided by the internal `@chatsense/core` workspace package.

Overview, Changes, People, and Rhythm each begin with a compact human takeaway card — one plain-language read of what the export looks like, with a confidence label and evidence bullets — followed by a deterministic, evidence-backed plain-English summary. Findings are derived from existing timing and volume metrics, carry supporting values or sample counts, and state when an export is too limited for a comparison. The narrative highlights measured change, contact maintenance, participant balance, pause context, and the blocked forecasting gate without interpreting message content or inferring motives.

Python remains a local research/reference implementation and is not bundled into Android.

## Importing a chat

ChatSense analyzes a local WhatsApp `.txt` export (or the exported ZIP). In
WhatsApp: open the chat, tap the menu / More, choose **Export chat**, pick
**Without media** (recommended — only the text is read), then select the file
in ChatSense. Analysis runs locally in the app: no upload, no account, no
backend, no telemetry. Only import chats you have permission to analyze.

The onboarding screen also offers **Try demo export**, which loads a committed
synthetic fixture (`fixtures/whatsapp/stage4_increasing_initiation.txt`,
embedded as `features/import/demoExport.ts`) through the same import pipeline,
so a new user can see Overview, Changes, People, and Rhythm without importing
a real chat. The demo contains no real people or messages. ChatSense shows
observable patterns only — it does not read minds, infer motive or
relationship status, give advice, or predict replies. See
docs/onboarding-import.md.

## Install

```bash
npm ci
python -m pip install -e ".[dev]"
```

## Web Development

```bash
npm run dev
```

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run test:parity
npm run test:forecast-parity
npm run forecast:eval
python -m pytest
python -m chatsense_ml.forecasting.evaluate
```

## Build

```bash
npm run build
```

## Android Debug Build

```bash
npm run build
npx cap sync android
cd android
gradlew assembleDebug
```

Or from the repository root:

```bash
npm run android:build
```

The debug APK is generated under:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Repository Shape

```text
packages/chatsense-core/   production TypeScript behavioral engine
features/import/           browser file import, ZIP/TXT extraction, import orchestration
features/overview/         overview presentation screen
features/changes/          relationship-dynamics change comparison screen
features/rhythm/           rhythm presentation screen
features/people/           people presentation screen
components/analytics/      reusable analytics UI components
components/navigation/     app header and bottom navigation
platform/android/          typed Capacitor shared-file adapter
android/app/src/main/java/com/thegreatparthicle/chatsense/plugins/
                            native Android shared-file import plugin
python/chatsense_ml/       Python research/reference implementation
contracts/                 shared behavioral and report contracts
fixtures/                  shared WhatsApp fixtures and expected parity outputs
```

## Privacy Boundary

Chats are processed locally and are not persisted by the app. There is no LLM, backend, account system, telemetry, or cloud storage in the current runtime.

Android share-sheet imports are copied from the provider `content://` URI into app-private cache by the native `SharedFile` Capacitor plugin. JavaScript receives only metadata plus a local file URI, imports it through the same browser `File` path, and asks native code to release the cached copy after import.

## Forecasting Research

Stage 5 adds a research-only forecasting gate. It backtests turn-based reply opportunities and completed adaptive-window activity against simple baselines, then keeps product forecasting blocked unless conservative gates pass on appropriate validation data.

The current product status is not validated. The app may show research counts and gate status, but it does not show live predictions, coaching, motive claims, sentiment analysis, embeddings, LLM output, telemetry, or remote processing.

Dedicated Stage 5 synthetic fixtures live under `fixtures/forecasting/` with a manifest at `fixtures/forecasting/manifest.json`. They validate implementation mechanics, TypeScript/Python parity, censoring, calibration reporting, bootstrap/subgroup gates, and product-blocking behavior; they do not prove forecasting works on real relationships.
