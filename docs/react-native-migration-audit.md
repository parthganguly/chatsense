# ChatSense React Native Migration Audit

Date: 2026-06-14
Branch: `migration/react-native`
Base branch: `architecture/ts-python-contract`
Base SHA: `ad848ea1b8ee781e280cd18c91f22bcb2ed21d61`

This audit records the migration surface before implementation. The existing
Next.js + Capacitor application must remain functional until the Expo React
Native APK is built, installed on a physical Android phone, and approved for
cutover.

## Product Boundary

ChatSense is moving to an Android-first Expo React Native application. The
mobile runtime remains TypeScript, local-only, non-LLM, accountless, telemetry
free, and cloud free. Python remains an offline research/reference package and
is never bundled in Android.

The canonical behavioral contract remains `contracts/behavioral_contract.json`.
Shared fixtures remain in `fixtures/whatsapp`, and golden expected parity
outputs remain in `fixtures/expected`.

## Current Application Metadata

| Item | Current value |
| --- | --- |
| App name | `ChatSense` |
| Android package/application ID | `com.thegreatparthicle.chatsense` |
| Android namespace | `com.thegreatparthicle.chatsense` |
| Android versionCode | `1` |
| Android versionName | `1.0` |
| Capacitor webDir | `out` |
| Next mode | Static export via `output: "export"` |
| Main launch activity | `com.thegreatparthicle.chatsense.MainActivity` |

## Supported Imports Today

The current web picker accepts `.zip`, `.txt`, `application/zip`, and
`text/plain`. The Android manifest accepts incoming `ACTION_SEND` and
`ACTION_VIEW` content with these MIME types:

- `application/zip`
- `application/x-zip-compressed`
- `text/plain`
- `application/octet-stream`

The current Android incoming bridge reads the whole content URI into memory,
Base64-encodes the file, and injects a `chatsense-shared-file` `CustomEvent`
into the WebView. This behavior must be replaced with a URI/file-handle based
Expo path that does not pass whole files as Base64.

## Current Data Flow

```text
Android ACTION_SEND/ACTION_VIEW or browser file picker
-> file bytes
-> ZIP/TXT extraction
-> parseWhatsAppChat()
-> analyzeChat()
-> React state
-> Overview, Rhythm, People screens
```

The browser picker path uses `File.text()` for raw `.txt` exports and
`JSZip.loadAsync(await file.arrayBuffer())` for `.zip` exports. ZIP selection
prefers `_chat.txt`, then files starting with `whatsapp chat`, then any `.txt`.

The Android incoming path currently uses:

```text
content URI
-> MainActivity.readAllBytes()
-> Base64 string
-> evaluateJavascript(CustomEvent)
-> app/page.tsx base64ToBuffer()
-> File object
-> same JSZip/TXT import path
```

## Screens And Runtime State

The current client state is stored in memory inside `app/page.tsx`:

- `screen`: `import`, `overview`, `rhythm`, or `people`
- `messages`: parsed `ChatMessage[]`
- `analysis`: computed `ChatAnalysis`
- `sourceName`
- `isLoading`
- `error`

Current screens:

- Import: local explanation, hidden browser file input, error display, loading
  state, privacy framing.
- Overview: headline metrics, observable insights, reply horizon rates,
  coverage and scope note.
- Rhythm: recent trend, thread count, peak time, night message rate, last
  30-day bars, silence and reply timing details.
- People: participant contribution bars and reply edge list.

The React Native app should add a small Privacy/About screen because the
migration request makes that screen explicit.

## User-Visible Metrics To Preserve

Overview:

- Message count
- Participant count where shown by context
- Active days
- Total words where shown or summarized
- Average messages per active day where shown or summarized
- Median reply time
- Longest silence
- Observable insights
- Reply within 1 hour, 6 hours, and 24 hours
- Export coverage dates

Rhythm:

- Reply count
- Average reply time
- Median reply time
- Quick reply rate
- Reply-within-horizon rates
- Longest observed gap
- Unusual silence count
- Chat-specific unusual silence threshold
- Peak hour
- Peak weekday
- Night message rate
- Recent activity trend
- Thread count
- Daily or weekly activity visualization

People:

- Participant message count
- Message share
- Word count
- Reply count
- Median reply time
- Thread initiation count
- Directed reply edges from responder to previous sender

Privacy/safety framing:

- Analysis remains local.
- No upload, account, telemetry, LLM, cloud processing, or diagnosis.
- Imported chats are kept only in memory by the app.
- Observed communication patterns are not proof of hidden intent.
- Exported messages are partial context, not full relationship context.

## 1. Pure TypeScript Logic Reusable Unchanged

- `lib/chat-parser.ts`: WhatsApp TXT parser, whole-export date-order inference,
  multiline message support, sender extraction, sender filtering.
- `lib/chat-analyzer.ts`: overview metrics, participants, reply dynamics,
  runtime silence anomaly, activity, reply graph, thread starts, insights, and
  formatting helper.
- `lib/contract.ts`: plain TypeScript constants that mirror
  `contracts/behavioral_contract.json`.
- `lib/parity.ts`: normalized TypeScript parity output for exact comparison
  against `fixtures/expected/*.json`.
- `tests/parity.ts`: Node parity harness, after import paths are updated to the
  shared package.

These files contain no React, React Native, Next.js, browser DOM, Capacitor, or
Node-only runtime dependency in the core logic. They should be extracted to
`packages/chatsense-core` and consumed by both legacy web and mobile.

## 2. Pure TypeScript Logic Needing Small Platform-Independent Changes

- Core imports should move from relative `./contract` style to package-local
  imports inside `packages/chatsense-core`.
- Legacy app imports should consume `@chatsense/core` rather than owning the
  behavioral logic under `lib/`.
- `tests/parity.ts` should import from `@chatsense/core`.
- `formatDuration` may remain in core because it is platform-neutral and already
  part of display behavior, but UI-specific number/date formatting can stay in
  platform layers.

No formula changes are expected.

## 3. Web-Only UI To Rebuild

- `app/page.tsx`: React DOM client component, browser `File` APIs, `window`
  event listener, `window.atob`, hidden HTML file input, Tailwind class layout,
  and lucide web icons.
- `app/layout.tsx`: Next layout, Next fonts, metadata, web viewport shell, and
  browser document structure.
- `app/globals.css`, `styles/globals.css`, `tailwind.config.ts`,
  `postcss.config.mjs`: web CSS pipeline.
- `components/ui/**`: shadcn/Radix web components.
- `hooks/use-mobile.ts`, `components/ui/use-mobile.tsx`, and sidebar helpers:
  browser `window`/`document` usage.
- `components/theme-provider.tsx`: Next/web theme provider.

React Native should rebuild the surface with `SafeAreaView`, `View`, `Text`,
`ScrollView`, `Pressable`, `ActivityIndicator`, and `StyleSheet`.

## 4. Capacitor And Native Bridge Code To Replace

- `capacitor.config.ts`: Capacitor app configuration.
- `android/app/src/main/AndroidManifest.xml`: current Capacitor activity,
  ACTION_SEND/ACTION_VIEW filters, and FileProvider declaration.
- `android/app/src/main/java/com/thegreatparthicle/chatsense/MainActivity.java`:
  WebView bridge, Base64 import path, and injected JavaScript event.
- `android/app/src/main/res/xml/file_paths.xml`: narrowed legacy FileProvider
  paths.
- `android/**`: legacy Capacitor Gradle project. Keep it intact until phone
  approval.

Expo must preserve the package ID, app name, icons, splash identity, versioning
strategy, and incoming file behavior. Native changes should be reproducible
through config plugins or local modules and survive `npx expo prebuild --clean`.

## 5. Dependencies Reusable During Migration

- `react`: needed by both legacy app and Expo, although versions may differ by
  workspace.
- `typescript`, `tsx`, ESLint packages: reusable root tooling.
- `zod`: reusable if schema validation remains in TS tooling, though not needed
  by the core formulas today.
- Python package dependencies stay in `pyproject.toml` as research/reference
  tooling.

## 6. Dependencies To Replace Or Eventually Remove

Keep legacy dependencies until the physical-phone cutover gate passes, but do
not port them into mobile:

- Replace `next`, `react-dom`, `@capacitor/*`, `jszip`, `recharts`,
  `framer-motion`, Radix/shadcn packages, Tailwind web packages, and
  `lucide-react` for mobile.
- Use Expo-generated React Native dependencies in `mobile/`.
- Use official Expo file APIs for picking/reading local files.
- Replace `JSZip` with a smaller React Native compatible ZIP reader that works
  on `Uint8Array` and does not require Node polyfills.
- Use npm only. `pnpm-lock.yaml` is a stale alternate lockfile and should be
  removed in a later tooling/chore commit after npm workspace layout is stable.

## 7. Assets To Preserve

Current assets to carry forward:

- `public/logo.png`
- Android launcher icons under `android/app/src/main/res/mipmap-*`
- Adaptive icon background/foreground:
  - `android/app/src/main/res/drawable/ic_launcher_background.xml`
  - `android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml`
- Splash images under `android/app/src/main/res/drawable*`
- App metadata strings:
  - `app_name`: `ChatSense`
  - `title_activity_main`: `ChatSense`
  - `package_name`: `com.thegreatparthicle.chatsense`

Expo assets should be copied into `mobile/assets/` and referenced from
`mobile/app.config.ts` or `mobile/app.json`.

## 8. Existing Functionality To Test Before Cutover

- Legacy Next build still works after shared-core extraction.
- Legacy Capacitor Android build still works before cutover.
- All nine TypeScript parity fixtures pass exactly.
- Python tests still pass.
- React Native picker imports raw `.txt` exports.
- React Native picker imports WhatsApp `.zip` exports.
- ZIP path traversal and archives with no chat text fail safely.
- Empty/malformed TXT exports fail safely.
- Android Share/Open With works for `.txt` and `.zip`.
- Cold-start share intent works.
- Already-open share intent works.
- No chat content persists after closing/reloading unless explicitly changed.
- Final debug APK has no unnecessary storage/media permissions.
- Production-style manifest permissions are inspected before claiming local-only.

## 9. Known Behavior Intentionally Not Migrated

- Browser hidden file input.
- WebView JavaScript injection.
- Whole-file Base64 bridge.
- HTML/CSS/Tailwind layout and shadcn/Radix component structure.
- Recharts/web chart components.
- Framer Motion animation.
- Next font loading.
- Python research labels, sklearn models, survival analysis, anomaly
  experiments, and parquet/report generation in the mobile UI.
- Any persistent storage layer such as AsyncStorage, SQLite, or app database.

## 10. Open Risks

- Expo first-party APIs may not fully cover incoming Android file-share intents.
  If so, a small local Android Expo module or config plugin is required.
- Expo file APIs may need controlled cache copies for some `content://` URIs.
  If required, cleanup must run on success, failure, and cancellation.
- Large ZIP exports can still require multiple in-memory representations if the
  Expo file API and ZIP reader force whole-file buffers. The migration removes
  Base64 and WebView injection first, then measures large synthetic exports.
- Preserving the exact package ID in a generated Expo Android project must be
  verified in the merged manifest.
- Generated Android files must not be hand-patched in a way `expo prebuild`
  erases.
- React and TypeScript versions may need workspace alignment so legacy Next and
  Expo can coexist while sharing `@chatsense/core`.
- The old `pnpm-lock.yaml` conflicts with the npm-only instruction and should be
  removed after npm workspaces are established.

## Migration Manifest

Files to reuse:

- `contracts/behavioral_contract.json`
- `contracts/report.schema.json`
- `fixtures/whatsapp/*.txt`
- `fixtures/expected/*.json`
- `python/chatsense_ml/**`
- `lib/chat-parser.ts`
- `lib/chat-analyzer.ts`
- `lib/contract.ts`
- `lib/parity.ts`
- `tests/parity.ts`
- Existing icon/splash/logo assets

Files to move or wrap:

- Move the behavioral TypeScript implementation into
  `packages/chatsense-core/src/`.
- Keep legacy `lib/*.ts` as thin compatibility wrappers or update legacy imports
  directly to `@chatsense/core`.
- Update `tests/parity.ts` to verify the shared package.

Files to rebuild:

- `mobile/App.tsx`
- `mobile/src/**` screens, import adapter, state reducer, and native share
  listener.
- `mobile/app.config.ts`
- `mobile/plugins/**` if incoming Android share needs a config plugin.
- `mobile/assets/**`

Files eventually removable after phone approval only:

- `app/**`
- `components/**`
- `hooks/**`
- `styles/**`
- `utils/**` if unused after cutover
- `capacitor.config.ts`
- Legacy root Next/Capacitor scripts
- Legacy `android/**`
- Web-only dependencies and lockfile entries
- `pnpm-lock.yaml`

Dependencies to keep:

- `@chatsense/core` workspace package
- TypeScript tooling
- Python research dependencies
- Expo/React Native dependencies inside `mobile/`

Dependencies to replace:

- Replace `JSZip` with a smaller Uint8Array ZIP library for mobile.
- Replace Next/React DOM/Capacitor runtime with Expo React Native.
- Replace Radix/shadcn/Tailwind/Recharts/Framer Motion/lucide web UI with native
  components and simple bars/lists.

Highest-risk migration points:

- Incoming Android share intents without Base64 or WebView.
- Expo content URI reading and cleanup.
- Exact parity after extracting `@chatsense/core`.
- Coexisting legacy Next and mobile Expo dependencies under npm workspaces.
- Verifying final APK permissions and package ID.
