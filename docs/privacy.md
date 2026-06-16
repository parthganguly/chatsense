# ChatSense Privacy

ChatSense is designed as a local-first analyzer for WhatsApp exports.

## Local Processing

- Chat exports are parsed in the app runtime on the device or local browser.
- The current app does not upload chats.
- The current app does not require an account.
- The current app does not persist imported chat content.
- The current app does not call an LLM, backend, telemetry service, or cloud storage API.

## Android Share Sheet

The Android app accepts shared WhatsApp export files through Capacitor. The native bridge currently reads the shared file and passes the whole file to the WebView as Base64.

This bridge is isolated behind:

```text
platform/android/sharedFileBridge.ts
```

The Base64 bridge is a known temporary limitation. It should be replaced later with a dedicated native file-access plugin or streaming import path in a separate task.

## Safety Language

ChatSense reports observable communication patterns only. Reply delays, silence gaps, sender balance, and activity rhythms are not proof of hidden intent, mental-health status, or relationship status.

## Android Configuration

The Android app should remain local-only:

- no `INTERNET` permission;
- `android:allowBackup="false"`;
- FileProvider paths limited to app-controlled `shared/` cache/files paths;
- accepted MIME types limited to WhatsApp-style ZIP/TXT imports and the Android share-sheet fallback MIME used by file providers.
