# Independent UX review — UX FAIL

Immutable candidate: **8ee579420d56038800d0a4f453deb7e989d7325c**. Baseline main: `2415a51385f60ff9e43ca2e26b66c8c9a7fd6267`. Frozen v1: `64efc6d0018106d0644dc620ffca8939ac50c088`. Draft UX PR: https://github.com/parthganguly/chatsense/pull/36.

Reviewer identity: native Codex subagent task `/root/sol_stage8a_optionb`, designated Sol 6.1 by Astra's task. System instructions describe this agent as based on GPT-6; an exact provider model/runtime identifier is not exposed and is not invented here. This is independent browser/source verification, not the implementer's report. No production files, fixtures, tests, scientific copy or manifests were edited. No commit, push, comment, merge, participant contact, private export, paid API or delegated agent was used.

**Decision: UX FAIL. U2 is unsatisfied; this candidate must not be accepted as the P0 v2 source freeze.** Opus's engineering PASS with D1 outstanding does not satisfy the owner's explicit acceptance contract. Repair capacity/quota is separate from this UX verdict.

## Blocking findings and bounded repairs

**D1 — essential limitation obscured in ordinary desktop frame.** Independently reproduced through the real file input and frozen clock on a fresh production export served on port 4322. At 1280×1000, actual main bounds are x448,y185,width384,height638,bottom823. D's card is x468,y205,width344,height696,bottom901. Its limitation occupies y758–851; the final28px extend beneath the main/navigation boundary823. Its details link is y863–883, wholly below the initial scroll window. `D-blocker-measurements.json` and D's `desktop.partial-first-screen.png` show this; I visually inspected the screenshot. Scrolling can reveal the content, but the owner specifically disallows pushing the essential limitation below this ordinary fixed desktop viewport. Narrow/enlarged vertical reachability and whole-image study fit do not waive this requirement.

Repair: tighten only the card's block spacing/summary leading enough to bring the complete D limitation above main bottom823, retaining verbatim content and at least14px/20px body and caveat typography. Preserve a visible clearance margin; verify actual text-line bottoms, not only paragraph/card height. Do not change the global shell by default. Whether the details link also fits should be reported honestly, while preserving its reachability and destination.

**D2 — enlarged header escapes the card; four confidence labels lose text at320px.** Root font size200% genuinely doubles every card text element (12→24,14→28,20→40 CSS px, verified for all five; DPR remains1). At320 CSS px, the card spans x40–280. The first header text has min-content width76.265625; the nonshrinking pill begins x176.265625. A/B pill bounds end352.53125, and actual “Strong read” text ends332.53125, beyond the320px viewport. C/D “Useful read” text ends327.515625. E “Light read” text ends312.625, still outside the card's right edge280 although inside the viewport. At390px/200%, A/B pill background also extends slightly beyond the card (right352.53125 vs card right350). The combined first-screen screenshots visibly confirm the clipping. Leaf/text Range geometry catches this even when document width and each element's own scrollWidth appear acceptable.

Repair: allow the header to stack/wrap or otherwise allocate valid widths at enlarged/narrow sizes. Remove the nonwrapping layout constraint as needed without reducing text size, changing confidence strings, hiding content or adding scientific copy. Keep both label and pill inside the card, with no overlap or clipped glyphs.

Also correct the nonvisible comment/report claim that confidence labels carry “state”: Strong/Useful/Light read describe read strength, and do not uniquely identify pattern-change/carried-contact/unusual-silence states. Neutral state borders are acceptable as decoration because the actual headline/evidence still carry the read; this wording correction requires no visible scientific-copy change.

## Preservation and measured coverage

I inspected the exact component diff and relevant regression/source/instruction files. Only the card's presentation changes in product source; its data bindings, scientific strings, link labels and `#narrative-heading` href remain unchanged. Core/fixture/safety-helper diff against v1 is empty. All16 copied reference files match v1 bytes: clock inventory plus five exports, five expected reads and five captured innerText files. See `fixture-identity.json` and completion `inspected-file-hashes.json`.

All five real file inputs were imported in each of seven modes, with clocks installed **before** navigation: desktop1280×1000, mobile390×844, narrow320×844,390px with200% root font, combined320px with200% root font, OS dark preference390×844, and whole-card384×1800. All35 rows preserve the exact v1 rendered innerText, frozen Date.now and details href. Expected reads/fixture bytes are unchanged. The card rendering uses the same precomputed core read. No new predictive/motive wording was introduced.

Computed final card colors (foreground/background, sRGB) yield these five distinct text pairs:

| Foreground | Background | Ratio |
| --- | --- | ---: |
|2,6,23|255,255,255|20.1728:1|
|6,95,70|255,255,255|7.6837:1|
|51,65,85|241,245,249|9.4519:1|
|51,65,85|255,255,255|10.3547:1|
|71,85,105|255,255,255|7.5777:1|

The probe composites alpha foreground and ancestor background layers. Supported light and OS-dark card styles retain these pairs. Ordinary limitation/body text is14px with20px line height (summary24px); small headers/pill are12px and headline20px. No normal text color failure was found in the final static card styling. A D mobile first-screen capture initially caught a transient import fade; it was recaptured after explicitly waiting for every ancestor opacity1, recorded in `D-mobile-settled-measurements.json`, and the corrected screenshot was visually inspected. The initial general probe's color computation does not model group opacity during animation; no transient-animation contrast certification is claimed.

Neutral frame/dividers, decorative compass and list dots do not encode a unique scientific state. The neutral low-contrast border/dots are not asserted to meet3:1; text/list structure carries the information. This is not a general non-text or forced-color conformance claim.

At ordinary320px, all five card text ranges remain within the viewport. At390px/200%, the header's card containment fails as described above; combined320px/200% loses confidence text A–D. Vertical growth at narrow/enlarged sizes is expected, and is distinct from D1's ordinary desktop failure. No genuine browser UI zoom was tested; root-font resizing is an explicit text-resize mechanism, not browser zoom or DPR substitution. No browser-zoom-equivalent simulation is claimed.

A fresh test-DOM-only long limitation contains repeated new wording plus one genuinely unbroken120-character Q token. At320px/200%, all91 line ranges wrapped (maximum right241.03125 within the card content bounds) and were individually scrolled into the actual main region, with elementFromPoint confirming reachability. These stress words were never study stimuli or source data. `stress-keyboard.json` records original v1 text match before mutation. Keyboard Tab reached the details link, `:focus-visible` was true with1px `rgb(0,95,204)` auto outline, Shift+Tab left and Tab returned, and Enter activated `#narrative-heading`; actual destination text was “Balanced volume, uneven contact maintenance”. The destination remains Overview's narrative heading even for labels naming another tab: existing behavior, preserved by mandate, not a new semantic fix or a claim of perfect link wording.

## Screenshot completeness and study fit

I visually inspected complete native344px-wide A–E card PNGs and desktop/mobile first-screen contexts, including D's corrected mobile frame. Complete captures use a384×1800 viewport, DPR1, without injecting layout CSS/DOM changes. Card screenshot heights are A582,B536,C560,D696,E544; all fit an800px usable display whole at100% with no scaling/cropping. D's capture is the actual whole card, including limitation and link, unlike a plausible-sized element PNG painted through the short desktop main area. This establishes candidate image geometry only; Astra must still recapture/re-freeze the repaired revision and preregister the actual native-scale display. These audit images are not an approved v2 study packet.

Every `*.partial-first-screen.png`, stress screenshot and destination screenshot is explicitly a viewport context, not a whole stimulus. Desktop D and mobile D's link do not initially fit. Do not substitute a first-screen image for a complete card or infer that every card fits its app viewport from the complete-card PNG.

## Checks, failures and limits

Already-completed independent runs on this immutable source:

- `npm ci`: completed from existing lockfile; no dependency manifests changed.
- Fresh `npm run build`: exit0, `fresh-build.log`; normal existing Next ESLint-plugin warning recorded.
- `PATH=/tmp/s8a-venv/bin:$PATH npm run check`: exit0, `check.log`. Lint, typechecking, all listed research/boundary/onboarding/read tests,21-fixture TS parity,10-fixture forecasting parity, evaluation and production build completed. Python pandas came from the temporary environment, not a manifest change.
- `npm run test:viewport`: exit0, `viewport.log`:40passed/8skipped. Four single-viewport tests intentionally run once at390px; their360/412px duplicates account for all eight skips. These tests check scroll reachability and element/document widths; their PASS does not cover D1's initial visibility or D2's combined leaf geometry.
- Independent frozen-read safety scan: five passed, `safety.log`.
- General independent browser probe:35 rows complete, `measurements.json`; targeted D1 and settled-D-mobile files provide additional measurements. Long-token/keyboard results are in `stress-keyboard.json`.

Failed/adjusted audit attempts are preserved, not product regressions: `initial-dependency-workaround-failed.log` records missing @eslint/js in an initial archived-source/dependency-link attempt; that temporary copy was removed. `audit-script-lint-interference.log` records lint encountering the authored CJS audit script; it was renamed to a non-source extension and the ordinary full check then passed. An initial direct tsx invocation of a .txt script failed; the successful safety scan used tsx -e. The initial stress locator/name attempt timed out; the corrected standard synthetic filename/direct last-paragraph locator verified original v1 text first, then completed the91-line stress. Failed invocations were observed in tool output; some reused log paths contain only the successful final invocation. The preserved filenames/scripts are reproduction evidence, not a promise that an audit helper will itself be linted as application source.

No additional broad test reruns were performed after completion. No axe dependency was installed. Chromium only; no real browser zoom, Firefox/WebKit, screen reader, physical Android, human comprehension, forced colors, blanket WCAG compliance or production acceptance is claimed. Port4322 was started only for this audit; Astra reports stopping the task-owned server after the interrupted turn. No new server was needed for completion.

## Minimum repair verification for Opus and the next immutable audit

1. Failing-first D desktop assertion: complete limitation text-line bottom plus clearance <=actual main bottom823 at1280×1000, clock fixed before import; retain14px/20px minimum and exact text.
2. Failing-first header tests for all five at390px/200% and320px/200%: measure every text Range and pill/header bounds against card/content/ancestor clip bounds; assert no lost glyph, overlap or escape. Verify every text size actually doubles.
3. Recheck ordinary390px/320px, OS dark text pairs, long D and long limitation with one unbroken120-character token, line-by-line scroll clearance, Tab/Shift+Tab/focus and real href activation.
4. Preserve exact16-file v1 reference hashes, all five rendered scientific strings/read facts/clock semantics, core/contracts and link destination. Recapture complete344px cards at DPR1 and honest first-screen contexts; inspect the resulting pixels.
5. Run the existing required regression/safety checks on the repaired revision, recording all failures/skips. Hand Astra a new immutable commit for independent Sol review. Neither D1 nor D2 may be waived because prior broad tests pass or native Opus capacity is blocked.

## Evidence integrity

All48 original audit files match byte-for-byte their preserved copies in `1f3e306bac5a6200785adf0841454fa92f24fe6c` under `docs/verification/stage8a-option-b/sol-partial/`. `original-evidence-receipt.json` lists exact bytes and SHA-256 for every original file and screenshot. New machine-readable `independent-measurements-summary.json` derives all35 rows without modifying originals. `inspected-file-hashes.json` records source/instruction/fixture hashes. `SHA256SUMS.json` hashes every completion artifact except itself. Before/after identity receipts confirm candidate HEAD and empty tracked/untracked git status (audit/runtime artifacts are ignored).

Selected SHA-256 receipts (all remaining files are in the machine-readable inventory):

| File | SHA-256 |
| --- | --- |
|`measurements.json`|`f6382d1660da38241fa6e242317c86a8dd670a3674f1075f7b6f7dc87a205dda`|
|`D-blocker-measurements.json`|`d300dfeecbe3ce033102d0f8a6019facad6b49dd5388f00f06e5459a324b487c`|
|`stress-keyboard.json`|`2da9a87da857d07bdeae85c7ec1f376a8671833bf76048c2317803e2da7c224e`|
|`check.log`|`042b3a7230096e8eecfbbe848ed974b849be0a14d2568b902bd917bce70eefcc`|
|`viewport.log`|`ea1ea2608e4293bd431cdc62be3f05c33da8513e5850f737b1d4e3fa716051d8`|
|`s8a-v1-c1-pattern-change.whole-344px.png`|`175a97afae81de586c174b12906e4325d6205a91001d24a8a43724d6ecfeab06`|
|`s8a-v1-c2-carried-balanced.whole-344px.png`|`9ea6852193a568cd4efb4f23a515c1c55f4f68f433048d4f863bc336e3a189cc`|
|`s8a-v1-c3-carried-mixed.whole-344px.png`|`4c5758d73fba9f548866d0e4e86610d0517cf2582c2c8ff9f385275ab6950c28`|
|`s8a-v1-c4-unusual-silence.whole-344px.png`|`5577f1748ec6a18223599139c8dca462b42077c6123260ca3d65f25adfa785db`|
|`s8a-v1-c5-insufficient.whole-344px.png`|`6ecba7a7a257524107630036d924bb595dc64afcd581128486c1404ddca317b9`|
|`s8a-v1-c4-unusual-silence.desktop.partial-first-screen.png`|`6586c7e630a83bef0a41c5de5db94cb8f8c31bd15efa6c3730a17f65a3475f0b`|
|`s8a-v1-c1-pattern-change.combined.partial-first-screen.png`|`98ce972e4418dad49bb7b40e64de44e2bd6daba5a4e8cda3f0dc9b16e2d3baa8`|
|`components/analytics/RelationshipReadCard.tsx`|`b43ad4c7dae230e62260bb5a0e9b1c284ed935f9285d4e6dc85174cead66f648`|
