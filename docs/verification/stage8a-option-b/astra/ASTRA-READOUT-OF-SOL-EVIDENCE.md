# Astra readout of independent Sol evidence

26 October 2026. Author: Astra. This is **not** a completed Sol review or a Sol sign-off. Sol 6.1's fresh Codex subagent `/root/sol_stage8a_optionb` failed on a usage limit before producing its final `UX-REVIEW.md`. Its independently generated measurements, screenshots, scripts and logs were preserved byte-for-byte in `../sol-partial/`; the copy receipt is `sol-preservation-receipt.json`.

Audited source: **8ee579420d56038800d0a4f453deb7e989d7325c**, detached clean checkout at `/Users/parth/.codex/worktrees/stage8a-ux-audit/whatsapp-analytics-ui`. Sol used a fresh dependency installation/build, port 4322, real synthetic file import, original fixed clocks, en-US/UTC and Chromium. It did not patch the candidate. Native model selection was explicitly `gpt-6.1-sol`, with a fresh conversation (`fork_turns: none`). No provider request ID is exposed by the collaboration interface; none is invented here.

## Acceptance judgment: UX FAIL

**D1 — essential limitation is hidden in the normal desktop first frame.** Sol independently reproduced the longest card at desktop 1280x1000: main visible area y185..823; card y205..901 (344x696); limitation bottom851. The last 28px of its paragraph box are below the fixed navigation boundary. The actual screenshot visibly cuts off the final limitation lines. This violates issue #35. It is not a discretionary owner waiver or a new requirement. The pre-existing details link can remain reachable by scrolling, but that does not excuse newly hiding the essential limitation.

Evidence: `D-blocker-measurements.json`, `measurements.json` (D/desktop) and `s8a-v1-c4-unusual-silence.desktop.partial-first-screen.png`.

**D2 — header badge leaves its card and viewport at enlarged text.** At root font-size 200%, width 320, A/B badge bounds are x176.27..352.53 and text reaches332.53. C/D text reaches 327.52. All four lose text past 320; E's pill also extends past 320 even though its shorter text stops 312.63. At390px/200%, badges extend outside the card content area. The header's nonwrapping flex layout and `shrink-0` badge cannot satisfy the enlarged layout. Document/element scroll-width checks in the existing regression missed this actual geometry.

Evidence: `measurements.json` (`combined` and `text200` rows), all five `combined.partial-first-screen.png` images and `probe.cjs.txt`. The probe examines rendered text ranges as well as element bounds; 200% is actual font enlargement, not DPR.

Sol's messages to Astra explicitly reported both blockers and recommended localized spacing plus a wrapping/stacking header. Astra independently viewed the D desktop failure, A combined failure and all five complete 344px audit images and agrees. These failures are sufficient to reject the candidate even without a final completed independent review.

## What the recorded evidence does support

- 35 fixture/mode rows: five cards across desktop 1280x1000, phone 390x844,320px,390px+200%,320px+200%, OS dark preference and whole-card384x1800. Every row has byte-identical rendered `innerText` versus v1 and the unchanged details href. Fixture/read/text identity receipt covers16 copied files including the clock inventory. Core/scientific source diff is empty.
- Across the measured rows, minimum text contrast is 7.5777:1. Normal limitation is 14px/20px with 10.35:1; enlarged text really doubles. Light/dark card colors remain the same. This supports contrast/size checks, not full UX acceptance.
- All five full-card audit images are present at native DPR 1 and 344px width (heights 582,536,560,696,544). They use a tall real viewport and contain the final link; these are engineering audit images, **not selected P0 v2 stimuli**. Separate first-frame screenshots honestly retain clipping.
- The existing viewport suite reports 40 passed and 8 skipped by design. Sol's `check.log` and `fresh-build.log` reach successful static export; `safety.log` records all five frozen-read scans passing. Opus separately recorded `npm run check` exit 0. The terminated Sol run did not leave a structured process-exit receipt; do not invent one.
- A separate genuine 120-character unbroken-token stress probe has 91 line-reachability checks, and a keyboard record showing visible focus, Shift+Tab leaving, Tab returning and activation to `#narrative-heading`. Raw data are in `stress-keyboard.json`; these narrow successful checks do not repair D1/D2 or constitute a completed review of every enlarged-state interaction.

Initial Sol harness failures are retained: an unnecessary dependency-prefix workaround could not resolve `@eslint/js`; an audit `.cjs` script inside ESLint's scan produced undefined-global errors. The ordinary `npm ci` installation and text-archived probe scripts resolved those harness issues before the final logs. They are not silently omitted or attributed to product regressions.

## Remaining work on the repaired immutable revision

Opus must reproduce D1/D2 with failing assertions, tighten only local card spacing while retaining14px/20px body/caveat text, and wrap/stack the header so actual badge/text bounds remain inside the content area at 320px+200%. Correct the engineering report's inaccurate claim that a confidence label identifies the scientific state. Retain all visible scientific strings and hrefs. Preserve historical failed evidence; record fresh before/after evidence and complete regressions.

Sol must then independently rebuild the **new exact commit**, verify all five fixtures/clocks/strings, contrast, default first-frame caveat clearance,320px reflow,200% text and their combination, actual leaf bounds/overlap, scroll reachability, keyboard focus/destination and fresh whole-card screenshots. Browser-zoom equivalents must remain labeled simulations. WebKit/Firefox, physical Android, screen readers, forced colors and human comprehension were not established by this run. No blanket WCAG claim is warranted.

Only a completed evidence-backed UX PASS permits Astra's five fresh P0 v2 captures and freeze, followed by an independent fixed-packet/scoring review. No inherited v1 audit or partial Sol run substitutes for those gates.
