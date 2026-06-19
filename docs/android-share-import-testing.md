# Android Share Import Testing

Use this checklist to verify the Stage 3 native import path on a physical Android device with USB debugging enabled.

## Build And Install

From the repository root:

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Install the debug APK:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Manual Share-Sheet Test

1. Put a WhatsApp export ZIP or TXT file on the device.
2. Open the file in Files, WhatsApp export flow, or another provider-backed app.
3. Use Android share/open-with and choose ChatSense.
4. Confirm ChatSense opens and imports the conversation.
5. Confirm the app shows the normal overview/rhythm/people analytics screens.
6. Repeat while ChatSense is already running to verify warm-intent import.
7. Repeat from a force-stopped app to verify cold-start pending import.

Expected behavior:

- No large Base64 payload is injected into the WebView.
- The native plugin receives a provider URI and copies the stream into private cache.
- The WebView imports a normal browser `File`.
- The cached native copy is released after import.

## ADB Smoke Checks

Confirm a device is visible:

```bash
adb devices
```

Install and launch:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.thegreatparthicle.chatsense/.MainActivity
```

Inspect app cache after a manual share import:

```bash
adb shell run-as com.thegreatparthicle.chatsense ls -la cache/chatsense-shared-imports
```

The directory should be empty shortly after a successful import. If a process was killed mid-import, stale files should be removed the next time the plugin loads after the stale threshold.

## Unsupported File Test

Share a non-WhatsApp file such as a JSON or image file.

Expected behavior:

- ChatSense should show a safe unsupported-file error.
- The native import cache should not retain a copied file.

## Notes

Most real Android providers share `content://` URIs, not raw filesystem paths. Prefer manual share-sheet testing for end-to-end validation because it exercises provider permissions and URI grants in the same way WhatsApp and Files do.
