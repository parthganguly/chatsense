# Stage 8A Option B repair-1: D1 and D2 (Opus engineering report)

Issue #35, owner choice B, bounded repair after Sol 6.1's independent **UX FAIL**
(`docs/verification/stage8a-option-b-review-completion/sol/UX-REVIEW.md`) of candidate
`8ee579420d56038800d0a4f453deb7e989d7325c`. Parent of this repair: evidence-only head
`ef1dc7e175a4e6225665bf002852b12b5c959035`. Branch `codex/stage8a-option-b`, draft PR #36.
The repaired commit hash is in the PR body (a commit can't contain its own hash).

This is implementer evidence. It is **not** UX acceptance: Sol's fresh independent audit of
the repaired commit and Astra's P0 v2 freeze are still pending. No WCAG conformance or
human-comprehension claim is made.

## Engineering status: D1 and D2 fixed and regression-tested on this revision

Both defects reproduced failing-first on `8ee5794`. Both pass on this revision with Range-geometry
assertions, and the required checks are green. Sol UX acceptance is still pending.

## Supersession of the first Option B report

`docs/verification/stage8a-option-b/opus/REPORT.md` is kept byte-for-byte as history, along
with its measurements and screenshots, which belong to `8ee5794`. Read these of its claims as
**superseded and wrong for that candidate**:

- "Result: UX engineering PASS": withdrawn. D1 was an owner-disallowed defect, not an open
  decision, and the scroll waiver I offered was not accepted.
- "every element doubled ... with no horizontal overflow, no clipped elements" at 200%: false.
  The check measured `document.scrollWidth` and element `scrollWidth`, which missed the
  confidence pill escaping the card (x176.27..352.53 at 320px/200%; text to 332.53, outside
  the 320px viewport). The new Range-geometry assertion catches it.
- "the confidence label carries the state in words": inaccurate. Strong/Useful/Light read
  describes read strength. It does not identify which of the five scientific states a card
  is; the headline and evidence do. The source comment is corrected; visible text unchanged.
- The "72-character unbroken token" was `"Unbroken-".repeat(8)`, which has hyphen break
  opportunities. Replaced by `"W".repeat(120)`.

## Change (one product file, classes and a comment only)

`components/analytics/RelationshipReadCard.tsx`:

| Element | Candidate `8ee5794` | Repair-1 | Why |
| --- | --- | --- | --- |
| Card padding | `p-4` | `px-4 py-3` | D1: 4px of vertical room (sides unchanged) |
| Header row | `flex items-start justify-between gap-3` | `flex flex-wrap items-start justify-between gap-x-3 gap-y-1` | D2: the pill moves below the eyebrow when both don't fit |
| Confidence pill | `shrink-0 rounded-full` | `rounded-xl` | D2: may shrink and wrap its own two words when alone on a line. `rounded-xl` (0.75rem) is ≥ half the single-line height at 100% and 200%, so a one-line pill renders fully rounded as before; a two-line pill gets rounded corners instead of a lozenge that would leave text outside its fill |
| Summary | `leading-6` (24px) | `leading-5` (20px) | D1. Still 14px/20px, the floor for body text |
| "Counted…", historical note, staleness note, limitation | `mt-3` | `mt-2` | D1: 8px block gaps |
| Limitation top padding | `pt-3` | `pt-2` | D1. Rule above it retained: 8px + rule + 8px |
| Comment | "confidence label carries the state" | read strength, not the state | Documentation correction |

Unchanged: every string, DOM order, colour, font size, headline `leading-7`, evidence list
spacing, link (`mt-3 text-sm`, label, `href="#narrative-heading"`), global shell, theme and
other tabs.

**Rejected attempt (logged honestly):** I first also cut the headline to `leading-6` (20/24).
Mona Sans at 20px needs 27px of line box (measured `scrollHeight` 50 vs `clientHeight` 48 at
24px; 54/54 at 27px), so the existing glyph-clipping check failed for every card: 32 failed,
2 passed. I did not weaken the check. I reverted the headline and took 4px from vertical
padding instead. That failing run's log was overwritten by the next run, so only this
description of it is preserved.

## D1: desktop 1280x1000 first frame, unscrolled (`<main>` 185–823)

Limitation bottom is the bottom of its last **text line** (Range rect), not the paragraph or
card box. Clearance = 823 − that bottom.

| Card | Card top | Limitation last line bottom (clearance) | Details link | Limitation whole on 390x844 first frame | Complete card height (384px window, 344px card) |
| --- | --- | --- | --- | --- | --- |
| c1-pattern-change | 205 | 704 (119 px) | 717–737 visible | yes | 546 |
| c2-carried-balanced | 205 | 658 (165 px) | 671–691 visible | yes | 500 |
| c3-carried-mixed | 205 | 678 (145 px) | 691–711 visible | yes | 520 |
| c4-unusual-silence | 205 | 814 (9 px) | 827–847 **below fold, scroll** | yes | 656 |
| c5-insufficient | 205 | 666 (157 px) | 679–699 visible | yes | 508 |

- Candidate `8ee5794`: c4 limitation last line 850 (Range; paragraph box 851), the last
  ~1.5 lines under the nav. Now 814: all four lines are visible with 9px clearance, and the
  test asserts ≥8px plus `elementFromPoint` on the last line.
- **c4's details link (827–847) is below the first desktop frame** and needs a vertical
  scroll. It is reachable, and the test scrolls to its start and end and checks it isn't
  covered. The other four links are visible in the first frame.
- Complete card heights at 344px went from 582/536/560/696/544 to 546/500/520/656/508. All
  fit an 800px display at native scale without scaling or cropping. Display rules are
  Astra's call.

## D2: header containment (pill border box in CSS px, inside the card content box)

| Card | 320px + 200% text | 390px + 200% text | 320px, 100% |
| --- | --- | --- | --- |
| c1-pattern-change | 76.00..247.00 in 76..247 | 76.00..252.27 in 76..317 | 40.00..128.14 in 40..283 |
| c2-carried-balanced | 76.00..247.00 in 76..247 | 76.00..252.27 in 76..317 | 40.00..128.14 in 40..283 |
| c3-carried-mixed | 76.00..247.00 in 76..247 | 76.00..247.25 in 76..317 | 40.00..125.62 in 40..283 |
| c4-unusual-silence | 76.00..247.00 in 76..247 | 76.00..247.25 in 76..317 | 40.00..125.62 in 40..283 |
| c5-insufficient | 76.00..232.36 in 76..247 | 76.00..232.36 in 76..317 | 40.00..118.19 in 40..283 |

- At 200% the eyebrow takes the first header line and the pill goes on the next. At 320px +
  200%, "Strong read" and "Useful read" (176.27px natural width) don't fit the 171px content
  box, so the pill fills it and wraps its two words onto two lines. "Light read" stays on one
  line. No overlap, no escape, and every text Range is inside the content box.
- At 320px with 100% text the pill now also sits under the eyebrow (needs 254px of a 243px
  content box). At 360/390/412px with 100% text, and on desktop, it stays on the eyebrow's
  line, right-aligned as before.
- Text sizes double at 200% for every element (12→24, 14→28, 20→40), and this is asserted.

## Regression assertions added (`tests/viewport/relationship-read-card.spec.ts`)

- `expectInsideCard` runs inside every overflow check. It requires every element box and
  every text-node line (Range client rects, so glyphs past an element's edge count) to stay
  inside the card's content box (border + padding excluded), with ±0.5px tolerance. The
  content box itself must be inside the clipping `<main>` and the viewport, and the header
  items must not overlap. It runs at 360/390/412px and 320px, both 100% and 200% text, on
  desktop, and in the long-limitation stress test.
- 200% test: it now also runs 320px + 200% together and re-checks the exact v1 innerText,
  containment and limitation/link reachability.
- Desktop test: unscrolled (`scrollTop` 0), card top ≥ main top, limitation last-line Range
  bottom + 8 ≤ main bottom, and the last line is actually painted (`elementFromPoint`).
- Long limitation: the five frozen limitations plus `"W".repeat(120)` (no break opportunity),
  test DOM only. Checked at 320px, then at 320px + 200% (≥28px), for containment and
  start/end reachability.

## Commands and results (logs in `logs/`)

| Step | Command | Result |
| --- | --- | --- |
| Failing-first on candidate | `npm run build` (candidate source), `npx playwright test tests/viewport/relationship-read-card.spec.ts` | `failing-first-candidate-8ee5794.log`: **17 failed**, 17 passed, 8 skipped. All 15 per-card 200% tests (pill escapes, e.g. `span "Strong read" x176.27..352.53` in content 76..247), the desktop test (c4 `limitation's last line (bottom 850) not 8px clear of nav at 823`, `covered`), and the long-limitation test at 320 + 200% (the pill again; the W×120 token itself wrapped inside the card) |
| Rejected attempt | same, headline `leading-6` | 32 failed / 2 passed on h1 `scrollHeight`; reverted (see above) |
| Repaired spec | same | `card-spec-repaired.log`: 34 passed, 8 skipped |
| Full check | `PATH=/tmp/s8a-venv/bin:$PATH npm run check` | `npm-run-check.log`: exit 0 (lint, typecheck, unit/safety tests, TS parity, forecasting parity, forecast eval, build) |
| Viewport suite | `npm run test:viewport` | `npm-run-test-viewport.log`: exit 0, 40 passed, 8 skipped |
| Frozen-read safety | `npx tsx -e` running `assertRelationshipReadLanguageSafe` over the five frozen reads | `narrative-safety-frozen-reads.log`: 5 passed |
| Evidence capture | `TZ=UTC npx tsx docs/verification/stage8a-option-b-repair-1/capture-evidence.ts` | `capture.log`: exit 0, 45 screenshots |
| Final-tree lint | `npm run lint && npm run typecheck` after adding the capture script | `lint-typecheck-final-tree.log`: exit 0 |
| Preservation | git diffs and hashes | `preservation.log` |

The 8 skips are by design: four single-viewport tests run once (at 390px), so their 360 and
412px copies are skipped.

## Text and science preservation (`logs/preservation.log`)

- Product/test diff against `8ee5794`: only `RelationshipReadCard.tsx` and the spec.
- Empty diff against `8ee5794` for `packages`, `contracts`, `lib`, `features`, `app`,
  `fixtures`, `utils`, `hooks`, `styles`, `tailwind.config.ts`, `package*.json`,
  `tests/viewport/fixtures`, `tests/helpers`.
- Empty diff against frozen v1 `64efc6d` for `packages`, `fixtures` and the
  safety helper.
- All 17 `tests/viewport/fixtures/stage8a-v1/` files (16 references + README) match Sol's
  `inspected-file-hashes.json`.
- The card `innerText` equals the frozen v1 capture byte-for-byte. This is asserted in every
  test (including 320px + 200%) and in all 45 captures. The href is `#narrative-heading`
  everywhere. Clocks use `page.clock.setFixedTime` before navigation and are checked against
  `Date.now()`.
- Historical directories `docs/verification/stage8a-option-b/` and
  `docs/verification/stage8a-option-b-review-completion/`: zero diff against `ef1dc7e`, not
  rehashed. Their hashes and measurements describe `8ee5794`, not this revision.

## Contrast (all 45 captures)

Unchanged colours. In every view, the minimum composited text contrast is 7.58:1
(slate-600 on white). The limitation is 10.35:1, and the pill is 9.45:1 on slate-100. OS dark
preference gives identical computed pairs: Tailwind is `darkMode: class` and nothing sets
`.dark`. The probe waits until every ancestor's computed opacity is 1 before measuring or
capturing, so no transient fade is in any image. Group opacity during the animation is not
modelled.

## Observations outside this repair's scope (not fixed, reported)

- **Global shell at 320px + 200%**: the app header's "ChatSense" title runs under the
  refresh button, and the export name truncates to "120 messa…" (see the
  `text200-320x844.first-frame` images). This is `app/page.tsx` / shell, which is out of
  scope, so it's left for an owner decision.
- **Mid-word break at 320px + 200%**: one word wider than the 171px content box at 40px bold
  ("measurably" in c1's headline) breaks mid-word through the existing `break-words`. No glyph
  is lost, and the text is unchanged.
- **Long cards scroll** at 320px and 200%. Every line is reachable and nothing is
  horizontally clipped (asserted). On the 390x844 first frame all five cards, including c4's
  link (727–747, nav at 767), are visible. Only on the desktop first frame does c4's link need a scroll.
- Pre-existing link semantics: labels name tabs, but the href is the Overview heading.
  Unchanged by mandate.
- Not done: no real browser-zoom UI, Firefox/WebKit, screen reader, forced colours, physical
  device, axe, or human comprehension testing.

## Screenshots (`screenshots/`, Chromium 149.0.7827.55, DPR 1, nothing injected but root font size)

- `*.first-frame.png`: an honest unscrolled in-app first screen.
  - `desktop-1280x1000` is clipped to the app shell (the nav is painted).
  - `mobile-390x844` and `text200-320x844` are the full viewport.
  - These are **partial contexts, not whole stimuli**.
- `*.complete-card.png`: an element screenshot of the whole card, after the viewport is
  grown until `<main>` holds the card (asserted), so the nav never covers it.
  - `whole-384x1800` gives the native 344px-wide card.
  - The others are `card-390`, `reflow-320`, `text200-390`, `text200-320` and
    `dark-pref-390`.
- Inspected by eye: c4 desktop first frame (all four limitation lines above the nav, link
  under it), c4 mobile first frame, c4 complete card, c1 320px+200% first frame (pill
  wrapped inside the card), c1 reflow-320 and c2 text200-390. These are engineering
  evidence, not v2 stimuli.

| File | SHA-256 |
| --- | --- |
| `s8a-v1-c1-pattern-change.desktop-1280x1000.first-frame.png` | `3f8fa804ef7514474b36a81004151433e0802b1cb56becde37cf8ae563d86d5b` |
| `s8a-v1-c1-pattern-change.mobile-390x844.first-frame.png` | `5c2618d529d96832c6e2c12a450d104e46af65a7f340943a2fb3ba392c81daa6` |
| `s8a-v1-c1-pattern-change.text200-320x844.first-frame.png` | `68b3630b1d50752968f9da67727e0e362403899f96b8b205a729b0f330462eaa` |
| `s8a-v1-c1-pattern-change.whole-384x1800.complete-card.png` | `eea78a25698389ab31dc52a232b7384b6165444157680f34219e171065c0b51f` |
| `s8a-v1-c1-pattern-change.card-390.complete-card.png` | `7e36b114e99754f005c68f5dd047219d7bf5302ffaebaa65b9a623938ce7e3c8` |
| `s8a-v1-c1-pattern-change.reflow-320.complete-card.png` | `5810da1d39394e26dc9debb2defb14b104c2916caf43815b4973694688026812` |
| `s8a-v1-c1-pattern-change.text200-390.complete-card.png` | `2a6a631368a31957ba3b7e720b2d0d2fd8b91b944c8208e71bab7d53af326768` |
| `s8a-v1-c1-pattern-change.text200-320.complete-card.png` | `bb2acd90f42dec55ba5e55e81fbd21b144698bd25b89c1ac98c0a54163de3959` |
| `s8a-v1-c1-pattern-change.dark-pref-390.complete-card.png` | `7e36b114e99754f005c68f5dd047219d7bf5302ffaebaa65b9a623938ce7e3c8` |
| `s8a-v1-c2-carried-balanced.desktop-1280x1000.first-frame.png` | `27f6a140c98b6048471a08be023f340d3753203ea771f4e78c62060cb746e05b` |
| `s8a-v1-c2-carried-balanced.mobile-390x844.first-frame.png` | `cb95ac2cb09a36e05393a7bfd882d1e0509ced8365952148c819388d96b2d4bf` |
| `s8a-v1-c2-carried-balanced.text200-320x844.first-frame.png` | `5823be8ca4afdc395318025351aeb74e3368d1b724505418dd0fff23d91626d2` |
| `s8a-v1-c2-carried-balanced.whole-384x1800.complete-card.png` | `c8498e524874adf000a693c46a7e1a2154d6392e24759494f1de0bd3713f5adf` |
| `s8a-v1-c2-carried-balanced.card-390.complete-card.png` | `8d92739b65a36c33ff1d313b885a85028ca06f1a2bc716157ef39fba6757659c` |
| `s8a-v1-c2-carried-balanced.reflow-320.complete-card.png` | `3ec26acf2f87372d11eefcd73425572b2f2fdeaabef339821b7d0cfc99bcc3c5` |
| `s8a-v1-c2-carried-balanced.text200-390.complete-card.png` | `6123dce96487e08ddca0454e8f19bbfb5318e3362c08774650c0218bc8ab7e7f` |
| `s8a-v1-c2-carried-balanced.text200-320.complete-card.png` | `8f5830b60645df3d8528dfc4ef61bcc19ee58652a6a408aef47869feb6f98a3e` |
| `s8a-v1-c2-carried-balanced.dark-pref-390.complete-card.png` | `8d92739b65a36c33ff1d313b885a85028ca06f1a2bc716157ef39fba6757659c` |
| `s8a-v1-c3-carried-mixed.desktop-1280x1000.first-frame.png` | `c18e4141c31ed3e71343b6fda24ab3dd406283d2db56d2d347c85e4ec7effc76` |
| `s8a-v1-c3-carried-mixed.mobile-390x844.first-frame.png` | `bbce7206b92d291fdfa1aa7da5b2e2449ebe3b23ca4a8851e15cd0e6cbe7cba1` |
| `s8a-v1-c3-carried-mixed.text200-320x844.first-frame.png` | `48b0677aff47e7db02ffa0877aa8f6924d555d94eba8a28f7b48c18415dd416b` |
| `s8a-v1-c3-carried-mixed.whole-384x1800.complete-card.png` | `70470d8b2a3ba4c7c738dd09088a1f05cd786ee2b07dcf375a607e23685ed602` |
| `s8a-v1-c3-carried-mixed.card-390.complete-card.png` | `e2f04f4894339ed0d3eb321808abc7bee29bd122bd95033d0860d8d400d218b4` |
| `s8a-v1-c3-carried-mixed.reflow-320.complete-card.png` | `ba271849114b4fc5955db92ef1602596fbd77247250bdb8be7fd33c1b811196b` |
| `s8a-v1-c3-carried-mixed.text200-390.complete-card.png` | `7fa36fd6338a8af735c049273bcce71853fd1d5ae0274f625c85c909db6da9c2` |
| `s8a-v1-c3-carried-mixed.text200-320.complete-card.png` | `52ea4734507e44f17f5a0832f0bc6e7ea07a22a40fc50634e9f79ca21dc29871` |
| `s8a-v1-c3-carried-mixed.dark-pref-390.complete-card.png` | `e2f04f4894339ed0d3eb321808abc7bee29bd122bd95033d0860d8d400d218b4` |
| `s8a-v1-c4-unusual-silence.desktop-1280x1000.first-frame.png` | `226dc3392b3d2f21fc50db25908d4f6d282e1baa6e5de1a9306d3a159e77e893` |
| `s8a-v1-c4-unusual-silence.mobile-390x844.first-frame.png` | `bdf7ac59a1b8a0a724a272a2e5437c265164967b44079c23c9281e33367a3a6e` |
| `s8a-v1-c4-unusual-silence.text200-320x844.first-frame.png` | `e41a0c3fcb074c466539804c0eeddb1f0620fb9267347fe15e2f51d2ba071190` |
| `s8a-v1-c4-unusual-silence.whole-384x1800.complete-card.png` | `56b2ac46dcaa48cfd11e229b462d6bd2ac1f8b6630ec965723dfecbdc7106816` |
| `s8a-v1-c4-unusual-silence.card-390.complete-card.png` | `6812b8111e59ecffbdee15777efeaa7767ab1f0228547fff74437e8ea11f2b96` |
| `s8a-v1-c4-unusual-silence.reflow-320.complete-card.png` | `7779d19824efbe6693d51caa3471b6522ddc4edae46dbd792da13cebf285f805` |
| `s8a-v1-c4-unusual-silence.text200-390.complete-card.png` | `f036fdeab69b628035e690a1eeabc3e7de9349497ed123ec7c82bbba025ef70a` |
| `s8a-v1-c4-unusual-silence.text200-320.complete-card.png` | `d1c62d35e18baddabe0e0b9294d3053c1bc9e4405c47198fc828f93dd16e0baf` |
| `s8a-v1-c4-unusual-silence.dark-pref-390.complete-card.png` | `6812b8111e59ecffbdee15777efeaa7767ab1f0228547fff74437e8ea11f2b96` |
| `s8a-v1-c5-insufficient.desktop-1280x1000.first-frame.png` | `2ace774cac93c7214a31cb3d85ec2825473e4bd0d923c6d104799f74e3462b22` |
| `s8a-v1-c5-insufficient.mobile-390x844.first-frame.png` | `66b27ccfedefdaa33cb8cf0b361240cbe9ebc8a6c022f2679fd66ab78158b496` |
| `s8a-v1-c5-insufficient.text200-320x844.first-frame.png` | `f2d7f4ec56be860bec3b99bf309be860e70b4c551485c7ba8dd09402e4592160` |
| `s8a-v1-c5-insufficient.whole-384x1800.complete-card.png` | `77f4339d31bc6a333b70b6c5f010e3b31c8882f063a29619f98d037f9c82082e` |
| `s8a-v1-c5-insufficient.card-390.complete-card.png` | `55352aa71185c11918c3e1d4c88bacf4e1b0cddc22364dbdda4caa8f54815ee8` |
| `s8a-v1-c5-insufficient.reflow-320.complete-card.png` | `97995947d5d3564bee4e143e22bd1e54d59817dd252ea95267a335cf63c828f5` |
| `s8a-v1-c5-insufficient.text200-390.complete-card.png` | `489dbc611b5d832fcd2aad0dbae3bd3583b737a523730135fa99b32f8da4ea87` |
| `s8a-v1-c5-insufficient.text200-320.complete-card.png` | `8c28b4decb027bd802e95f1c90f22a68cb8315b328f0836d09aca6232677fd85` |
| `s8a-v1-c5-insufficient.dark-pref-390.complete-card.png` | `55352aa71185c11918c3e1d4c88bacf4e1b0cddc22364dbdda4caa8f54815ee8` |

`measurements.json` has per-view geometry: main, card, content box, header item rects,
escapes, overlaps, limitation last-line bottom and clearance, link box, and per-element type
and contrast. `SHA256SUMS.json` hashes every other file in this directory.

## Reproduce

```
npm run build
npx playwright test tests/viewport/relationship-read-card.spec.ts
TZ=UTC npx tsx docs/verification/stage8a-option-b-repair-1/capture-evidence.ts
```

Runtime and skills: `RUNTIME.md`. The authority snapshot is
`issue35-resumed-authority.snapshot.md`, byte-identical to
`artifacts/stage8a-option-b/issue35-resumed-authority.md`, SHA-256 `cce29c79…0dc2`.
