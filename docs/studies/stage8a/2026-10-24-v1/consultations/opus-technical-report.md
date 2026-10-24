# Opus technical capture report — Stage 8A stimuli (issue #29, mandate 6364672064)

**Consultant:** Opus 5.5 (`claude-opus-5-5`) via native Claude Code CLI. Bounded technical capture for Astra. I made no scientific decisions and changed no product code. I did not commit or push.
**Date:** 2026-10-24. **Base:** `codex/stage8a-prereg` at `2415a51385f60ff9e43ca2e26b66c8c9a7fd6267`. Tracked product files are unchanged (`git diff` is empty; the only untracked path is `docs/studies/`).

## Verdict

**STIMULI CAPTURED FROM THE REAL BUILD.** All five cards rendered in the expected state from the unmodified static production build, using the real file input. Rendered text matches the computed `RelationshipRead` in order, with equal number sets. I visually inspected the screenshots and they show the full card: label, headline, summary, all evidence, the historical note on c4, the staleness note on c1/c4/c5, the limitation and the evidence link.

| Card | Fixture ID | State / label | Frozen browser `now` (UTC) | Source |
|---|---|---|---|---|
| 1 Pattern change | `s8a-v1-c1-pattern-change` | pattern_change / Strong read | 2026-05-07T19:30:00Z (end + 1 h) | `fixtures/whatsapp/stage4_reply_slowdown.txt` (unchanged) |
| 2 Steady/balanced | `s8a-v1-c2-carried-balanced` | carried_contact balanced / Strong read | 2026-03-29T19:15:00Z (end + 1 h) | `balancedWeeks()` |
| 3 Carried (mixed) | `s8a-v1-c3-carried-mixed` | carried_contact mixed / Useful read | 2026-03-29T19:15:00Z (end + 1 h) | `mixedWeeks()` |
| 4 Unusual silence + restart history | `s8a-v1-c4-unusual-silence` | unusual_silence (ongoing, 10/10), historical note present, not suppressed / Useful read | 2026-04-13T18:15:00Z (end + 15 d) | `steadyRhythmWeeks()` |
| 5 Not enough data | `s8a-v1-c5-insufficient` | insufficient_evidence / Light read | 2026-07-04T10:05:00Z (end + 1 h) | `fixtures/whatsapp/stage4_insufficient_export.txt` (unchanged) |

The generators are copied byte-for-byte from `tests/relationship-read.ts` lines 421–644, and every run asserts the copy against the source. Regenerating the fixtures reproduced identical hashes.

## Paths (all under `docs/studies/stage8a/2026-10-24-v1/stimuli/`)

- `manifest.json`: base commit, lock hash, build ID, `out/` digest, environment, clocks, per-card text/hash/boxes/contrast/border and screenshot hashes, display deviations. sha256 `e498e0f10e8c32770f96628d076d9efdd193d16e6829fff54d8e46d08f4dde24`.
- `SHA256SUMS`: covers all 68 other files; `shasum -a 256 -c` passes.
- `fixtures/*.txt`, `expected/*.relationship-read.json`, `expected/cards.json`
- `captures/<id>.{mobile-390x844.card, mobile-390x844.first-screen, mobile-390xH.full-page, desktop-1280x1000.card, desktop-1280x1000.first-screen, desktop-1280x1000@2x.card}.png`, `<id>.card.innerText.txt`, `<id>.card.outerHTML.html`
- `build/out-file-manifest.txt`: 36 files. Digest `56726b31d7aec53f5b771add50160bae131d98367ba464b9f40ba59ebe7a3e72`. Next build ID `5gkiF1dwfx9VnG1NwZcVc`.
- `scripts/generate-fixtures.ts`, `scripts/capture.ts`, `scripts/write-manifest.ts`
- `verification/`: sanitized logs and `capture-run.json`

**Recommended study frame:** `captures/<id>.desktop-1280x1000.card.png` (DPR 1, 100% native, whole card in one frame; card bottom ≤ 839 px of 1000). The `@2x` file has the same layout rendered for HiDPI screens. Astra decides which to use.

## Commands (repo root)

```
npm ci --ignore-scripts --no-audit --no-fund                 # exit 0
NEXT_TELEMETRY_DISABLED=1 npm run build                      # exit 0
npx tsx tests/relationship-read.ts                           # pass (Stage 8A hero-state matrix)
npm test                                                     # exit 0 (all 7 suites)
npm run typecheck                                            # exit 0
npm run test:parity                                          # pass, 21 fixtures
npm run lint                                                 # exit 1, see blockers
npx eslint . --ignore-pattern 'docs/studies/**'              # exit 0
TZ=UTC npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/generate-fixtures.ts
TZ=UTC npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/capture.ts
TZ=UTC npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/write-manifest.ts
```

**Environment:** Node v24.14.0, npm 11.9.0, macOS 13.7.8 (Darwin 22.6.0 x64), Playwright 1.61.1, Chromium 149.0.7827.55 headless shell. Locale en-US, timezone UTC, light colour scheme.

**Viewports:**
- Mobile: 390×844 at DPR 3, isMobile.
- Desktop: 1280×1000 at DPR 1.
- Desktop @2x: 1280×1000 at DPR 2.

**How the capture ran:**
- The app was served from `http://127.0.0.1:4319/`, route `/`.
- The clock was frozen with `page.clock.setFixedTime` before `goto`, and `Date.now()` was asserted before import.
- Each fixture was imported through `input[type=file]` using `setInputFiles`, with the fixture's exact bytes and the neutral name `WhatsApp Chat with Synthetic Example.txt`.
- The http-server and browser stopped after capture; I checked that port 4319 is free and no Playwright processes remain.

## Display and copy concerns (reported, not decided)

1. **State accent bug (visible across cards).** In the built CSS:
   - `border-amber-600` and `border-cyan-600` lose to `border-slate-200`, so pattern-change and silence cards show a plain grey frame.
   - `border-violet-600` wins on all four sides, so both carried-contact cards show a full purple outline.
   - Insufficient shows slate-300.

   Participants will see a different frame on c2/c3. A fix would be product code, so it needs a separate draft PR if wanted.
2. **Low contrast.** The limitation line is text-slate-400 at 11 px with a contrast ratio of 2.56:1, below WCAG AA. That line carries the "does not say why" limit, so it is the hardest text to read in a ten-second exposure. Evidence and staleness lines are 4.76:1 at 11–12 px.
3. **Small text on desktop.** On desktop the app is a ~384 px phone frame, so the card is 344 px wide with 11–12 px text at DPR 1.
4. **Mobile.** All five cards fit above the bottom nav in the first 390×844 screen (card bottom ≤ 739 px). Nothing was cropped. The header truncates the file name.
5. **Whole-page context.** The app scrolls inside `<main>`, so Playwright's `fullPage` capture equals the viewport. The full-page images instead grow the viewport height only. The pages also show the existing "What to notice" takeaway, whose emphasis differs from the hero on c1 and c4. Card-only images avoid this.
6. **Copy, rendered exactly:**
   - c1 mixes ISO date ranges ("between 2026-04-01 to 2026-04-14 and …") with "May 7, 2026".
   - c3 reads "restarts after pauses and follow-ups before a reply and turn share stayed close to even".
   - c2 and c3 name 4 measures, but evidence is capped at 3, so turn share is omitted.
   - c2 and c3 show "0% … relevant turns".

## Blockers

None for capture.

`npm run lint` fails with 12 errors, all in Astra's `docs/studies/.../preflight/validate-schema.cjs` (CommonJS `require` and `__dirname`). App lint passes without it. My scripts pass `tsc` and eslint (0 errors; 3 warnings for unused generators kept in the verbatim copy).

The study must not count these as participant data. Recruitment and the scientific decisions remain Astra's and the owner's.

## Provenance

```json
{"agent":"Opus 5.5","model_id":"claude-opus-5-5","runtime":"native Claude Code CLI (Claude Agent SDK)","role":"bounded technical consultant to Astra","mandate":"chatsense#29 comment 6364672064","base_commit":"2415a51385f60ff9e43ca2e26b66c8c9a7fd6267","stimuli_manifest_sha256":"e498e0f10e8c32770f96628d076d9efdd193d16e6829fff54d8e46d08f4dde24","next_build_id":"5gkiF1dwfx9VnG1NwZcVc","out_manifest_sha256":"56726b31d7aec53f5b771add50160bae131d98367ba464b9f40ba59ebe7a3e72","product_code_modified":false,"committed_or_pushed":false,"subagents_used":false,"screenshots_visually_inspected":true}
```
