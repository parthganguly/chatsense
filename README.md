# ChatSense

ChatSense is a local-first WhatsApp export analyzer. The current app is a Next.js static shell wrapped by Capacitor for Android, with behavioral parsing and analytics provided by the internal `@chatsense/core` workspace package.

Python remains a local research/reference implementation and is not bundled into Android.

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
python -m pytest
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
features/dynamics/         relationship-dynamics phase comparison screen
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
