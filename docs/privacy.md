# ChatSense Privacy

ChatSense is designed as a local-first analyzer for WhatsApp exports.

## Local Processing

- Chat exports are parsed in the app runtime on the device or local browser.
- The current app does not upload chats.
- The current app does not require an account.
- The current app does not persist imported chat content.
- The current app does not call an LLM, backend, telemetry service, or cloud storage API.

## Android Share Sheet

The Android app accepts shared WhatsApp export files through a first-party Capacitor plugin. The plugin reads the provider `content://` stream and copies supported ZIP/TXT files into app-private cache:

```text
cache/chatsense-shared-imports/
```

The WebView receives only metadata and a local file URI, then imports the file through the same in-memory browser `File` path used by manual selection. After import, the JavaScript adapter asks native code to delete the cached copy. Stale cached files are pruned on plugin load.

The bridge is isolated behind:

```text
platform/android/sharedFileBridge.ts
android/app/src/main/java/com/thegreatparthicle/chatsense/plugins/SharedFilePlugin.java
```

The app does not request broad file storage permissions. FileProvider remains limited to app-controlled `shared/` paths for testing and future app-owned sharing.

## Safety Language

ChatSense reports observable communication patterns only. Reply delays, silence gaps, sender balance, and activity rhythms are not proof of hidden intent, mental-health status, or relationship status.

## Forecasting Research

Stage 5 forecasting validation stays local and deterministic. It backtests observable timing and volume outcomes from earlier observable behavior, but the current app does not promote live predictions.

Forecasting research does not use message meaning, sentiment analysis, embeddings, LLMs, personality inference, motive inference, coaching, telemetry, backend calls, or cloud processing.

Synthetic fixtures validate correctness of the method, not real-world predictive validity.

## Android Configuration

The Android app should remain local-only:

- no `INTERNET` permission;
- `android:allowBackup="false"`;
- FileProvider paths limited to app-controlled `shared/` cache/files paths;
- accepted MIME types limited to WhatsApp-style ZIP/TXT imports and the Android share-sheet fallback MIME used by file providers.
