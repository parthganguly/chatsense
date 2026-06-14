# React Native File Import Notes

ChatSense mobile uses `expo-document-picker` for user-selected files and the
modern `File` API from `expo-file-system` for local reads. The picker uses
`copyToCacheDirectory: true` because Expo documents that immediate reads through
`expo-file-system` may otherwise fail for picked documents. The app treats that
copy as temporary and deletes it after analysis.

ZIP handling uses `fflate` instead of `JSZip` because the mobile path only needs
to read `Uint8Array` bytes and extract one WhatsApp `.txt` entry. `fflate` has an
unzip filter, so ChatSense can inspect every entry name for unsafe paths while
extracting only candidate text exports and skipping attachments.

The mobile import path must not use Base64 strings, WebView JavaScript
injection, cloud upload, or persistent storage of imported chats.
