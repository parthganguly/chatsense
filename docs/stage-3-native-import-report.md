# Stage 3 Native Import Report

## Scope

Stage 3 replaces the Android whole-file JavaScript injection bridge with a first-party Capacitor native import path.

Included:

- Android `SharedFile` Capacitor plugin.
- App-private cached shared-file import path.
- TypeScript adapter that converts native cache URIs into browser `File` objects.
- Cleanup through `releaseSharedFile()`.
- Native manager unit tests and TypeScript lifecycle tests.

Not included:

- React Native or Expo.
- UI redesign.
- Python in Android.
- LLMs, auth, telemetry, analytics, cloud storage, or backend services.

## Runtime Flow

```text
WhatsApp/File Manager share
  Android ACTION_SEND or ACTION_VIEW intent
  content:// provider URI
  MainActivity forwards intent to SharedFilePlugin
  SharedFilePlugin validates MIME/extension and size
  SharedFilePlugin streams file into app-private cache
  sharedFileAvailable retained Capacitor event or getPendingSharedFile()
  platform/android/sharedFileBridge.ts fetches Capacitor local file URL
  existing useChatImport() path parses TXT/ZIP and calls @chatsense/core
  releaseSharedFile() deletes the cached native copy
```

## Native Cache

Cached imports are stored under:

```text
cache/chatsense-shared-imports/
```

The cache entry name is collision-safe because it is prefixed with a generated UUID. Display names are sanitized and kept only as import metadata. The plugin prunes stale files older than 24 hours on load.

## Validation

The native plugin accepts WhatsApp-style imports:

- `.zip` with `application/zip`, `application/x-zip-compressed`, or generic provider MIME.
- `.txt` with `text/plain` or generic provider MIME.
- `application/octet-stream` only when the filename extension is supported.

The native stream copy enforces a 50 MB limit. Oversized partial copies are deleted.

## Error Codes

- `missing_uri`: the share intent did not include an accessible file URI.
- `unsupported_file`: the file extension or MIME type is not a supported WhatsApp export.
- `file_too_large`: the import exceeded the native size limit.
- `copy_failed`: native could not copy the provider stream into app-private cache.
- `file_unavailable`: JavaScript could not fetch the cached local file URI.

## Cleanup Guarantees

JavaScript calls `releaseSharedFile({ id })` in a `finally` block after converting the native cache URI and after the downstream import handler finishes or fails. If release is missed because of process shutdown, plugin load prunes stale cached imports.

## Current Verification Checklist

Required local checks for this stage:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:parity
npm run build
python -m pip install -e ".[dev]"
python -m pytest
npx cap sync android
cd android
./gradlew test
./gradlew assembleDebug
git diff --check
git status --short
```

Physical device testing should follow `docs/android-share-import-testing.md`.
