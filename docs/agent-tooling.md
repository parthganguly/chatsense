# Agent Tooling

This document describes the repeatable tooling layer around ChatSense product
passes: AI context packing, viewport QA, and phone QA. None of it changes
product behavior, and none of it may ever involve personal exports.

## Repomix — AI context packing

`repomix.config.json` packs the product-relevant sources (app, features,
components, `packages/chatsense-core`, docs, contracts, tests) into a single
XML file an AI reviewer can ingest:

```bash
npm run context:pack
# writes artifacts/ai-context/chatsense-repo.xml (gitignored)
```

`.next`, `node_modules`, Android build output, artifacts, and APKs are
excluded. The output lives under `artifacts/`, which is gitignored — never
commit a packed context, and never pack a directory containing a personal
export.

## Fable / Codex — implementation agents

Product implementation passes (Stage 6, 6.1, 6.2) are driven by a coding agent
(Claude Fable / Codex) working directly in this repository. Ground rules for
any agent pass:

- read `docs/runtime_boundaries.md` and `contracts/behavioral_contract.json`
  first; the safety boundaries are non-negotiable;
- no LLM/sentiment/content-interpretation/coaching/prediction features;
- narrative and takeaway wording must pass
  `tests/helpers/narrative-safety.ts`;
- personal exports never enter commits, PR text, or fixtures.

Use `npm run context:pack` to give a review agent full context in one file.

Agents starting product work after Stage 7 should read
`docs/product/relationship-read-roadmap.md` first — it is the baton document
for the planned human-first "Relationship Read" direction (Stage 8+),
including its hard safety boundaries and a ready-to-run Stage 8A prompt. Then
read `docs/product/relationship-read-market-review.md` (narrows the Stage 8A
brief), `docs/product/relationship-context-research.md` (externally
researched pass on romantic-vs-relationship-general scope), and
`docs/product/scenario-evidence-research.md` (scenario library and empirical
methods: which user situations the product answers, with what statistics, on
how much evidence, and what may never be inferred; its §23 brief is the
current Stage 8A implementation prompt, superseding the earlier ones).

## Playwright — viewport QA

`npm run test:viewport` runs the mobile smoke suite in
`tests/viewport/` against the static export at three widths
(360x800, 390x844, 412x915). It imports a synthetic fixture through the real
file input, walks Overview / Changes / People / Rhythm, and asserts:

- each tab renders;
- the takeaway card appears above the raw metric sections;
- there is no horizontal overflow;
- the bottom navigation still works.

Setup (once):

```bash
npm ci
npx playwright install chromium
```

Run:

```bash
npm run build          # produces out/
npm run test:viewport  # serves out/ and runs all three viewports
```

## Maestro — phone QA

`maestro/chatsense-smoke.yaml` walks the four tabs on a connected Android
device and asserts each takeaway heading. Since Stage 7 the flow is
self-contained: when the onboarding screen is visible it taps "Try demo
export", which loads the committed synthetic fixture through the normal
import pipeline. No fixture push, no Android system file picker, and no
manual import precondition:

1. Install the debug APK.
2. `npm run test:mobile:maestro`

Manual fallback (no Maestro installed): follow the phone checklist in
`docs/stage-6-2-human-readable-takeaways-report.md` by hand — import the
fixture, walk all four tabs, confirm the takeaway leads each tab, the bottom
nav works, and nothing overflows. Delete the pushed fixture afterwards
(`adb shell rm /sdcard/Download/stage4_increasing_initiation.txt`).

Maestro install: https://maestro.mobile.dev (on Windows, run it under WSL).

## Debug APK releases

Every generated APK intended for distribution must be published as a clearly
labeled GitHub pre-release with an SHA-256 checksum and release metadata. The
repeatable workflow, manual backfill procedure, verification commands, and
release safety rules are documented in `docs/release-debug-apks.md`.

`.github/workflows/release-debug-apk.yml` builds and publishes a debug APK on
pushes to `main` or manual dispatch, after the Node and Android verification
gates pass. These APKs are not production-ready and are not Play Store signed.
Maestro remains local device QA rather than a GitHub-hosted runner step.

Never commit APKs or checksum outputs. Never attach personal exports,
screenshots, reports, packed context, credentials, or signing material to a
release.

## Archon — repeatable workflows

Recurring product passes (red-team review, release polish, phone QA) should be
captured as Archon workflows so each pass runs the same steps: pack context,
run `npm run test:product-smoke`, build and install the APK, run the Maestro
flow, and post results to the PR. Treat the workflow definitions as
documentation of the release process, not as a replacement for judgment.

## pi-gondolin — sandboxing risky agent runs

Agent runs that execute untrusted or generated code (for example, evaluating
an external contribution or fuzzing the parser) should run inside a
pi-gondolin sandbox, not on the development machine. Routine implementation
passes on this trusted repository do not need it.

## Scripts

- `npm run context:pack` — pack AI context to `artifacts/ai-context/`.
- `npm run test:viewport` — Playwright mobile viewport smoke (needs `npm run
  build` and installed Chromium).
- `npm run test:mobile:maestro` — Maestro flow on a connected device (needs
  Maestro installed and the fixture imported).
- `.github/workflows/release-debug-apk.yml` — verify, assemble, checksum, and
  publish a GitHub debug APK pre-release from `main` or manual dispatch.
- `npm run test:product-smoke` — every safe machine-local check in one
  command: lint, typecheck, unit/narrative/takeaway tests, parity, build, and
  the viewport suite.

## Future options (not adopted)

OpenHands, OpenSandbox, Bazel, and Nix are possible future additions for
agent orchestration, sandboxing, and hermetic builds. They are intentionally
not part of this repository today; do not add them without a dedicated
proposal.
