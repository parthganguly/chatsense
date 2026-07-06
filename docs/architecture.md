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
  fixtures/forecasting/*
```

## Production Runtime

`@chatsense/core` is the production behavioral engine. It owns:

- WhatsApp text parsing;
- date-order inference;
- behavioral calculations;
- shared analysis types;
- deterministic behavioral insights;
- deterministic relationship-dynamics turns, windows, and evidence-safe comparisons;
- deterministic evidence-backed narrative findings derived from those existing metrics;
- contract constants;
- TypeScript parity normalization.

The core package is an npm workspace package and must stay free of React, Next.js, DOM, Capacitor, Android, Node filesystem, and Python dependencies.

Stage 5 adds research-only forecasting validation functions to the core package so the current runtime and future consumers can inspect the same gated result. These functions do not call remote services and do not authorize product predictions by themselves. Reply opportunities terminate conservatively at observed response, same-sender new-thread supersession, or export end.

Stage 6 adds `InsightNarrative` to `ChatAnalysis`. The core, rather than the UI,
builds separate Overview, Changes, People, and Rhythm sections. Its categories
cover balance, maintenance, reconnection, reply timing, activity change, rhythm,
forecasting gate, and data quality. Comparison findings can lead only when the
canonical Stage 4 evidence and notable-change rules are satisfied. Maintenance
findings use contract-owned share and sample thresholds. The forecasting finding
reports Stage 5 gate status but never emits a live forecast. Every finding includes
the values, periods, counts, or sample sizes that support it. This is a presentation
layer over existing calculations; it adds no new behavioral score.

## Application Shell

The Next.js/Capacitor shell owns:

- root app state and screen composition;
- file-picker import UX, Stage 7 onboarding copy (`features/import/onboardingCopy.ts`), and the synthetic demo import (`features/import/demoExport.ts`, embedded from `fixtures/whatsapp/stage4_increasing_initiation.txt`, same pipeline as a real import);
- browser `File` handling;
- ZIP/TXT extraction;
- Android share-sheet import orchestration through the native `SharedFile` plugin;
- presentation screens and components.

Screens render `ChatAnalysis` values from `@chatsense/core`. They must not duplicate behavioral calculations.

All four analytics screens render their corresponding `ChatAnalysis.narrative.sections`
entry before raw metric cards, comparison cards, participant cards, charts, or pause
tables. `components/analytics/NarrativeSection.tsx` and `NarrativeFindingRow.tsx`
format the precomputed narrative without altering its order or language.

Stage 4 adds a `Changes` screen that renders precomputed adaptive-window,
turn-taking, reconnection, and evidence-safe comparison summaries from
`ChatAnalysis.relationshipDynamics`. The screen does not run sentiment analysis,
prediction, coaching, or any content interpretation.

## Python Research

Python remains local research/reference only. It is useful for pandas pipelines, parquet features, notebooks, classical ML experiments, and cross-language parity. Python is not bundled into Android.

The Python forecasting package mirrors the TypeScript research gate for local evaluation:

```bash
python -m chatsense_ml.forecasting.evaluate
```

## Drift Control

Shared contracts and fixtures are the guardrails:

- `contracts/behavioral_contract.json` defines shared behavioral constants and definitions.
- `contracts/forecasting_contract.json` defines research-only forecasting tasks, censoring policy, metrics, and promotion gates.
- `contracts/forecasting_report.schema.json` defines the strict synthetic forecasting benchmark report shape.
- `contracts/report.schema.json` defines the Python report contract.
- `fixtures/whatsapp` and `fixtures/expected` preserve the base fixtures and Stage 4 synthetic fixture matrix.
- `fixtures/forecasting` stores Stage 5 synthetic forecasting fixtures that are not part of parity golden outputs.
- `npm run test:parity` verifies TypeScript behavior against expected outputs.
- `npm run test:forecast-parity` verifies the TypeScript and Python forecasting gates fixture-by-fixture.
- `npm run forecast:eval` writes schema-shaped TypeScript and parity benchmark reports for committed synthetic forecasting fixtures.
- `python -m pytest` verifies the Python reference and contract parity.
- `python -m chatsense_ml.forecasting.evaluate` writes the schema-shaped Python benchmark report.

## Android Native Import

Stage 3 replaces the old whole-file JavaScript injection bridge with a first-party Capacitor plugin:

```text
Android share intent
  content:// provider URI
  SharedFilePlugin
  app-private cache/chatsense-shared-imports
  Capacitor file URL via convertFileSrc()
  browser File import path
  releaseSharedFile()
```

`MainActivity` only registers the plugin and forwards cold-start or warm share intents. `SharedFilePlugin` validates ZIP/TXT imports, copies them with a size limit into private cache, retains pending metadata for startup races, and deletes cached files after JavaScript finishes import. No Python, LLM, backend, telemetry, or broad storage permission participates in this runtime path.

## Deferred React Native Work

React Native is a possible later consumer of `@chatsense/core`, but it is not part of Stage 2. No Expo, Metro, or second frontend exists in this stage.
