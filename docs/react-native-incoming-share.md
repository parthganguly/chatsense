# React Native Incoming Share Notes

The legacy Capacitor app accepted WhatsApp exports through Android
`ACTION_SEND` and `ACTION_VIEW`. The React Native migration preserves that
behavior with a local Android Expo module under
`mobile/modules/chatsense-share-intent`.

Expo's first-party `expo-sharing` incoming-share support was reviewed first. It
adds Android share intent filters and exposes shared payloads, but it does not
cover the legacy `ACTION_VIEW` open-with path, and its Android resolver treats
`text/plain` shares as text payloads rather than file streams. ChatSense needs
both `.zip` and `.txt` files through share and open-with flows, so a small local
module is used instead.

The module does not parse chats and does not duplicate analytics. Native code
only:

- receives `ACTION_SEND` and `ACTION_VIEW` intents;
- reads display name, MIME type, and size metadata;
- copies the granted content URI to a temporary cache file;
- sends a local `file://` URI to TypeScript;
- marks the cache file as `deleteAfterRead`.

The TypeScript import adapter then reads the file, validates TXT/ZIP content,
parses with `@chatsense/core`, and deletes the temporary file in `finally`.

No Base64 bridge, WebView injection, cloud upload, persistent chat storage, or
Kotlin analytics logic is used in the React Native path.
