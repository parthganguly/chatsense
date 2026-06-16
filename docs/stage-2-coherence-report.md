# Stage 2 Coherence Report

## Starting SHA

`d8ab3a4c41d808be7bf190ae6abf96f1ea3e32e5`

## Final SHA

The exact final branch SHA is reported in the PR and final handoff. A file cannot contain the cryptographic hash of the commit that contains itself.

## Workspace Decision

The repository uses npm workspaces. `packages/chatsense-core` is the internal `@chatsense/core` package and is declared as an application dependency. The app no longer relies on TypeScript path aliases to resolve the core package.

## Final Repository Structure

```text
app/page.tsx
features/import/
features/overview/
features/rhythm/
features/people/
components/analytics/
components/navigation/
platform/android/
packages/chatsense-core/
python/chatsense_ml/
contracts/
fixtures/
```

## Files Moved, Removed, And Retained

- Moved in Stage 1 and retained: parser, analyzer, contract constants, and parity normalizer under `packages/chatsense-core/src`.
- Removed in Stage 2: duplicate `utils/cn.ts`; stale `pnpm-lock.yaml`; old generated Android test package paths.
- Retained: Next.js/Capacitor shell, all nine shared fixtures, expected parity JSON, Python research/reference package, Android Base64 bridge behavior.

## Android Hardening Completed

- `android:allowBackup` is `false`.
- No `INTERNET` permission is declared.
- FileProvider paths remain limited to app-controlled `shared/` cache/files paths.
- `onCreate` and `onNewIntent` use the same dispatch path.
- Native import failures dispatch a typed web error event.
- JavaScript bridge handling is isolated in `platform/android/sharedFileBridge.ts`.
- Android unit/instrumentation test packages now use `com.thegreatparthicle.chatsense`.

## Tests Added

- Package-boundary import of `@chatsense/core`.
- Independent core typechecking via `npm run test:core`.
- TXT import.
- WhatsApp TXT selection from ZIP.
- ZIP-without-TXT failure.
- Unsupported file failure.
- Android shared-file event conversion.
- Android native-error event conversion.
- Shared-file listener cleanup.
- Import orchestration through the core parser/analyzer.
- Source guard for duplicated behavioral calculations in UI modules.

## CI Workflow Added

`.github/workflows/ci.yml` runs npm, TypeScript, parity, build, Python, Capacitor sync, Gradle test, and Gradle debug assembly gates.

## Commands Actually Run

- `npm view vaul version peerDependencies`: latest `vaul` is `1.1.2` and supports React 19.
- `npm install vaul@^1.1.2`: passed; updated the incompatible React peer dependency from `vaul@0.9.9`.
- `npm ci`: passed; clean npm workspace install completed.
- `npm run lint`: passed.
- `npm run typecheck`: passed; includes `npm run test:core`.
- `npm run test`: passed.
- `npm run test:parity`: passed.
- `npm run build`: passed.
- `python -m pip install -e ".[dev]"`: passed.
- `python -m pytest`: passed.
- `npx cap sync android`: passed.
- `cd android && ./gradlew test`: passed.
- `cd android && ./gradlew assembleDebug`: passed.
- `npm run android:build`: first run failed during `next build` with a stale `.next` cache dumping bundled webpack output; `.next` was deleted and the command was rerun successfully.
- `git diff --check`: passed.
- `git status --short`: showed only the expected Stage 2 file changes before committing.

## Exact Test Results

- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
- `npm run test`: `Import and boundary tests passed.`
- `npm run test:parity`: `TypeScript parity passed for 9 fixtures.`
- `npm run build`: Next.js static export completed successfully.
- `python -m pytest`: 20 passed.
- `./gradlew test`: exit 0.
- `./gradlew assembleDebug`: `BUILD SUCCESSFUL`.
- `npm run android:build`: rerun after clearing stale `.next` completed with `BUILD SUCCESSFUL`.
- `git diff --check`: exit 0.

## Generated APK

Path:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Size: `7021620` bytes (`6.70 MB`).

## Remaining Risks

- `@chatsense/core` exports TypeScript source directly. This is sufficient for Next.js with `transpilePackages`, Node tests via `tsx`, and the current Android build, but a later React Native/Metro consumer will need equivalent workspace/source transpilation support or a small build output.
- The Android bridge still sends whole-file Base64 payloads through the WebView.
- Local verification used Node `v21.6.2`; npm reports engine warnings for packages that prefer Node 20 or 22+. CI uses Node 22.
- `npm ci` reports two npm audit findings and warns that `next@15.2.4` is deprecated for a security vulnerability. Upgrading Next should be handled as a separate dependency-hardening task because this stage intentionally avoided framework upgrades.

## Explicitly Deferred Base64 Bridge Replacement

Replacing the whole-file Base64 bridge is deferred to a separate isolated task. This stage only isolates, types, and hardens the existing bridge.

## Recommended Stage 3 Task

Replace the Android whole-file Base64 bridge with a native file-access path that avoids injecting full export contents into the WebView JavaScript context, then add device-level regression coverage for WhatsApp share-sheet imports.
