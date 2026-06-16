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
npm run build
npm run check
```

`npm run typecheck` typechecks `@chatsense/core` independently before checking the app.

`npm run test` runs focused TypeScript boundary tests for imports, ZIP/TXT handling, Android event conversion, listener cleanup, package-boundary imports, and UI/core separation.

`npm run test:parity` compares the TypeScript runtime with the nine shared expected parity outputs.

## Python Reference

```bash
python -m pytest
```

Python is the research/reference implementation. It is not bundled into Android.

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

## Source Boundaries

- Core logic goes in `packages/chatsense-core/src`.
- Import orchestration goes in `features/import`.
- Android shared-file handling goes in `platform/android`.
- Presentation-only screens go in `features/overview`, `features/rhythm`, and `features/people`.
- Reusable presentation components go in `components/analytics` and `components/navigation`.
