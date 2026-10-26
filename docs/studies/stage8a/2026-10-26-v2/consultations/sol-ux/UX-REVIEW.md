# Independent repaired-source UX review — UX PASS

**Exact immutable source: `72eeb00d436d3a85a117fb8fced3cf7597b12d31`.** This verdict accepts the presentation of the five frozen Stage 8A Relationship Read hero cards within issue #35 Option B. It supports U2 on this revision. It is not global app certification, a P0 v2 freeze, permission for human sessions, or human-comprehension evidence.

Reviewer: fresh Codex task `/root/sol_stage8a_repair_audit`, designated Sol 6.1 by Astra. The system identifies this agent as based on GPT-6; an exact provider model ID is not exposed and is not invented. Runtime and actual local skill receipts are in `RUNTIME.json` and `skills.json`. No other harness's plugin registration is claimed. No delegation, tracked-file edits, commit, push, external comment, merge, participant contact, paid API or private-chat processing occurred.

## Independent evidence and preservation

I read the full current issue snapshot, Astra's acceptance contract, the prior independent UX FAIL, and the repair report/runtime. Their conclusions were hypotheses to check. My evidence uses a normal fresh `npm ci`, fresh production build through `npm run check`, and my own Playwright scripts and PNGs from a task-owned static server at port 4332. No Opus image was reused as acceptance evidence.

Initial and final HEAD are the exact commit above, with empty git status. The component's independently recomputed SHA-256 is `033be9330b718288147dba63bebab8a7bd9b2944d0c7f2481c770711442b10b5`.

All 16 reference files—clock inventory, five original exports, five expected reads and five captured card innerTexts—byte-match the read-only v1 packet at `64efc6d0018106d0644dc620ffca8939ac50c088`. `fixture-identity.json` records paths and hashes. Diff against v1 is empty for the inspected core/contracts/selection/app/lib/features/fixture/utility/hook/style/manifest paths (`logs/science-scope.diff`). Product change against the original main baseline is localized to `RelationshipReadCard.tsx`; the added test fixture directory consists of the exact v1 copies. The repaired-source diff against rejected `8ee5794` changes presentation classes/comment only, preserving bindings/order and details labels/href.

Forty fresh real file-input imports cover all five cases in eight modes: desktop1280×1000, phone390×844, narrow320×844, desktop200% root font, 390px+200%, 320px+200%, OS-dark preference390×844, and native whole-card384×1800. Each context uses DPR1, en-US, UTC, and its original `page.clock.setFixedTime` **before navigation**. Every row matches frozen `Date.now()`, exact v1 card innerText, and `#narrative-heading`. This exact text comparison covers every scientific string, number, date, historical/staleness note, limitation, confidence and details label. No predictive/motive claim or selection rule was added.

## D1 and D2 are repaired

Unscrolled desktop main is y185–823. All limitation lines in all five cards are geometrically inside that main and actually hit-test to the limitation element (`counterexample.json` records each original line before stress mutation). The independent first-screen pixels confirm D's final limitation line is visible above the navigation.

| Card | Last limitation text-line bottom | Clearance to823 | Details link in desktop |
| --- | ---: | ---: | --- |
| A pattern change |704|119|717–737, visible|
| B balanced |658|165|671–691, visible|
| C mixed |678|145|691–711, visible|
| D unusual silence |814|9|827–847, requires scroll|
| E insufficient |666|157|679–699, visible|

D's entire essential limitation is now visible without scrolling. Its link remains below the desktop fold and is reachable; this is explicitly distinct from essential-limitation visibility. Ordinary390×844 shows D's link at727–747 above main bottom767.

At320px+200%, card content bounds are x76–247. A/B Strong read and C/D Useful read pills wrap to two lines within x76–247; E Light read is x76–232.36. At390px+200%, content bounds are x76–317; A/B pill right252.27, C/D247.25, E232.36. Every actual text Range and element/pill box stays inside the content bounds, with no header overlap or lost glyph. Screenshots of all five320px+200% headers were inspected. The headline keeps its28px normal leading, and no scrollHeight/clientHeight glyph-overflow flag appears; the rejected24px-leading pitfall is absent.

Across all40 rows, the independent probes found zero element/text-range escapes, zero glyph-overflow flags, zero intersecting text-line boxes from distinct text elements, and zero line reachability or ancestor-clipping failures. Every rendered text line was individually scrolled into the actual main and checked with `elementFromPoint`, rather than relying on document width or scrollWidth alone. Full geometry and per-line records are in `measurements.json`; `summary.json` derives the checks.

The200% mechanism is root-font enlargement, not browser UI zoom or DPR. Computed font sizes **and leading actually double for every card text row**:12→24,14→28,20→40. There is no injected text-size reduction. Long narrow/enlarged cards require vertical scrolling; this is reported honestly. Mid-word wrapping, including A's long headline, keeps all glyphs and exact text.

## Contrast, type and keyboard

Every measurement/capture waits for `document.fonts.ready` and every card ancestor opacity1. Actual computed background layers and alpha foregrounds are composited over the canvas. The five distinct settled text pairs are identical under light and OS-dark preference:

| Foreground RGB | Composited background RGB | Contrast |
| --- | --- | ---: |
|2,6,23|255,255,255|20.17284:1|
|6,95,70|255,255,255|7.68368:1|
|51,65,85|241,245,249|9.45192:1|
|51,65,85|255,255,255|10.35475:1|
|71,85,105|255,255,255|7.57766:1|

The minimum claim-bearing contrast exceeds4.5:1. Body/limitation are14px/20px, enlarged28px/40px. Headers/pills are12px; headline20px/28px. The measurements record foreground/background, family, size, leading and each ancestor's opacity/overflow. Borders/dots are decorative; the words and list structure carry the facts. I make no blanket non-text, animation-state or WCAG certification claim.

All five ordinary-phone links were keyboard checked: Shift+Tab leaves, Tab returns, `:focus-visible` is true with1px auto `rgb(0,95,204)` outline, and Enter activates the actual `#narrative-heading`. Per-card destination text and focus geometry are recorded; D's visible outline was inspected in pixels. Labels naming Changes/People/Rhythm still point to Overview's narrative heading. This pre-existing semantic mismatch is preserved by the explicit scientific invariant, remains a separate product observation, and is not presented as ideal semantics.

## Fresh negative counterexample and images

After recording each original exact v1 innerText and all original desktop limitation-line hit tests, I replaced only the test DOM limitation with eight long audit sentences plus one genuinely unbroken121-character Q token. At320px+200%, all five stressed cards retain their enlarged font sizes; there are no escape or glyph-overflow flags. All160/144/148/184/154 card line ranges respectively are individually reachable without ancestor clipping. `counterexample.json` records the original text, mutation, computed styles, geometry and line results. These audit words never entered product source or study stimuli. D's complete stress pixels were inspected, including the wrapped Q token.

Own native complete PNGs use a real384×1800 viewport, DPR1, with each whole card asserted inside the actual main **before** element capture. Encoded dimensions, bytes and SHA-256 are recorded in `png-inventory.json`:

| Card | Encoded native PNG dimensions |
| --- | --- |
|A|344×546|
|B|344×500|
|C|344×520|
|D|344×656|
|E|344×508|

All five fit800 usable CSSpx whole at native100%, without scale/crop. I inspected all five native complete images, all five320+200% first-screen headers, D desktop first-screen, D dark-phone first-screen, D390+200% whole, D keyboard focus, A320+200% whole and D's counterexample whole. Geometry checks cover every mode/card beyond these selected pixel inspections. The65 audit PNGs are independent evidence, **not Astra's eventual P0v2 stimuli**. Files named `first-screen` are honest viewport contexts and may show only part of a long card; `whole-native344` files contain the entire card. Enlarged whole screenshots use a taller viewport after the original-mode checks and are separately named.

## Required checks and limits

`commands.json` gives commands/statuses and log paths. Normal lockfile `npm ci`, fresh `PATH=/tmp/s8a-venv/bin:$PATH npm run check`, `npm run test:viewport`, both independent browser scripts, and all five frozen-read language scans exited0. Full check includes lint, typecheck, boundary/read/onboarding/forecast tests,21-fixture TS parity,10-fixture forecasting parity, evaluation and fresh production export. Viewport suite:40 passed,8 deliberately skipped duplicate single-viewport cases. No failed or unreported skipped independent case was discarded. Existing Next ESLint-plugin warning and npm-ci's30 dependency audit findings are retained in logs; no manifest upgrade was authorized/performed. The required forecast evaluation also emitted its ordinary ignored `artifacts/forecasting` output.

The320+200% global app title overlaps the refresh button and export-name text truncates. This is plainly visible in my first-screen PNGs, unchanged in the out-of-scope shell, and does not obscure the hero's text/pill once it enters main. I judge it a separate global-shell defect rather than a failure of this bounded five-card correction. This verdict must not be cited as app-wide resize/reflow acceptance. D's below-fold details link and the tab-label/destination mismatch are also expressly retained observations.

No genuine browser UI zoom, Firefox/WebKit, screen reader, physical device, forced-colors, axe or human comprehension test was performed. No DPR-only enlargement or browser-zoom-equivalent simulation is claimed. Human study remains **NOT_RUN**; P1 and Stage8B remain unauthorized. Astra may now independently recapture/freeze P0v2 and request a separate fixed-packet/scoring audit; that work was not started here.

Port4332 was stopped after the probes; Playwright's suite server ended with its run. Final HEAD/tracked status are unchanged and clean. `SHA256SUMS.json` seals every audit artifact except itself. Historical v1 and prior rejected-source evidence were not rewritten.
