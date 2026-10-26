# Owner-approved Option B — UX accessibility correction before any human sessions

**OWNER CHOICE — 26 OCT 2026: B.** Repair the readability of Stage 8A's existing **Relationship Read** cards and then re-capture/re-freeze five real app stimuli **before** any recruitment. This approval covers a bounded presentation-only engineering task and P0 v2 preparation/verification. It does **not** approve participant contact, a new human study design, changes to behavioural claims, a merge, Stage 8B, paid services, private-chat ingestion or the old Jev/GLiDE pilot.

[Study protocol and owner gate #29](https://github.com/parthganguly/chatsense/issues/29) · [Existing P0 v1 draft #34](https://github.com/parthganguly/chatsense/pull/34) · [Original frozen packet at `64efc6d0018106d0644dc620ffca8939ac50c088`](https://github.com/parthganguly/chatsense/blob/64efc6d0018106d0644dc620ffca8939ac50c088/docs/studies/stage8a/2026-10-24-v1/READINESS.md).

## Actual source diagnosis — not a hypothetical redesign

Current component: [`components/analytics/RelationshipReadCard.tsx`](https://github.com/parthganguly/chatsense/blob/main/components/analytics/RelationshipReadCard.tsx).

The core claim-limiting line is currently:

```tsx
<p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-400">{read.limitation}</p>
```

Astra's [frozen stimulus review](https://github.com/parthganguly/chatsense/blob/64efc6d0018106d0644dc620ffca8939ac50c088/docs/studies/stage8a/2026-10-24-v1/STIMULUS-REVIEW.md) documents **11px normal text at 2.56:1 contrast** on the white card. That's below the [WCAG 2.2 AA 1.4.3 minimum 4.5:1 for normal text](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). We also have small supporting text, weak caveat salience, differing accent borders and read-strength tags; audit these, but do not use them as permission for a cosmetic redesign. The current five exact app-generated cards (including unusual silence and its "past count, not a promise" sentence) are the authoritative *before* evidence.

**Goal:** Readable, legible historical claims and their limitations with coherent visual hierarchy **without changing what the app infers or claims.** It must remain an honest metadata-only reader rather than a predictor, relationship judge, motive classifier or emotional diagnosis.

## What counts as a PASS for the UI correction

1. **Contrast and legibility:** Every claim-bearing normal text element in the affected hero card, especially its **inline limitation**, meets measured rendered contrast **>=4.5:1** under actual backgrounds/states; any meaningful non-text status indicator meets applicable 3:1 contrast or has a redundant textual cue. A sensible design target is ~14px/comfortable line height for caveats (not a WCAG-mandated absolute minimum). Avoid a "passes color calculation but remains tiny" outcome. Document computed styles and actual measured foreground/background pairs, including white and any translucent surfaces.
2. **Responsive, zoom and semantics:** Test the five states at fixed desktop and mobile viewports, narrow **320 CSS px** reflow without horizontal clipping, and **200% text zoom/resize** without lost information. Keyboard focus and actual links must remain visible and navigable. Do not push the card's essential limitation below a fixed viewport or silently crop it in screenshots. In the original P0 setup the native DPR-1 selected cards were 344 CSS px wide and up to 634 px tall; if an enlarged new card no longer fits the planned **>=800 usable CSS px** participant display, revise device/presentation in a versioned scientific amendment **before** P1—never secretly scale or crop.
3. **Scientific claim preservation:** Keep **verbatim** `read.headline`, `read.summary`, every evidence fact, `read.historicalNote`, `read.stalenessNote`, `read.limitation`, confidence label and details destination for all five frozen synthetic inputs. Retain the original factual counts, dates, conditions, input fixtures and fixed clock semantics. No new predictive/motive language, probability, partner score, copywriter paraphrase, or change in `@chatsense/core` / behavioral contract. A visible "what this means" addition would change the scientific stimulus; don't add instructional wording without Astra's explicit revised-study rationale. Visual hierarchy changes are **deliberate** and require re-freeze.
4. **Verification:** Use existing **Playwright browser captures, visual-diff review and computed-style assertions**, plus accessibility automation such as `@axe-core/playwright` **only if available/justified and without adding unnecessary production dependencies**; automated checks never replace manual visual and keyboard/zoom inspection. Existing `npm run check`, `npm run test:viewport` and safety scanners should pass. Capture failures and skipped checks explicitly, not a blanket WCAG compliance claim. Reference [Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing) and [WCAG 2.2 resize/reflow](https://www.w3.org/TR/WCAG22/).
5. **Bounded source change:** Favor minimal localized TSX/Tailwind styling adjustments with a dedicated accessible contrast regression. Don't refactor analytics, add design-system libraries, change the theme globally, or alter unrelated tabs. The actual code path is known; no invented prerequisite of a new Figma file or external site extraction.

## The best relevant skills and tools, selected by actual fit

- **React/Next.js skill:** Vercel's installed `react-best-practices` guidance for component quality and accessibility when TSX is edited, **if available to the active agent harness**; do not claim a ChatGPT-connected plugin skill is automatically mounted inside a Mac CLI.
- **End-to-end verification skill:** Vercel `verification` workflow, adapted to this UI-only story: synthetic fixture import → deterministic `RelationshipRead` data → rendered DOM → computed contrast/reflow → captured screenshots. The repository already includes `@playwright/test`; use its native capture/test scripts.
- **Accessibility standard:** W3C WCAG 2.2 **1.4.3 contrast; 1.4.4 text resizing; 1.4.10 reflow**, with manual visual/keyboard review; `@axe-core/playwright` is optional automation. Inspect relevant local Claude/Codex design/front-end skills if installed and choose ones that materially improve this change.
- **No extra system by default:** Firecrawl website-design extraction and Figma redesign are disproportionate to one known TSX contrast/hierarchy defect; do not create new artifacts, plugins or billing dependencies merely because they exist.

## Ownership and sequential native execution (Astra orchestrates; Opus and Sol retain judgment)

**1. Astra / Codex — product-science acceptance owner.** Read the actual frozen v1 cards, ascertain which visual messages convey scientific limits, and agree the UI-only invariants with Opus. Keep the immutable v1 study PR #34 and captured packet as historical evidence. Record the precise UX acceptance requirements and a before manifest; ensure this is a *presentation-only* change, not a stealth change of study endpoints.

**2. Opus 5.5 / real Claude Code CLI — engineering and design co-lead.** Astra delegates via the verified, existing authenticated native `claude -p` route; Opus may challenge the layout/hierarchy approach. In an isolated branch/worktree from correct current app source, write failing-first contrast/legibility/viewport cases, implement the minimal fix, test repeatedly with real DOM and screenshots, and submit a **DRAFT** focused UX PR plus before/after visual comparisons and computed contrast measurements. Report exact source hashes, scope diff, audit caveats, branch and native runtime metadata. Do not merge or change PR #34's frozen files.

**3. Sol 6.1 / fresh Codex subagent — adversarial verification on fixed UX commit.** Independently inspect all five DOM strings and exact fixture/clock identity vs v1, computed color/size/line-height under actual app rendering, 320px/200% reflow, clickable links, screenshot completeness and the existing scientific safety tests. Include fresh counterexamples (e.g. a too-long limitation, light/dark scheme, browser zoom, and longest D card). Report **UX PASS / FAIL / BLOCKED** with evidence and hash; do not patch the audited commit or rely solely on Opus's screenshots.

**4. Astra — P0 v2 study-freeze owner.** Only after independent UX PASS, recapture **all five** real rendered cards through the existing synthetic fixture/file-input path with fixed clocks. Create **new versioned** stimulus/preregistration folder (for example `docs/studies/stage8a/2026-10-26-v2/`) and **new** frozen inventory/checksum manifest, explicit v1→v2 screenshot/DOM/typography delta, native-scale display rule and reason for the change. Preregister the P0 v2 methods before any human exposure; preserve issue #29's original five acceptance thresholds and participant-level denominators. Sol independently checks stimulus and scoring consistency on a fixed v2 packet. If v2 no longer fits proposed display, solve presentation/readiness before calling P0 READY. The original [P0 v1 at `64efc6d`](https://github.com/parthganguly/chatsense/pull/34) is never overwritten, secretly relabeled or mixed in one participant cohort.

## Explicit completion gates

- **U1:** Opus new focused draft UX PR (not merged), actual before/after browser captures, exact text preservation and accessibility measurements.
- **U2:** Sol independent **UX PASS** on that exact frozen source revision (or evidence-backed FAIL, triggering a bounded Opus correction).
- **U3:** Astra and Sol complete **P0 v2 READY** packet with all five new real images, updated hashes, stable methods and an explicit reviewer decision.
- **P1 HUMAN SESSIONS:** STILL REQUIRES A SEPARATE OWNER APPROVAL and actual named facilitator/two human reviewers, private consent/withdrawal contact, encrypted response storage, compensation/voluntary recruitment choices and approved native-scale display. **No participant contact or human response data now.** Stage 8B remains blocked.

No launch, external model-provider fees, new human study, private chat export, production merge, or Stage 8B feature follows automatically from this task. GitHub comments coordinate Mac-native work; they do not start those processes.

