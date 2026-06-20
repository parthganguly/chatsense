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
npm run forecast:eval
npm run build
npm run check
```

`npm run typecheck` typechecks `@chatsense/core` independently before checking the app.

`npm run test` runs focused TypeScript boundary tests for imports, ZIP/TXT handling, Android native shared-file conversion, pending/warm share dedupe, release cleanup, package-boundary imports, and UI/core separation.

`npm run test:parity` compares the TypeScript runtime with the 21 shared expected parity outputs.

`npm run forecast:eval` runs the Stage 5 TypeScript forecasting research gate over committed synthetic fixtures and writes ignored artifacts under `artifacts/forecasting/`.

## Python Reference

```bash
python -m pytest
python -m chatsense_ml.forecasting.evaluate
```

Python is the research/reference implementation. It is not bundled into Android.

The Python forecasting evaluator mirrors the TypeScript research gate and writes ignored artifacts under `artifacts/forecasting/`.

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
