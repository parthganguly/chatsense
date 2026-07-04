# ChatSense Development

## Install

```bash
npm ci
python -m pip install -e ".[dev]"
```

Use npm as the JavaScript package manager. The repository is configured as an npm workspace with `packages/chatsense-core`.

## Web Development

```bash
npm run dev
```

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
npm run test:parity
npm run test:forecast-parity
npm run forecast:eval
npm run build
npm run check
```

`npm run typecheck` typechecks `@chatsense/core` independently before checking the app.

`npm run test` runs focused TypeScript boundary tests for imports, ZIP/TXT handling, Android native shared-file conversion, pending/warm share dedupe, release cleanup, package-boundary imports, UI/core separation, and the Stage 6 narrative matrix.

`tests/insight-narrative.ts` covers twelve named Stage 6 cases, verifies that all
four analytics tabs place narrative before raw evidence, and scans every
committed WhatsApp fixture. `tests/helpers/narrative-safety.ts` is the central
high-risk-language policy for generated headlines, summaries, finding titles,
evidence text, limitations, and guardrails.

`npm run test:parity` compares the TypeScript runtime with the 21 shared expected parity outputs.

`npm run test:forecast-parity` compares the TypeScript and Python Stage 5 forecasting gates over the dedicated synthetic forecasting fixture matrix.

`npm run forecast:eval` runs the Stage 5 TypeScript forecasting research gate over committed synthetic fixtures and writes ignored schema-shaped artifacts under `artifacts/forecasting/`.

## Python Reference

```bash
python -m pytest
python -m chatsense_ml.forecasting.evaluate
```

Python is the research/reference implementation. It is not bundled into Android.

The Python forecasting evaluator mirrors the TypeScript research gate, validates the strict report schema in tests, and writes ignored artifacts under `artifacts/forecasting/`.

## Android

```bash
npm run build
npx cap sync android
cd android
./gradlew test
./gradlew assembleDebug
```

On Windows PowerShell, `gradlew test` and `gradlew assembleDebug` work from the `android` directory.

The convenience script:

```bash
npm run android:build
```

builds the web shell, syncs Capacitor, and assembles the debug APK.

The debug APK path is:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

For physical device share-sheet verification, see `docs/android-share-import-testing.md`.

## Source Boundaries

- Core logic goes in `packages/chatsense-core/src`.
- Import orchestration goes in `features/import`.
- Android shared-file handling is split between `platform/android` for the TypeScript adapter and `android/app/src/main/java/com/thegreatparthicle/chatsense/plugins` for the native Capacitor plugin.
- Presentation-only screens go in `features/overview`, `features/rhythm`, `features/people`, and `features/changes`.
- Reusable presentation components go in `components/analytics` and `components/navigation`.
- Forecasting validation code must stay local, deterministic, content-independent, and gated by `contracts/forecasting_contract.json`.
- Forecasting benchmark reports must conform to `contracts/forecasting_report.schema.json`.
