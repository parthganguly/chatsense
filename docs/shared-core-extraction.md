# Shared Core Extraction Manifest

Base branch: `architecture/ts-python-contract`
Base SHA: `ad848ea1b8ee781e280cd18c91f22bcb2ed21d61`

## Runtime Files Audited Before Extraction

- former parser module
- former analyzer module
- former TypeScript contract constants module
- former TypeScript parity normalizer module
- `tests/parity.ts`
- `contracts/behavioral_contract.json`

## Current Consumers

- `app/page.tsx` composes the current app and imports screens, import orchestration, navigation, and the Android bridge adapter.
- `features/import/useChatImport.ts` imports parser/analyzer functions from `@chatsense/core`.
- `tests/parity.ts` imports contract constants and the parity normalizer through the `@chatsense/core` package boundary.
- `packages/chatsense-core/src/parity.ts` imports the core parser and analyzer.
- `packages/chatsense-core/src/chat-analyzer.ts` imports parser types/helpers and contract constants.
- `packages/chatsense-core/src/chat-parser.ts` imports contract constants.

## Platform Boundary

The behavioral engine is platform-independent. It uses plain TypeScript and standard JavaScript primitives:

- `Date`
- `Intl.NumberFormat`
- arrays, maps, sets, sorting, and string/regex parsing

No core file imports or depends on:

- React
- Next.js
- DOM or browser APIs
- Capacitor
- Android
- Python
- Node filesystem/path APIs

Platform-specific code stays outside the core:

- `features/import` owns browser `File`, TXT/ZIP reading, validation, and core import orchestration.
- `platform/android/sharedFileBridge.ts` owns shared-file events, Base64 conversion for the current bridge, typed native error events, and listener cleanup.
- `tests/parity.ts` owns Node `fs`, `path`, and `assert` usage.
- Python remains a separate research/reference implementation connected only through contracts and fixtures.

## Extraction Target

Move the platform-independent TypeScript engine into `packages/chatsense-core/src` so the existing Capacitor app and a later React Native app can consume the same parser, analyzer, contract constants, parity normalizer, and shared types without duplicating behavior.

## Non-Goals

- Do not add Expo or React Native.
- Do not change behavioral calculations.
- Do not change UI.
- Do not change the nine committed parity fixtures or expected outputs.
