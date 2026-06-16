# ChatSense Architecture

ChatSense is a local-first WhatsApp export analyzer. The current shipped app is a Next.js static export wrapped by Capacitor for Android.

## Layers

```text
Next.js / Capacitor shell
  app/page.tsx
  features/*
  components/*
  platform/android/*

@chatsense/core
  packages/chatsense-core/src/*

Python research/reference
  python/chatsense_ml/*

Shared contracts and fixtures
  contracts/*
  fixtures/whatsapp/*
  fixtures/expected/*
```

## Production Runtime

`@chatsense/core` is the production behavioral engine. It owns:

- WhatsApp text parsing;
- date-order inference;
- behavioral calculations;
- shared analysis types;
- deterministic behavioral insights;
- contract constants;
- TypeScript parity normalization.

The core package is an npm workspace package and must stay free of React, Next.js, DOM, Capacitor, Android, Node filesystem, and Python dependencies.

## Application Shell

The Next.js/Capacitor shell owns:

- root app state and screen composition;
- file-picker import UX;
- browser `File` handling;
- ZIP/TXT extraction;
- Android share-sheet bridge events;
- presentation screens and components.

Screens render `ChatAnalysis` values from `@chatsense/core`. They must not duplicate behavioral calculations.

## Python Research

Python remains local research/reference only. It is useful for pandas pipelines, parquet features, notebooks, classical ML experiments, and cross-language parity. Python is not bundled into Android.

## Drift Control

Shared contracts and fixtures are the guardrails:

- `contracts/behavioral_contract.json` defines shared behavioral constants and definitions.
- `contracts/report.schema.json` defines the Python report contract.
- `fixtures/whatsapp` and `fixtures/expected` preserve nine deterministic parity fixtures.
- `npm run test:parity` verifies TypeScript behavior against expected outputs.
- `python -m pytest` verifies the Python reference and contract parity.

## Deferred React Native Work

React Native is a possible later consumer of `@chatsense/core`, but it is not part of Stage 2. No Expo, Metro, or second frontend exists in this stage.
