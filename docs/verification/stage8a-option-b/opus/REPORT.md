# Stage 8A Option B: Relationship Read card readability, engineering report (Opus)

Issue #35, owner choice B. Baseline `2415a51385f60ff9e43ca2e26b66c8c9a7fd6267`, branch
`codex/stage8a-option-b`. This is engineering evidence from the implementer. It is not
independent acceptance (Sol audits next) and it is not a study stimulus (Astra re-freezes v2).
The source commit hash is recorded in the PR body, because a commit can't contain its own hash.

## Result: UX engineering PASS, with one open presentation decision (D1) for Astra

Every measured requirement in `ASTRA-ACCEPTANCE.md` passes on the five frozen inputs. The
exception is D1: at desktop 1280x1000, the longest card (c4) pushes the last ~1.5 lines of its
limitation below the app shell's fixed nav in the first frame. You have to scroll to read them.
The cause is the global 384x800 desktop shell (`app/layout.tsx`, out of scope), not the card.
See D1.

## Change (one file, presentation only)

`components/analytics/RelationshipReadCard.tsx`, +14/-15:

| Element | Before | After |
| --- | --- | --- |
| Limitation | `text-[11px] leading-4 text-slate-400`, `pt-2`, `border-slate-100` | `text-sm leading-5 text-slate-700`, `pt-3`, `border-slate-200`, `break-words` |
| Evidence facts | `text-xs leading-5 text-slate-500` | `text-sm leading-5 text-slate-600` |
| Historical note | `text-xs leading-5 text-slate-600` | `text-sm leading-5 text-slate-600` |
| Staleness note | `text-xs leading-5 text-slate-500` | `text-sm leading-5 text-slate-600` |
| "Counted in this export" | `text-[11px] text-slate-500` | `text-xs text-slate-600` |
| Confidence label | `text-[11px] text-slate-600` on slate-100 | `text-xs text-slate-700` on slate-100 |
| Details link | `mt-2 text-xs` | `mt-3 text-sm` (same href, label, colour, underline) |
| Frame | `border-slate-200 border-l-4 ${stateAccent[state]}` | `border border-l-4 border-slate-200` for every state (map deleted) |

Unchanged: headline, summary (14/24), eyebrow (12px), DOM structure and order, every string,
`href="#narrative-heading"`, and the `detailsLabel` map. No `px` font sizes remain, so all text
scales with the root font size.

Accent audit: the old per-state accents were order-dependent Tailwind conflicts. Measured in
v1, `border-amber-600` and `border-cyan-600` came before `border-slate-200` in the built CSS,
so silence and pattern-change cards never showed their colour. `border-violet-600` and
`border-slate-300` came after it, so both carried-contact cards had a violet frame on all four
sides and c5 had a slate-300 frame. That made c2/c3 look different from the other cards, with
no legend. I made the frame neutral and identical for every state, so colour carries no meaning
and the confidence label carries state in words. Rendering the "intended" amber for silence
would add a warning-like cue that v1 never showed. Visible delta for v2: c2/c3 lose the violet
frame, c5's frame goes from slate-300 to slate-200.

## Measurements (Chromium 149.0.7827.55, computed styles, real file import, frozen clocks)

Contrast uses WCAG 2.x luminance. The text colour is composited over every ancestor background
(alpha-blended over white). The card is opaque white, so all pairs resolve to `rgb(255,255,255)`,
except the confidence pill (`rgb(241,245,249)`).

| Card | Limitation before → after (px / line-height / contrast) | Lowest text contrast before → after | Desktop card height before → after |
| --- | --- | --- | --- |
| c1 pattern change | 11 / 16 / 2.56 → 14 / 20 / 10.35 | 2.56 → 7.58 | 520 → 582 |
| c2 carried balanced | 11 / 16 / 2.56 → 14 / 20 / 10.35 | 2.56 → 7.58 | 490 → 536 |
| c3 carried mixed | 11 / 16 / 2.56 → 14 / 20 / 10.35 | 2.56 → 7.58 | 514 → 560 |
| c4 unusual silence | 11 / 16 / 2.56 → 14 / 20 / 10.35 | 2.56 → 7.58 | 634 → 696 |
| c5 insufficient | 11 / 16 / 2.56 → 14 / 20 / 10.35 | 2.56 → 7.58 | 522 → 544 |

After the fix: every text element is >=12px and >=7.58:1 (confidence label 9.45:1). Every
claim/caveat body line is 14px with >=20px line height. The tallest card is 696px, inside the
800px display budget. Full per-element rows are in `before|after/measurements.json`; the
compact summary with hashes is in `evidence.json`.

- **200% text (WCAG 1.4.4):** I set the root font size to 200%. DPR alone is not text zoom.
  - Before: the 11px label, tag and limitation stayed at 11px.
  - After: every element doubled (12→24, 14→28, 20→40), with no horizontal overflow, no
    clipped elements, and the text identical to v1. Asserted at 360/390/412 widths.
- **Browser-zoom equivalent:** a 640 CSS px viewport at DPR 2, which matches a 1280px window
  at 200%. This is a simulation, labelled as such.
- **Reflow (1.4.10) at 320 CSS px:** no page overflow, no element clipped, card inside the
  viewport, limitation and link reachable.
- **OS dark preference:** computed rows and PNGs are byte-identical to light. Tailwind uses
  `darkMode: class` and nothing sets `.dark`.
- **Keyboard:** Tab reaches the link. It matches `:focus-visible` with a non-`none` outline.
  Shift+Tab leaves it, Enter sets `#narrative-heading` and the heading scrolls into view.
- **Long-limitation counterexample (test DOM only):** all five limitations joined, plus a
  72-character unbroken token, on c4 at 320px. It stays at 14px, wraps, doesn't overflow, and
  its end and the link stay reachable.
- **In-app first frame** (scroll area: desktop 185–823, phone 390x844 85–767):
  - c1, c2, c3 and c5 are wholly visible at both sizes.
  - c4 at 390x844: the limitation is wholly visible and the link is below the nav (reachable
    by scroll).
  - c4 at desktop: the limitation's bottom is at 851 against an 823 nav (D1). In v1 the c4
    limitation fit (796) but its link was already under the nav (card bottom 839).

## Text and science preservation

- **Rendered text:** `innerText` of every card equals the frozen v1 capture byte-for-byte, and
  the SHA-256 matches `BEFORE-MANIFEST.renderedInnerTextSha256` for all five. This is asserted
  in every test, in every capture, before and after, at all widths and at 200%.
- **Inputs:** fixture and expected-read SHA-256s match v1. Frozen clocks are installed with
  `page.clock.setFixedTime` before navigation and checked against `Date.now()`.
- **Zero diff vs baseline:** `packages/`, `contracts/`, `lib/`, `features/`, `app/`,
  `fixtures/`, `utils/`, `hooks/`, `styles/`, `tailwind.config.ts`, `package*.json`.
- **Safety scanner:** `assertRelationshipReadLanguageSafe` (tests/helpers/narrative-safety.ts)
  passes on all five frozen reads (`logs/narrative-safety-frozen-reads.log`).
- **v1 files:** the v1 worktree was only read. My baseline "before" desktop captures are
  byte-identical to the five v1 selected PNGs.

## Test runs (`logs/`)

- `failing-first-baseline-2415a51.log`: the new spec against the baseline build.
  - 33 failed, 1 passed (keyboard), 8 skipped (run-once tests in the other two projects).
  - Failures are only legibility: 115 body font size, 75 font size, 45 not doubling at 200%,
    25 contrast (limitation 2.56:1), 25 body line height.
  - Reflow and reachability already passed at baseline.
  - After that run I changed only the run-once skip mechanism, to satisfy lint
    (`no-empty-pattern`); the assertions are the same.
- `npm-run-check.log`: exit 0. That covers lint, typecheck, unit/safety tests, TS parity (21),
  forecasting parity (10), forecast eval and build.
  - Environment note: `test:forecast-parity` calls a `python` executable that needs pandas.
    This Mac has only `python3` with no deps, so I prepended a temporary venv
    (`/tmp/s8a-venv`, the pyproject runtime deps from PyPI) to PATH.
  - Nothing in the repo changed for this.
- `npm-run-test-viewport.log`: exit 0. 40 passed (6 existing smoke + 34 new), 8 skipped by
  design.

## Open items and challenges to layout assumptions

- **D1, desktop shell vs. readable c4:** the desktop shell is fixed at 384x800, so its scroll
  area is 638px. c4 at 14px is 696px.
  - I tried spacing variants by measuring in-page overrides. Cutting block gaps to 8px and
    summary leading to 20px gets c4's limitation bottom to 819 (4px margin), but the card stays
    660px. Fitting the whole card needs about 613px, which isn't reachable without text below
    14px.
  - I didn't ship those: they trade reading comfort for one desktop preview frame.
  - Options for Astra/owner: (a) accept scroll in-app, since all content is reachable and
    tested; (b) a separate, owner-approved shell-height change; (c) the measured tightening
    above.
- **v2 capture method (Astra):** the v1 pipeline took element screenshots inside the
  1280x1000 desktop shell. That can't produce a clean c4: the card is taller than the scroll
  area, so the nav paints over it.
  - My `card-390` images grow a 390px-wide viewport until the scroll area holds the card,
    giving clean 350px-wide cards up to 696px tall.
  - Any v2 method should be preregistered. Never crop or scale.
- **Link semantics (pre-existing, unchanged by mandate):** labels say "See the evidence in the
  Changes/People/Rhythm tab", but every href goes to `#narrative-heading`, the Overview
  "Evidence-backed summary". The link works and is keyboard-reachable, but its text doesn't
  match where it goes. Needs a copy/behaviour decision outside this task.
- **Not done or not claimed:**
  - No `@axe-core/playwright`: it isn't installed, and I didn't add a dependency.
  - Chromium only: no WebKit/Firefox, and no real browser-zoom UI.
  - No physical Android, screen reader, forced-colors/high-contrast or human comprehension
    testing.
  - No blanket WCAG conformance claim.

## Reproduce

```
npm ci && npm run build
npx playwright test tests/viewport/relationship-read-card.spec.ts
TZ=UTC npx tsx docs/verification/stage8a-option-b/opus/capture-evidence.ts after   # 'before' needs a baseline build
```

## Evidence layout

- `before/`, `after/`: card PNGs and `measurements.json`. Views:
  - `desktop-1280x1000.first-frame` and `mobile-390x844.first-frame`: honest in-app first
    screens, desktop clipped to the shell.
  - `card-390`, `reflow-320`: whole-card images.
  - `text200-390` and `zoom200-equiv-640`: all five after; c4 only before.
  - Dark-preference PNGs were deleted because they are byte-identical to `card-390`.
- `evidence.json`: per-card hashes, frozen clocks, before/after measurements, first-frame
  geometry.
- `logs/`: the runs above. `RUNTIME.md` records the native runtime and skills.
