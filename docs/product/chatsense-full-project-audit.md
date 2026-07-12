# ChatSense: full project audit — scientific, technical and human review

**Status:** audit only — no runtime changes in this PR.
**Written:** 2026-07-12, from `product/full-project-audit`, stacked on PR #19 (`product/scenario-evidence-research`), itself stacked on PR #18 → PR #17 → `main` (PR #16 merge, `ff295bd`). Merge order: #17 → #18 → #19 → this PR. When the stack merges, this branch rebases onto `main` and its diff shrinks to this document, `chatsense-master-plan.md`, and six pointer edits.
**Audience:** the human owner and any later model (GPT-5.5, Sonnet 5, Fable, Codex) continuing the work. The companion document [`chatsense-master-plan.md`](./chatsense-master-plan.md) is the short authoritative baton; this audit is the evidence behind it.

**Evidence labels used throughout:**

- **Verified in repository** — checked directly against code, contracts, fixtures, or workflows at this commit.
- **Established evidence** — peer-reviewed or primary external source.
- **Supported methodology** — standard statistical method; its fit to ChatSense is judgment.
- **Product judgment** — a call this audit makes and defends, not a fact.
- **Product hypothesis** — plausible, unvalidated with users.
- **Requires validation** — must not ship or be relied on without a check.
- **Contradicted by implementation** — a documentation or plan claim the code does not match.
- **Not inferable** — cannot be established from chat metadata at all.

---

## 1. Executive verdict

Rating scale used below: **Strong** = better than it needs to be at this maturity; **Adequate** = fit for purpose now, known gaps; **Weak** = below what the next stage needs; **Unproven** = no evidence either way.

| Dimension | Verdict | One-line basis |
|---|---|---|
| Technical quality | **Strong** | Deterministic core, contract-owned thresholds, exact cross-language parity over 21 fixtures, honest censoring semantics (Verified in repository) |
| Scientific quality | **Strong for what it claims; narrow** | Everything shipped is counting and robust description with sample gates; nothing overclaims. Several planned constructs are heuristics presented as such (Verified in repository) |
| User usefulness | **Weak today** | The engine computes answers to real questions but the UI presents metrics, not answers; the single highest-value question ("is *this* silence unusual?") is not actually answerable by the shipped fields (§7.13, Contradicted by implementation) |
| UX quality | **Adequate structure, weak language** | Takeaway cards lead each tab (good); Layer-3 jargon ("Latest gap percentile", "Turn share", "Adaptive windows", forecasting gate) sits on primary surfaces (Verified in repository) |
| Marketability | **Unproven** | The wedge and promise are well-argued (PRs #17–#19) but no human outside the loop has seen a single rendered read (Product hypothesis) |
| Privacy | **Strong** | Local-only verified in code and tests, no INTERNET permission in the app manifest, no telemetry, native cache lifecycle managed; one residual verification gap (§17.4) |
| Maintainability | **Adequate** | Small, typed, well-bounded core; but four generations of presentational code coexist, two of them dead, plus a large unused shadcn component library (§19) |
| Readiness for Stage 8A | **Ready with one correction** | 8A is mapping/copy over shipped math, as the scenario research claims — except the silence card, whose specified input (`latestGapMinutes` = "export end minus last message") does not exist; the shipped field is the last *completed* gap (§24.1) |
| Long-term potential | **Real but capped** | An honest, local, occasional-use tool with a durable trust moat; not a viral or heavy-subscription product, by design (Product judgment) |

**Overall: Promising but needs corrections first** — and the corrections are small. The engineering and safety discipline are genuinely unusual for the category. What blocks Stage 8A is not architecture or science; it is (a) one factual mismatch between the scenario spec and the shipped pause fields, (b) a decision about how "current silence" can honestly be measured from a static export, and (c) documentation consolidation so the next agent doesn't have to read four overlapping prompts. Fix those, then build the hero card.

---

## 2. What ChatSense is

ChatSense is a local-only analyzer of WhatsApp chat exports that computes deterministic, content-independent descriptions of communication structure — who starts and restarts contact, how reply timing moves, how activity and pauses compare to the chat's own history — and presents them with visible evidence, sample counts, contract-owned thresholds, and explicit "not enough data" states, while refusing every claim about motive, emotion, attachment, relationship status, advice, or the future.

**What it is:** a private communication-pattern reader; a calibration instrument that lets a person check a felt sense ("something changed", "I'm the one carrying this") against the observable record.

**What it is not:** a mind-reader, compatibility scorer, ghosting detector, relationship coach, therapist, or predictor. It is also not (yet) a product a normal person gets an *answer* from in ten seconds — that is the Stage 8A gap.

**What it could become:** the honest instrument in a dishonest category — the tool people reach for when they want evidence instead of a horoscope; over time, a periodic re-check companion for ongoing relationships (romantic first, friendship second), with carefully validated historical-recurrence statements and, only if the gate ever earns it, calibrated conditional projections.

**What it should never become:** a live monitor, a notification engine, a verdict machine, a content reader, a people-ranker, a workplace surveillance tool, or anything whose output is an unconditioned claim about a person's inner state or future action. These are settled decisions (§32), not open questions.

**Is "Relationship Read" still the right surface?** Yes, with the market review's caveat intact: the name is compelling *because* it implies slightly more than is measured, so it is only safe while every surface under it passes the scanner. "Private communication-pattern reader" remains the correct product *category* label for docs and technical/marketing fine print (Product judgment, consistent across PRs #16–#19; nothing in this audit contradicts it).

---

## 3. Product-history reconstruction

Reconstructed from merged PRs #1–#16, branches, stage reports, and code (Verified in repository).

| Stage / PR | Intended goal | What was actually built | Tests | Superseded? | Docs still accurate? |
|---|---|---|---|---|---|
| Pre-history (v0 scaffold) | UI prototype | Next.js + shadcn template; most of `components/ui/*`, duplicate `styles/globals.css`, placeholder assets — much still present unused | none | Partially | n/a (never documented) |
| PR #1 architecture/ts-python-contract | Connect TS runtime to Python research contract | `contracts/behavioral_contract.json` v1, parity normalizers both sides, fixtures | `tests/parity.ts`, pytest parity | Extended by later stages | `ARCHITECTURE_REVIEW.md` describes the *pre*-PR#1 world (two unlinked engines, JS-injection Android bridge); it is now historical and should be labeled as such |
| PR #2 Stage 1/2 | Shared core + coherent boundaries | `@chatsense/core` workspace package; features/ screens; import boundaries | `tests/import-boundaries.ts` incl. architecture-boundary greps | No | `docs/shared-core-extraction.md`, `stage-2-coherence-report.md` accurate |
| PR #3, #4 Stage 3 | Native Android import | `SharedFilePlugin` (copy-to-private-cache, 50 MB limit, release lifecycle), typed TS bridge | Java unit tests (`SharedFileImportManagerTest`, `SharedFileIntentRoutingTest`), TS bridge tests | No | `stage-3-native-import-report.md`, `docs/android-share-import-testing.md` accurate |
| PR #5 Stage 4 | Relationship dynamics | Turns, adaptive windows, early/late & recent/prior comparisons, pause summary, contract v2.0 thresholds, 13 new fixtures | `tests/relationship-dynamics.ts`, parity extension, Python corrections tests | No — this is the load-bearing analysis layer | `docs/relationship-dynamics.md` accurate |
| PR #6 Stage 5 | Forecasting validation gate | Turn-based reply opportunities, censoring/supersession, 4+4+4 baselines, transparent candidates, Brier/ECE/bootstrap/subgroup gates, forecasting contract + fixtures + parity | `tests/forecasting.ts` (13), `tests/forecasting-parity.ts`, `python/tests/test_forecasting*` | No | `forecasting-methodology.md`, `-safety.md`, `-target-audit.md`, stage report accurate |
| PR #7 Stage 6 | Evidence-backed narrative | `InsightNarrative` sections per tab, categories, guardrail, priority order | `tests/insight-narrative.ts`, safety scanner | Extended by 6.2–6.4 | `docs/insight-narrative.md` accurate |
| PR #8 Stage 6.2 | Human takeaways | One `HumanTakeaway` per tab, contract-owned confidence labels | `tests/human-takeaway.ts` | No | accurate |
| PR #9, #10 | Agent tooling, Maestro | repomix, Playwright viewport suite, Maestro flow | `tests/viewport/`, maestro yaml | No | `docs/agent-tooling.md` accurate |
| PR #11, #12 Stage 6.3/6.4 | Emotional legibility, copy polish | Rewritten takeaway copy, direction-stating headlines, compact safety line | scanner + takeaway tests extended | No | accurate |
| PR #13, #14 | Debug APK releases | Release workflow with checksums/metadata/prerelease | workflow itself | No | `docs/release-debug-apks.md` accurate |
| PR #15 Stage 7 | Onboarding + demo | `ImportScreen` onboarding copy as data, embedded synthetic demo, self-contained Maestro | `tests/onboarding.ts` | No | `docs/onboarding-import.md` accurate |
| PR #16 | Relationship Read roadmap | Strategy doc only | n/a | Narrowed by #17, re-scoped by #19 | Roadmap header already points to its successors — good |
| PR #17 (open, draft) | Market review | Skeptical review; narrowed 8A to one hero card | n/a | Refined by #18/#19 | Current |
| PR #18 (open, draft) | Context research | Neutral-copy rule, friendship second, family restraint, work unmarketed, groups secondary | n/a | Card content superseded by #19 §23 | Current |
| PR #19 (open, draft) | Scenario/evidence research | 45-scenario library, method catalog, E1–E19 standards, §7 matrix, §23 brief | n/a | The current Stage 8A spec | Current, **except** the `latestGapMinutes` description in its §11 and one row of its §8 (see §24.1) |

**Outdated or contradictory documents (Verified in repository):**

- `ARCHITECTURE_REVIEW.md` (2026-06-14) describes problems PRs #1–#4 fixed (whole-file JS injection, unlinked engines). Historical; needs a superseded header.
- Roadmap §14's Stage 8A prompt and context-research §20's prompt are both explicitly superseded by scenario-research §23 — but all three remain in place, and a naive agent could execute the wrong one. The master plan now carries the single current prompt.
- Scenario research §11/§8 describes `pauseSummary.latestGapMinutes` as "export end minus last message." The implementation (`relationship-dynamics.ts` `buildPauseSummary`) computes it as the gap between the last two *messages* — a completed gap, not the ongoing silence. **Contradicted by implementation**; consequences in §7.13 and §24.1.
- `docs/data_contract.md` predates contract v2.0 and describes the Python report shape; it is partially redundant with `contracts/report.schema.json` and should be marked as Python-report-scoped.

---

## 4. Current user journey

Walked against the shipped code (`app/page.tsx`, `features/*`), the static build, and the viewport tests (Verified in repository). Emotional-question and misunderstanding rows are Product judgment.

**1. Discovery/marketing expectation.** There is no store listing, landing page, or marketing surface yet; the only public artifact is a GitHub debug-APK prerelease. Expectation-setting today is whatever the README says. No gap between promise and product *because there is no promise yet* — which also means the acquisition wedge (PR #17) is entirely untested.

**2. Onboarding (`ImportScreen`).** User sees: product name, one-line promise ("See observable communication patterns from a WhatsApp export"), two buttons, then four cards: What you'll see / What this cannot tell you / Private by design / How to export. Understands: local, private, patterns-not-reasons. Likely misunderstands: nothing serious — this screen is honest and complete. What leaks: "observable communication patterns" is engineer-speak; the promise line answers no emotional question. Missing: any hint of the *question* the app answers ("Am I overthinking, or did the pattern change?"). Redundant: none. Simplify: lead with a question, keep the cards.

**3. Privacy promise.** Stated before any data is chosen; accurate to the implementation (§17). Strong.

**4. Export instructions.** Five clear steps; "Without media" recommended and explained. Good. Missing: no mention that a longer export gives a stronger read (the single most consequential thing a user controls), and no warning about the iOS "Without media" 40k/10k message caps (unavoidable export limitation, §11).

**5. File import.** ZIP or TXT via file input; Android share sheet also works (cold and warm starts, races and duplicates tested). Errors are safe and human ("No WhatsApp messages were found. Choose the exported ZIP or TXT file."). Gaps: the web path has **no file-size limit** (native has 50 MB) and reads UTF-8 only; parsing and full analysis run **synchronously on the main thread** (`useChatImport.importFile` → `analyzeChat`), so a large export freezes the spinner (Verified in repository; Requires validation for real-world sizes).

**6. Analysis loading.** Spinner with "Everything stays on this device". No progress, no cancel. Acceptable at current export sizes; will not survive 100k-message exports without a worker.

**7. First screen (Overview).** User sees: takeaway card ("What to notice" + one-line read + confidence chip + 3 evidence bullets + safety line), then "Evidence-backed summary" with headline, findings, guardrail block, then metric cards, reply-timing bars, coverage line. Understands: the one-line read, mostly. Likely misunderstands: the confidence chip ("Useful read" of *what*?); "sender-switch replies". Jargon: "Evidence-backed summary", "observed sender switches", "median reply". Emotional question unanswered: *the* question — where does this stand / did it change — is only answered if maintenance happened to be uneven; otherwise the lead is a balance statement the user didn't ask about. Redundant: the takeaway and the first narrative finding often restate each other. Missing: an answer-shaped sentence (Stage 8A's job).

**8. Overview** (as above). The strongest current screen, and still a dashboard with a good paragraph on top.

**9. Changes.** Takeaway, then narrative, then metric cards ("Window size 7d", "Turns", "Notable changes"), then two comparison sections with per-metric ChangeCards (evidence states, samples, guardrails per card), then the **forecasting research gate** (method-gate status, evaluated opportunities, three gate lines), then the full adaptive-window timeline with per-window participant `<details>`, then participant movement cards. This is the most jargon-dense screen in the product; the forecasting gate section — pure Layer 3 — sits above the timeline on a primary tab. A normal user reads "1h reply gate: method gate failed" and hears *an error*, not honesty (Product judgment; §6).

**10. People.** Takeaway ("Who kept contact alive?" — the best tab question in the app), narrative, contribution cards, and for two-person chats the "who keeps contact moving" panel. Good bones; "Turn share / Thread-start share" progress bars are unlabeled-percent jargon. Group chats swap in a reply-edge list with an honest approximation caveat — correct behavior.

**11. Rhythm.** Takeaway, narrative, trend/threads/peak/night metric cards, 30-day bars, weekday bars, then "Long gaps in context": longest gap, median inter-message gap, 24h pauses, **"Latest gap percentile: 83%"**, reconnecting participants, **"Average reply"** — the last two violating the project's own rendering rules (counts not percentiles; means Layer-3 only; scenario research E2/§11) on the product's most emotionally loaded surface. The five longest pauses with "First message afterward: X" is quietly the most valuable widget in the app.

**12. Evidence/details.** Evidence is genuinely visible everywhere — every finding carries values, dates, samples. What's missing is *hierarchy*: evidence for the lead read and raw metrics for everything else are visually equal.

**13. Insufficient data.** Handled as designed states everywhere (limited takeaways, unavailable comparisons with reasons, "There is not enough here to read a pattern yet"). This is a real strength. The copy still frames it slightly as a shrug rather than an answer; scenario research §21 example 8 is the better bar.

**14. Error states.** Import errors are caught and human. Unparseable-but-nonempty files produce "No WhatsApp messages were found" — correct. A file that parses to one message produces a full UI of limited states rather than an error — correct behavior, slightly repetitive copy.

**15. Repeat use.** Nothing persists (by design), so a returning user re-imports and re-reads from zero. There is no comparison to the previous import, no acknowledgment that they've been here — the retention loop PR #17 identified does not exist yet. Consistent with the roadmap (Stage 10), but worth naming: **today the product is architecturally a one-session app.**

**16. Leaving/sharing.** No share artifact, no export of the report. A user who wants to show a friend screenshots a takeaway card — which does carry its safety line (good) but no identifying header of what was analyzed (fine) and no date context (screenshot travels without coverage dates unless the user scrolls).

---

## 5. Ten-second usefulness test

Judged against the shipped takeaway cards on the demo fixture and the fixture matrix (Verified in repository for what renders; Product judgment for comprehension).

| Question | Can a non-technical user answer it in 10 s today? |
|---|---|
| What changed? | Partially — Changes takeaway states one shifted metric in plain words ("Typical replies became slower for Asha") when a change crossed thresholds |
| Shared or asymmetric contact? | Mostly yes — People/Overview takeaways state this well ("Message volume was even, while keeping contact going leaned one way") |
| Is this silence unusual? | **No** — the Rhythm takeaway describes historical pauses; "is the current quiet weird" is answered only by a "Latest gap percentile" row in a data table, in percentile jargon, about the wrong gap (§7.13) |
| What usually followed similar periods? | No — the data exists (longest pauses + restarters, reconnection shares) but no sentence assembles it ("After the 9 earlier day-plus pauses, the chat restarted every time") |
| Is there enough evidence? | Yes — confidence chips and limited states are everywhere |
| What can't the app know? | Yes — safety lines and guardrails are consistent and visible |

**Current likely ten-second experience:** *"Something about balance… 'Useful read'… volume was even but someone 'leaned'… lots of percentages. It seems careful. I'm not sure what it told me."* The user leaves oriented but not answered.

**Ideal ten-second experience:** one card, one direct sentence answering the strongest-evidenced of the four MVP scenarios, three dated counts underneath, one limitation line — e.g. *"The pattern did change: this chat has been quieter and slower for about three weeks, after four steady months."* or *"This quiet is longer than 8 of the 10 earlier ones — and every earlier long pause ended with a new conversation."* The user leaves either relieved or validated, and knows why. (Scenario research §21 already wrote these sentences; nothing in this audit improves on them.)

---

## 6. Human-language audit

Classification of the major visible strings (Verified in repository for the strings; classification is Product judgment).

**Strong and human:**
- "Who kept contact alive?" / "Did the pattern move?" (tab takeaway titles)
- "One side carried more of the contact." / "Message volume was even, while keeping contact going leaned one way."
- "There is not enough here to read a pattern yet." / "This is a snapshot, not a pattern."
- "After long pauses, Ravi restarted 7 of 10 times." (evidence-bullet style at its best)
- "Observed in this export; it does not explain why." (compact safety line — short, non-legalistic, does real work)

**Accurate but too technical:**
- "Evidence-backed summary", "Plain-English read" (labels *about* the copy instead of copy)
- "Observed sender-switch replies", "sender-switch timing"
- "Turn share", "Thread-start share", "Reconnection share", "Follow-up turn rate" (bare metric names as progress-bar labels)
- "Latest gap percentile: 83%" (the docs' own rule says render as counts)
- "Adaptive windows", "Window size 7d", "eligible / limited evidence", "Evidence-safe comparison"
- "Median inter-message gap"

**Safe but weak:**
- "See observable communication patterns from a WhatsApp export." (the promise line — accurate, answers no question anyone asks)
- "Mostly balanced and steady." (fine, but a missed opportunity to feel like relief)
- "No measured shift crossed the threshold" (reads as bureaucratic; "nothing really changed" is the honest human meaning)

**Misleading:** none found — genuinely. The scanner and negation discipline have kept the surface clean (Verified via `tests/helpers/narrative-safety.ts` coverage and reading every generated template).

**Redundant:**
- The full 30-word guardrail appears in every narrative section *and* screen footers *and* (in shorter form) every takeaway; on Changes a user can see safety text five times. Stage 6.3's fatigue-reduction move was right; it needs one more pass.
- Takeaway one-line read vs. first narrative finding frequently restate the same fact in adjacent boxes.

**Missing:**
- The answer-shaped hero sentence (Stage 8A).
- Any "what usually happens next" sentence, though its inputs are computed.
- A staleness line ("measured to the export's last message on July 3").
- A "longer export = stronger read" nudge at import time.

**Recommended voice:** one register everywhere — *a careful friend reporting counts*: plain sentences, named people, dated counts, past tense for evidence, one short limitation clause per card, technical vocabulary only behind Details. Language hierarchy: (1) answer sentence; (2) evidence bullets as counts with dates; (3) one inline limitation; (4) everything currently on screen, demoted. The forbidden-language scanner must cover every new string (already the plan; keep it binding).

---

## 7. Scientific audit

Each production-facing construct: definition → location → justification → the rest. Contract = `contracts/behavioral_contract.json` v2.0; TS = `packages/chatsense-core/src`; parity = `fixtures/expected/*` via `tests/parity.ts` and `python/tests/test_contract_parity.py`. All rows Verified in repository unless labeled.

**7.1 Messages.** Parsed line with timestamp + "Sender: text"; continuation lines append. TS `chat-parser.ts`; Python `importers/whatsapp.py`. System lines excluded from the shared scope (contract `parity.scope`). Sound. Failure mode: unparseable timestamp formats silently drop or merge lines (§11). Keep.

**7.2 Words.** Whitespace-split token count, including media/deleted placeholder text ("<Media omitted>" = 2 words). Consistent across languages (parity-exact) but semantically approximate; nobody user-facing depends on precision. Keep; note in Details copy if word counts ever headline.

**7.3 Turns.** New turn at first message, sender change, or gap ≥ 360 min (`buildTurns`; contract `turn_definition`). Supported methodology (utterance/turn collapsing of same-sender bursts is standard in CMC analysis and is what makes reply units honest). Final turn flagged `openAtExportEnd`. Keep — this is one of the best decisions in the codebase.

**7.4 Threads / thread starts.** Thread = turns between gap-≥360-min boundaries; `startsThread` on the first. The 360-min constant is a practical heuristic (§8). Initiation share = participant thread starts / total. Confounders: schedules, who wakes first (Established: daily rhythms are person-specific — Aledavood et al. 2015, cited in scenario research [15]). Sample minimum 3/period. Keep.

**7.5 Reply events / reply delay.** Reply = sender change between consecutive messages; delay = timestamp difference; medians per participant; contract sample minimum 5/participant/period. Heavy-tail-aware (medians; Established via Kooti et al. 2015 [11]). One inconsistency: `analyzeChat` medians round to whole minutes (`round(…, 0)` in `median()`), so sub-minute typical replies render as "0m"/"1m" — cosmetic, parity-consistent. Group chats: reply attribution is pairwise-approximate and disclosed (contract `group_chat.limitations`, narrative `groupAttributionFinding`). Keep.

**7.6 Follow-ups.** Same-sender message after ≥15 min and < 360 min, within a turn; rate over "relevant turns" (`isRelevantFollowUpTurn` correctly excludes the open final turn — a censoring subtlety done right). Keep.

**7.7 Pauses / reconnections.** Reconnection = first message after a gap ≥ 1440 min; per-participant counts/shares; subsequent-thread duration/turn stats. Sound counting. Keep.

**7.8 Adaptive windows.** Calendar windows of 7/14/30 days chosen by export span (≤90/≤365/>365 d); eligibility = ≥20 messages and ≥2 active days. Practical heuristic, documented as such. Failure mode: window boundaries split episodes; rhythm-window interaction unexamined (Requires validation, low priority). Keep.

**7.9 Active days / activity change.** Messages per active day per window; early/late = first-2 vs last-2 eligible windows; recent/prior = last vs previous; notable ≥30% relative. Exposure-normalized (per-active-day) — correct. Keep.

**7.10 Reply-timing change.** Per-participant median vs itself across periods; notable = ≥2× ratio AND ≥10 min absolute, ≥5 samples each side. Within-person comparison — correct (E5). Not yet time-of-day stratified (planned Stage 9; the schedule-shift confounder is real — Established [15]). Keep; stratify later.

**7.11 Initiation / reconnection share change.** Absolute percentage-point thresholds (15/20 pp) with event minimums (3/2). The 20 pp reconnection threshold is explicitly justified in the contract notes (sparse events). Keep.

**7.12 Evidence states.** `sufficient | insufficient | unavailable` per metric; directional labels blocked otherwise; comparisons carry `unavailableReason`. Insufficiency never becomes zero (E17 holds — verified in `numericChange` and screen rendering). This is the backbone of the product's honesty. Keep.

**7.13 The pause-summary / "unusual silence" complex — the one real scientific-spec defect.**
Shipped (`buildPauseSummary`): `latestGapMinutes` = the gap between the **last two messages** (a completed, resolved gap); `latestGapPercentile` = share of **earlier** inter-message gaps ≤ that gap (correctly excludes itself from its own denominator); `longestPauses` top-5 with reconnecting senders; `medianInterMessageGapMinutes`.
The scenario research (§11, §8) describes `latestGapMinutes` as "export end minus last message" — the *ongoing* silence. **Contradicted by implementation.** Consequences:
- The shipped percentile answers "was the gap *before the final message* unusual?" — a question nobody asks. The user mid-silence wants the *current, right-censored* quiet ranked, and that quantity is not derivable from message timestamps alone: the export's clock stops at the last message. Honest options for 8A: (a) rank the last completed gap and say exactly that ("the most recent quiet stretch in this export"); (b) use device time for "quiet so far," clearly labeled with the staleness line and never entering the reference distribution (it is censored); or both. This is a copy-and-one-small-derivation decision, not new math — but it must be decided before the silence card ships (§24.1).
- Separately, `SilenceSummary.unusualSilenceCount` (modified z-score, floored at 360 min; contract-owned k=3.5, scale 1.4826) is a defensible robust-outlier count (Established basis: Leys et al. 2013) but is barely surfaced; it and the percentile tell overlapping stories and must agree in any future card (the scenario research's two-card consistency test is the right idea).

**7.14 Strength/confidence.** Takeaway confidence = limited unless maintenance evidence exists; strong only when event counts reach 2× contract minimums (`maintenanceConfidence`, `NARRATIVE_TAKEAWAY_STRONG_EVIDENCE_MULTIPLIER`). Coarse, monotone, honest; labels explicitly declared copy-not-statistics in the contract. The planned multi-signal-agreement extension (roadmap §8) is a superset, not a replacement. Keep.

**7.15 Narrative prioritization.** Contract-owned `priority_order`; uneven maintenance leads, then notable changes; limited cards can't outrank evidenced ones (verified in `buildInsightNarrative` candidate assembly). Deterministic tie-breaks via `changeStrength` ratios-over-thresholds. Sound. Keep.

**7.16 Forecasting gate.** See §15. Correctly built, correctly blocked, wrongly *placed* (primary tab).

**7.17 Constructs that exist in code but are scientifically vestigial:** `analysis.insights` (legacy `ObservableInsight` builder in `chat-analyzer.ts` with its own hardcoded 65% threshold) and `relationshipDynamics.changeInsights` are **computed and never rendered by any screen** (verified by grep over `features/`). Two parallel un-shipped insight generations. Remove (§19, §22).

**7.18 `activity.recentTrend`.** Last-7-days vs prior-7-days totals, ±20% → rising/falling, <8 days → not_enough_data, and "rising" when prior week = 0 (`getRecentTrend`). The thresholds are **hardcoded, not contract-owned**, unlike every Stage 4 threshold — and this trend renders on Rhythm ("Recent trend") and in narrative activity findings. Arbitrary but reasonable; should be contract-owned or replaced by the Stage 4 recent/prior comparison, which measures the same idea with eligibility rules (§8, §19). Same for `nightMessageRate` (22:00–06:00 hardcoded).

---

## 8. Threshold audit

| Threshold | Value | Status | Recommendation |
|---|---|---|---|
| Thread gap | 360 min | Practical heuristic (no citation exists for "a conversation ends after 6 quiet hours"; it is a structural definition) | Remain contract-owned; candidate for personal-baseline replacement in a later stage (E15); never user-visible as a number without its definition |
| Reconnection gap | 1440 min | Practical heuristic; matches folk meaning of "a day of silence" | Remain contract-owned; expose in Details ("pauses of at least 24 hours" already does this well) |
| Follow-up delay | 15 min–360 min | Practical heuristic (below 15 min is burst-typing; above 360 min it's a new thread) | Remain contract-owned |
| Adaptive windows | 7/14/30 d by span 90/365 | Practical heuristic, arbitrary but reasonable | Remain; tune with donated data only if drift/intermittency work shows window-rhythm interaction |
| Window eligibility | ≥20 msgs, ≥2 active days | Arbitrary but reasonable floor | Remain; tune with fixtures |
| Early/late minimum | 4 eligible windows | Arbitrary but reasonable | Remain |
| Reply sample minimum | 5/participant/period | Arbitrary but reasonable (quantile stability at n=5 is marginal — a median of 5 heavy-tailed values is noisy) | Remain for now; consider raising to 8–10 for *strong*-confidence claims when confidence is reworked (fixture-tunable) |
| Thread-start / reconnection minimums | 3 / 2 per period | Arbitrary but reasonable; 2 reconnections is very thin — mitigated by the 20 pp change threshold | Remain, with the mitigation kept |
| Activity change | 30% relative | Heuristic | Remain contract-owned; a personal-baseline variant (vs own window variance) is the principled successor (research track) |
| Turn share change | 10 pp | Heuristic | Remain |
| Reply-latency change | ≥2× and ≥10 min | Heuristic with good shape (ratio + absolute floor kills small-number noise) | Remain |
| Thread-start / follow-up / reconnection change | 15/15/20 pp | Heuristic | Remain |
| Balance bands | ≤60% balanced; ≥65% uneven; ≥60% follow-up | Heuristic; the 60–65 dead zone is deliberate hysteresis | Remain; document the dead zone in Details |
| Confidence multiplier | 2× minimums → strong | Heuristic | Remain until multi-signal confidence replaces it |
| `recentTrend` ±20%, 8-day floor | Hardcoded in `chat-analyzer.ts` | **Outdated relative to project standards** (not contract-owned, overlaps Stage 4 recent/prior) | Move into contract or retire the metric in favor of recent/prior (§19) |
| Forecasting gates | 80 evaluated, 30/participant, 15+/15−, 5% Brier, 0.1 ECE, bootstrap, subgroups | Supported methodology (proper scores, calibration, baseline-relative, chronological) — the *numbers* are conservative heuristics | Remain; they are gates, not claims — conservatism is the point |
| Fixture-derived “≥4 cycles”, terciles, analog counts (planned) | — | Explicitly flagged Product hypothesis in scenario research §Bibliography gaps — correct labeling | Tune with fixtures + donated data before shipping |

Nothing here is **dangerous**. Nothing pretends to be a validated constant (the contract notes and scenario research both say so explicitly — unusual candor). The single required action: bring `recentTrend`'s numbers under the contract or delete the metric.

---

## 9. Statistical-method audit

| Concern | Handling | Verdict |
|---|---|---|
| Heavy-tailed reply times | Medians everywhere user-facing; `avgReplyMinutes` computed and shown once on Rhythm ("Average reply") | Correct in core; **the one E2 violation is that Rhythm row** — demote to Details or drop (Verified) |
| Medians vs averages | As above; medians parity-exact | Correct |
| Censoring | Final open turn excluded from follow-up relevance and never a no-reply; forecasting right-censors at export end and supersession; `latestGapPercentile` excludes itself from its denominator | Correct and unusually careful — but the *current silence* is not represented at all (§7.13) |
| Exposure normalization | Per-active-day rates; per-opportunity rates; shares not raw counts | Correct |
| Sender bursts | Turn model collapses them; no artificial reply edges (contract `reply_event.notes`) | Correct |
| Within- vs between-person | All change claims within-person/within-chat; between-person shown only as same-period shares | Correct |
| Partial windows | Final window flagged `partial`; excluded from forecasting activity task; **included** in early/late-late and recent if eligible — a mild bias (a partial week can pass the 20-message floor and depress per-active-day comparisons is avoided since per-active-day normalizes; residual risk is small) | Acceptable; covered by `stage4_partial_final_window` fixture |
| Insufficient evidence | First-class states everywhere; never zero-filled | Correct |
| Seasonality | Not modeled; weekday/hour distributions shown descriptively; no seasonal caveat on drift-ish claims yet | Acceptable now; the caveat becomes mandatory when the drift composite ships (scenario research §13 already requires it) |
| Autocorrelation | Rolling views not used as evidence; windows are disjoint (not rolling) — the design dodges the problem | Correct |
| Multiple comparisons | ~1 + 5 metrics × participants × 2 comparisons scanned; coarse thresholds; narrative caps at 2 change findings; no explicit disclosure | Adequate; add the E19 disclosure line ("of the N measures compared, these moved") when the surface grows |
| Effect size | Before/after values + samples always shown; no p-values anywhere (good) | Correct |
| Calibration | Required and computed for forecasting (ECE + reliability bins); nothing user-facing claims probability | Correct |
| Chronological validation | Prequential rolling-origin; leakage tests assert future edits don't change earlier predictions | Correct |
| Baseline comparison | Candidate must beat *best* of 4 baselines with bootstrap CI | Correct |
| Abstention | Warm-up floors; gates; "not validated" default | Correct |
| Deterministic reproducibility | No randomness outside the seeded bootstrap; adversarial-content test proves content cannot steer output | Correct |

**UI statements that overstate:** none rise to misleading; two *underperform* the standards: the "Latest gap percentile" row (percentile jargon; ranks the wrong gap) and "Average reply" (mean of a heavy-tailed quantity on a primary tab). Both are display-layer fixes.

**One research-side subtlety (Verified):** in group chats, forecasting's `participantKey` falls back to `observedResponder` — a future quantity — as the *grouping context* for participant baselines. It leaks no outcome into any probability for two-person chats (where `expectedResponder` is known), and group results are already labeled approximate, but a purist P2 redesign should key group contexts on the source sender instead. Research-only impact.

---

## 10. Python–TypeScript coherence

**Ownership (Verified):** TS `@chatsense/core` is the sole production engine; Python is reference/research; narrative/takeaway prose is deliberately TS-only and outside parity (documented in `docs/insight-narrative.md` §Ownership). Correct split.

**Parity scope:** 24 shared metrics + full relationship-dynamics shape, exact integer/categorical equality over 21 fixtures, both directions tested (`tests/parity.ts`, `python/tests/test_contract_parity.py`); forecasting parity fixture-by-fixture over opportunities, censoring, outcomes, metrics, calibration, bootstrap, subgroups, promotion (`tests/forecasting-parity.ts` ↔ `chatsense_ml/forecasting/parity.py`). Rounding unified via `js_round` (round-half-up) on the Python side. This is the strongest single engineering asset in the repository.

**Coherence verdict: coherent, with four cosmetic and one real divergence.**

1. **Parser divergence (real):** Python decodes utf-8-sig/utf-8/utf-16/latin-1 with fallback and classifies media/deleted/system message types; the TS runtime reads UTF-8 only (`file.text()`) and never classifies types (contract `MEDIA_MARKERS`/`DELETED_MARKERS` are *defined* in `contract.ts` but unused by the TS runtime — dead constants at runtime, alive only as contract mirrors). Parity holds because the shared scope ignores types and fixtures are ASCII/UTF-8 — i.e., **the parity suite cannot see this divergence**. A UTF-16 export would parse in Python and produce garbage in the app. Fix direction: give the web import path an encoding sniff (BOM check) — small.
2. Duplicated calculations inside TS (not cross-language): `buildReplyEvents`, `median`, `round`, `percentage`, `countWords`, `gapMinutes` exist in both `chat-analyzer.ts` and `relationship-dynamics.ts`; `formatDuration` twice; `uniqueSenders` twice more (forecasting, dynamics). Consolidate into a shared internal module (mechanical).
3. `evaluateForecastingResearch` re-runs `analyzeRelationshipDynamics` although `analyzeChat` already computed it — every import pays the dynamics cost twice (Verified; performance, not correctness).
4. Research-only Python (sklearn models, quarantined labels, anomaly research variant, survival stub, viz, notebooks) is properly quarantined and documented in `forecasting-target-audit.md`; nothing research-grade leaks into the app. The `research_silence_zscore` vs runtime variant naming split is exemplary.
5. Schema drift: none found — `report.schema.json` and `forecasting_report.schema.json` match their writers; benchmark artifacts validate in CI.

**Remediation list:** (1) web-path encoding sniff + a UTF-16 fixture; (2) TS-internal shared math/util module; (3) pass precomputed dynamics into `evaluateForecastingResearch`; (4) either use MEDIA/DELETED markers in TS (type classification) or annotate them as Python-only in `contract.ts`. None block Stage 8A.

---

## 11. Parser and import audit

Distinguishing **parser defects** (fixable) from **export limitations** (inherent).

**Supported today (Verified):** `[D/M/YYYY, HH:MM(:SS)]` bracketed (iOS-style) and `D/M/YYYY, HH:MM - ` dashed (Android-style); 2- or 4-digit years (pivot 2000); optional seconds; optional AM/PM (JS `\s` and Python `\s` both match the narrow no-break space U+202F newer iOS inserts before AM/PM — verified against the regexes); multiline continuations; system lines excluded; DMY/MDY inferred once per export from the first disambiguating line, defaulting to DMY (contract-owned policy, `ambiguous_dates` fixture).

**Parser defects / gaps (fixable):**
1. **Only `/` date separators.** Locales that export `24.12.21` (German et al.) or `2021-12-24` fail entirely → "No WhatsApp messages were found." (Requires validation against a corpus of real exports; the format-varies-by-locale fact is established in every third-party parser's docs.)
2. **No left-to-right-mark (U+200E/U+200F) stripping.** iOS exports commonly prefix lines with invisible LRM characters; `^\[` then fails to match, and — worse — the line silently *appends to the previous message* as a continuation. Silent data corruption, not a crash. Python side has the same gap. (Requires validation with a real iOS export; high suspicion.)
3. **Web import path: no size limit and UTF-8 only** (§10.1); native Android path has a 50 MB limit and clear too-large error — asymmetric.
4. **Synchronous parse+analysis on the UI thread** — freeze risk for large exports.
5. **English-only media/deleted markers** ("Media omitted", "message was deleted") — Python type classification misses other locales; TS doesn't classify at all. Currently harmless (types unused in product) but will matter if media handling ever surfaces.
6. **12 h clock without AM/PM ambiguity**: a locale that exports `9:41` meaning 9:41 PM without a marker parses as 09:41 — unavoidable ambiguity, but worth a data-quality note if hour distributions look bimodal-wrong. Edge case; leave.

**Export limitations (inherent, must be disclosed rather than fixed):** exporter-local timestamps with no timezone (cross-timezone reply delays are systematically shifted — S44, disclose); iOS export caps (~40k without media); no edit/reaction/read-receipt data; deleted-before-export messages invisible; platform switches indistinguishable from silence (S39); the export ends at the last message — the "current silence" is fundamentally right-censored (§7.13); group reply attribution unresolvable (contract-disclosed).

**ZIP handling:** JSZip on web with `_chat.txt` → "whatsapp chat*.txt" → any-`.txt` preference order (`selectWhatsAppTextEntry`, tested); Python mirrors. Password-protected/corrupted ZIPs produce caught errors. Good.

**Privacy/cache:** native cached copies released post-import and pruned when stale (tested in Java and TS bridge tests); duplicate share intents deduplicated (tested); cold/warm starts both covered (tested). Strong.

---

## 12. UI and information-architecture audit

**Hierarchy & first-screen value:** Takeaway-first on all four tabs is enforced by Playwright and Maestro (position-asserted) — the proto-Layer-1 exists. Below it, everything has equal visual weight; there is no Layer 2/3 separation. **Verdict: the four-tab architecture survives Stage 8A** — the hero card slots above the Overview takeaway (or replaces it) without restructuring — but 8B should demote, per tab: Changes (forecasting gate → behind Details; adaptive-window timeline → collapsed), Rhythm (gap table → after a silence card; "Average reply" → Details), Overview (reply-timing progress bars → Details).

**Repetition across tabs:** reconnection facts appear on Overview, People, and Rhythm; balance on Overview and People. Acceptable (tabs answer different questions with shared evidence) but the same *sentence* should not repeat — currently the maintenance takeaway and People takeaway can be near-identical.

**Navigation:** bottom nav + header import button; motion transitions; works at all three tested widths without horizontal overflow (Playwright-asserted). Good.

**Typography/spacing/density:** consistent Tailwind scale; small-caps eyebrows; readable. Changes tab is over-long (unbounded adaptive-window list — a year-long export renders 26–52 window cards; needs virtualization or collapse at 8B).

**Buttons/labels:** "Choose WhatsApp export" / "Try demo export" — clear. `<details>` "Participant details" is the only disclosure affordance in the app; more of this pattern is the cheap path to Layer 3.

**Empty/loading states:** designed and safe (§4.13–14); loading has no progress/cancel.

**Accessibility (partial audit — Verified for what's listed, not a full pass):** semantic sections with aria-labels; heading structure mostly sane; icons aria-hidden; confidence chips are text not color; tone accents are border colors *plus* text (not color-alone). Gaps: no `aria-live` on import status; `ProgressRow` bars' value semantics rely on adjacent text (acceptable); no reduced-motion handling for framer-motion transitions; contrast of `text-slate-400`/`text-[11px]` fine print is marginal. None are blockers; fold into 8B.

**Screenshot/share readiness:** takeaway cards carry the safety line inside the card (screenshot-safe — good); they lack date coverage inside the card (add in 8A hero: "in this export, Jan–Jul 2026").

**Recommendation:** **retain the four tabs; do not redesign.** Ship the 8A hero card on Overview; in 8B demote (not delete) the listed Layer-3 blocks behind Details disclosures; rename nothing except jargon labels; progressively disclose the window timeline. Avoid any aesthetic overhaul — the visual system is not the problem; the *ordering and vocabulary* are.

---

## 13. Scenario audit

Statuses for the scenario-evidence report's top scenarios, checked against shipped fields (Verified in repository for support level).

| Scenario | Data support today | UX support today | Scientific readiness | Engineering readiness | Risk | Best next action |
|---|---|---|---|---|---|---|
| Unusual silence (S9/S6) | **Partial — weaker than the report claims.** Percentile ranks the last *completed* gap (§7.13); restart composition + longest pauses + reconnection shares all shipped | A percentile row in a table; no sentence | High (counts + own-history percentile), once the "which gap" question is settled | Small: one derived quantity + copy | Over-reading percentile as reply probability (designed against in §11 of scenario research) | Decide the censored-current-gap presentation, then ship as the 8A card's silence state |
| Carried contact (S2/S17) | **Full** — all four constructs shipped and parity-covered | Good takeaways exist; no five-label hierarchy | High | Small: §12 hierarchy is pure aggregation | "Carries" heard as "cares"; mitigated by existing wording discipline | Implement the balanced/mixed/asymmetric/recent/insufficient hierarchy in 8A |
| Pattern change (S1/S3) | **Full** — earlyLate/recentPrior/notableChanges | Good takeaway; not answer-shaped | High | Copy only | "Changed" heard as "cooling toward me" | Answer-shaped copy in 8A |
| Honest insufficiency (S37/S40) | **Full** | Exists but framed as shrug | High | Copy only | Users hear failure | Rewrite as a first-class answer (scenario §21 ex. 8) in 8A |
| Intermittent rhythm (S4/S16/S20) | **Facts only** — long-pause counts, gap medians; no run-length extraction, no corrected burstiness, no classification | None | Medium-high (method specified, thresholds unvalidated) | Medium: new derived features + fixtures + parity | Low (most reassuring read) | Stage 9 item 1; do **not** squeeze into 8A |
| Drift composite (S15/S13) | Indicators shipped; composite absent | None | Medium (rule specified; seasonal caveat needs ≥2 cycles rarely present) | Medium | Medium (drift ≠ friendship ending) | Stage 9 item 2 |
| Historical analogs (S10/S11) | Window features shipped; retrieval absent | None | Medium (design sound; 2–3 analogs is anecdote-counting and the docs admit it) | Medium-large | **High** comprehension risk | Stage 9+, gated on the comprehension test — do not pull forward |
| Reply timing (S1 detail) | Full | Rendered with direction (6.4) | High; stratification pending | Stratification = Stage 9 item 3 | Slowness → disinterest leap | Keep; add schedule-shift caveat when stratified |
| Event markers (S19/S29) | Nothing | None | Sound method (given date), recall-bias mitigations specified | Medium; needs UI input surface | Medium (causal misreading) | Stage 10; unchanged |
| Repeat-export comparison | Nothing persists | None | Straightforward | Medium-large (persistence design conflicts with "nothing persists" privacy line — needs an explicit, opt-in, local-only design pass) | Reassurance-loop risk (CR-13) | Stage 10; design the privacy story first |

**Scenarios to reject despite marketability (confirming the research docs, no changes):** ghosting detection under any name; reply-probability for a specific silence; compatibility/ranking; group pairwise reads; "did I miss the signs" as an answered question; automatic event inference; forward statements for estrangement-shaped patterns.

---

## 14. Relationship-context audit

The engine is context-blind (Verified — no relationship-type input exists anywhere in `@chatsense/core`). The copy layer is where context lives, and the shipped copy is already neutral: "this export," "contact," "one side," "keeping contact going." Reading every generated template (`insight-narrative.ts`), nothing is romance-coded. The context research's binding rule (neutral default) is **already satisfied by the shipped surface** — the risk was in the *roadmap's proposed* labels ("Cooling down," "Warming up"), which are not implemented.

| Context | Does current/proposed neutral copy work? | Note |
|---|---|---|
| Uncertain romance | Yes — neutral copy still lands because the user projects the stakes; the §21 romantic example adds register, not claims | Marketing carries the romantic framing, not the app (settled) |
| Established romance | Yes | "Steady, both ways" is genuinely satisfying here |
| Friendship / drifting friendship | Yes; "keeping contact going" reads naturally | Friendship wording pack (Stage 8C) adds warmth, not necessity |
| Family / parent–adult-child | Yes **only with** the structural-role caveat the scenario research mandates (S30); current copy lacks it because no carried-contact hierarchy exists yet | The caveat ships with the §12 hierarchy |
| Estranged family | Neutral copy is correct and *must stay* neutral; no forward framing (settled, CR-12) | 8A must implement the "no what-usually-happens-next for estrangement-shaped patterns" suppression — this is a *logic* rule, not just copy |
| Work / manager-report | Neutral copy works as coordination facts; "Relationship Read" branding must never surface here | Unmarketed (settled) |
| Groups | Participation-only view with approximation caveat — already correct | No pairwise reads (settled) |

**Where neutral becomes bland:** stable/balanced outcomes ("Mostly balanced and steady") — the cases where the answer should feel like *relief* instead read as absence of findings. This is fixable inside neutral language ("Nothing here points to one person carrying it — and nothing measurable moved. That's the answer."). Blandness is a copy-craft problem, not a context-layer problem.

**Decision: Stage 8A stays completely neutral** — no universal-sentence-with-context-examples variant. Rationale: the context examples would be the first strings in the product whose emotional register outruns their evidence, the scanner cannot test resonance, and the 5–10-person validation (market review §13) will tell us cheaply whether neutral wording is enough *before* paying the string-table cost. Relationship type is never inferred (hard boundary, unchanged).

---

## 15. Forecasting audit

**What exactly is forecasted (Verified):** three research tasks — (1) will a different participant's turn begin within 60/360/1440 min of a turn end; (2) among observed responses, which delay bucket; (3) next completed adaptive window's messages/active-day. Nothing else. No user-facing prediction exists anywhere.

**Are opportunity labels correct?** Yes. Turn-based units kill same-sender-burst pseudo-replies; supersession (`superseded_by_new_source_thread`) prevents attaching a later reply to a stale turn; the legacy row-based labels are quarantined with an honest audit trail (`forecasting-target-audit.md`). **Censoring:** right-censored at export end and at supersession for unelapsed horizons; observed-late responses are valid negatives; the final open turn is never a no-reply. Correct.

**Baselines meaningful?** Yes — global/participant/recent/time-context smoothed rates are exactly the "hard to beat" simple statistical baselines the M4 evidence recommends (Established [22]); requiring improvement over the *best* baseline is the strict version. **Candidates meaningful?** They are transparent blends — deliberately weak, which is fine: the machinery, not the model, is the Stage 5 deliverable.

**Chronological validation correct?** Yes — prequential, warm-up floors, per-opportunity recomputation from prior opportunities only; tests assert future-edit invariance of earlier predictions.

**Metrics interpreted correctly?** Brier/log-loss/ECE computed and used as gates, not shown to users; calibration bins weighted by count; bootstrap on per-record Brier differences with fixed seed. One nuance: ECE with 5 bins on <100 predictions is itself noisy, so the 0.1 ECE gate is effectively "not grossly miscalibrated" — appropriate for a gate, would be inadequate for a claim (Supported methodology).

**Gate too strict, too weak, or appropriate?** Appropriate-to-strict, and *structurally* strict in one way the docs undersell: `buildExternalValidationEvidence` hardcodes `realWorldValidationEligible: false`, so `promoted` can never be true at runtime regardless of metrics (Verified). Product forecasting is not "blocked pending gates" — it is **blocked pending a code change that only new real-data validation evidence would justify**. That is the right design; the documentation should say it this plainly.

**Why is forecasting blocked?** (a) By construction, above; (b) empirically, on the synthetic matrix, 0 of 10 fixtures pass even the method gate (Stage 5 report benchmark table) — mostly for sample-size and calibration reasons. Honest.

**What would unblock it?** The P2 path in scenario research §18: a donated-data corpus (metadata-only, ethics-reviewed — the ChatDashboard/WhatsR route is Established precedent [44]), a discrete-time survival candidate, beating best baselines on Brier *and* ECE across fixtures + donations + subgroups, then P3 comprehension-tested wording. Nothing less.

**Does forecasting create enough product value to justify continued research?** **Qualified yes, at low priority.** The product's highest-value sentences ("restarted 7 of 9 times," "usually ended within 4 days") are *empirical baselines that need no gate*. Validated calibrated projections would add one sentence-shape ("if the pattern continues, X–Y is the usual range") — real but marginal value on top. Recommendation: keep P0 (empirical statements) as the permanent product ceiling for 8A–8D; keep Stage 5 machinery maintained (it is cheap — deterministic and parity-tested); pursue P2 only when a donated-data corpus actually exists; do not spend agent time improving candidates against synthetic fixtures (it proves nothing by the project's own rules).

**The five-way separation** (historical description / empirical recurrence / conditional projection / validated probability / forbidden prophecy) is correctly drawn in the docs and correctly enforced in code today — the first two are computable now, the third is allowed as arithmetic with the "if...continues" clause, the fourth is gate-locked, the fifth is scanner-rejected.

---

## 16. Safety and harm audit

| Risk | Current mitigation (Verified) | Gap / proposal |
|---|---|---|
| Relationship anxiety amplification | Pattern-not-psyche copy; guardrails; evidence visible; no verdicts | The strongest mitigation is 8A's *relief-shaped* insufficiency and normality reads — build them as designed |
| Compulsive rechecking | Nothing persists; no notifications; no live data (structural mitigations) | Same-export re-analysis yields identical output but the app doesn't *say* so; add the "nothing new can change until you re-export" line (scenario §11 step 7) in 8A silence card |
| Post-breakup rumination | No retrospective-verdict features; S14 core refused | Keep unmarketed; no further mechanism needed now |
| Family estrangement | Forward framing for estrangement-shaped patterns banned in the spec | The ban is currently only prose — 8A must encode it (suppress next-pattern line when gap/return shape matches the estrangement profile) and scanner-test it |
| Stalking / coercive control | Local-only, single-import, no monitoring, no notifications — the design is the mitigation; analyzing received messages requires having them | "Only import chats you have permission to analyze" is the consent line; it is boilerplate-thin for the estrangement/ex cases where it matters most. Proposal: repeat it contextually in the silence card, not just onboarding |
| Minors | Nothing (open gap flagged in context research §15) | Set the store age rating ≥13 (or Teen) at listing time; no in-app age gate is proportionate for a local analyzer |
| Workplace surveillance | Work unmarketed; no work-coded surface exists | Keep; never add a work mode without the separate design pass (settled) |
| Analyzing another person without consent | Onboarding permission line; local-only limits blast radius | Accept residual risk; document it honestly (this audit does) |
| Labels as verdicts | Confidence labels declared copy; "not proof" lines everywhere | The 8A comprehension check (5–10 people) is the real test; run it |
| Screenshots dropping caveats | Safety line is *inside* the takeaway card | Keep the same invariant for the 8A hero card (limitation inside the card border) |
| Shareable reports dropping uncertainty | No share artifact exists | When 8C builds one, caveats travel inside the artifact (already specified) |
| "What happens next" heard as promise | Feature doesn't exist yet; allowed forms specified | Enforce the grammatical-subject rule in the scanner (subject = the chat/pattern), as the roadmap proposed |

The app is **not** a paternalistic warning screen — guardrail fatigue is the nearer failure mode (§6). Reduce repetition while keeping one visible limitation per claim-bearing card.

---

## 17. Privacy and security audit

Inspected code and workflows, not just docs (Verified in repository throughout).

1. **Local-only analysis / no network calls:** the import path uses `File.text()`/JSZip/`fetch` only against `Capacitor.convertFileSrc()` local URLs; `tests/onboarding.ts` asserts the import feature references no network APIs; no `fetch`/`XMLHttpRequest`/`WebSocket` to remote hosts anywhere in `features/`, `packages/`, `platform/` (grep-verified).
2. **No telemetry / accounts / backend:** no analytics SDK, no auth code, no server directory; `next.config.mjs` static export.
3. **Android permissions:** `AndroidManifest.xml` contains **no `<uses-permission>` at all** — no INTERNET, no storage. FileProvider is `exported=false`, path-limited. `allowBackup=false`. Intent filters accept only ZIP/TXT-ish MIME types.
4. **Residual verification gap:** manifest *merging* can reintroduce permissions from libraries (Capacitor core historically expects INTERNET). The final merged manifest of the built APK was not inspected in this audit. Proposal: add one release-workflow step — `aapt dump permissions app-debug.apk` asserted empty — so the local-only claim is build-verified forever. (Requires validation; cheap.)
5. **Cached-file lifecycle:** share-sheet imports copied to `cache/chatsense-shared-imports/`, size-capped at 50 MB, released after import, stale-pruned on plugin load; covered by Java unit tests and TS bridge tests including duplicate/race/failure paths.
6. **Report persistence:** none — analysis lives in React state; closing the app discards it. No localStorage/IndexedDB usage (grep-verified). Object URLs: none used (files read directly to text; no `URL.createObjectURL` in the import path).
7. **Logs:** no runtime logging of chat content found in TS or Java paths (Java catches swallow exceptions without logging content). Crash behavior: a WebView crash loses in-memory data only; no crash reporter exists (and none should, without a privacy design).
8. **Third-party dependencies:** the risk surface is npm. Two `"latest"` version specifiers (`framer-motion`, `@emotion/is-prop-valid`) and a `shadcn` CLI in *runtime* dependencies are supply-chain hygiene defects — any `npm ci` on a fresh lockfile refresh could pull unvetted majors. `npm audit` at this audit's run reports **3 vulnerabilities (1 moderate, 1 high, 1 critical)** — up from the 2 the Stage 5 report recorded in June, and unresolved since. Dozens of unused Radix packages inflate the attack surface for no benefit. **This is the weakest privacy-relevant area** (Product judgment).
9. **Build/release artifacts:** APKs published as clearly-labeled debug prereleases with SHA-256 and metadata; `.gitignore` covers artifacts/reports/APKs; CI uploads only synthetic-fixture benchmark reports.
10. **Demo export:** committed synthetic fixture, embedded at build time, byte-compared to the fixture in tests; no real people.
11. **Personal-data fixture policy:** stated in multiple docs, and no fixture in the repo resembles a real export (all synthetic names/cadences; checked).

---

## 18. Test audit

**Inventory (Verified):**

| Suite | What it protects | Assessment |
|---|---|---|
| `tests/parity.ts` + `python/tests/test_contract_parity.py` | Contract-constant equality + 21-fixture exact behavioral parity | **Highest-value tests in the repo**; golden files are behavior-anchored, not snapshot-brittle, because the contract defines the values |
| `tests/relationship-dynamics.ts` (94 asserts) | Turn/thread/window/comparison semantics incl. boundary fixtures (exact 6 h/15 min/24 h edges, bursts, open final turn, partial windows, group edges) | Strong; boundary-value fixtures are deliberate |
| `tests/insight-narrative.ts`, `tests/human-takeaway.ts` | Narrative selection, priority order, takeaway confidence + full scanner over every generated field; adversarial-content byte-identity | **The safety scanner + adversarial invariance test is the most original test asset**; protects the product's core promise |
| `tests/onboarding.ts` | Copy scan, demo=fixture byte-equality, no-network-API assertion | Good |
| `tests/import-boundaries.ts` | ZIP selection, error paths, Android bridge orchestration (cold/warm/race/duplicate/release), architecture boundaries (no platform imports in core; screens don't compute analytics; obsolete files stay deleted) | Architecture-boundary greps are cheap and load-bearing |
| `tests/forecasting.ts` (13) + `tests/forecasting-parity.ts` + Python mirrors | Censoring, supersession, leakage invariance, gate behavior, cross-language forecasting parity | Strong |
| Playwright viewport (3 widths × 2 flows) | Takeaway-above-metrics, overflow, demo flow, real file-input flow | Right-sized smoke |
| Maestro | On-device tab walk via demo | Local-only; honestly documented as not CI |
| Android unit tests | Intent routing, import manager (size, MIME, release, stale pruning) | Good |
| Python pytest (~38+) | Importer, features/labels, dynamics corrections, CLI contract, forecasting | Good |

**Gaps / weaknesses:**
- **False confidence from synthetic fixtures** is acknowledged everywhere it matters (forecasting) but also applies to the parser: all fixtures are clean ASCII, `/`-dated, LRM-free. **No fixture exercises**: dot-dated locales, U+200E prefixes, UTF-16 encoding, narrow-NBSP AM/PM, a >10 MB file. The parser is the least-tested-against-reality component while being the first thing every real user hits (§11). Highest-priority test gap.
- Tests that validate implementation against itself: the golden `fixtures/expected/*.json` were generated by the implementations; cross-language parity catches *divergence*, not shared misconceptions. Mitigated by hand-checkable fixture design; worth one hand-computed fixture (tiny chat where every number is verified manually in a comment).
- No performance test (large-export freeze risk is unmeasured).
- Viewport suite doesn't test the error state or a group-chat fixture through the UI.
- Duplicated tests: none significant. Brittle snapshot tests: none (a deliberate absence — good).

**Recommended lean pyramid going forward:** keep the current shape (contract/parity at the base, behavior fixtures in the middle, thin UI smoke on top) and add exactly: adversarial/parser-reality fixtures (locale/encoding/LRM), one hand-verified arithmetic fixture, an 8A card-state unit suite per scenario state, and the two-card consistency test (silence card vs rhythm wording). Resist adding UI screenshot tests.

---

## 19. Architecture and code-quality audit

**Module boundaries:** clean and *test-enforced* (core has no platform imports; screens don't compute; Python not bundled). Naming is consistent and honest. Types are strong (no `any` sightings in core; discriminated unions for states).

**Debt list, prioritized:**

**Critical (fix in or before Stage 8A):**
- C1. Silence-spec mismatch (§7.13/§24.1) — decide and document the "current gap" semantics; the 8A card depends on it.

**Before Stage 8A (small, do in the 8A PR or a tiny precursor):**
- B1. Remove dead presentational systems: `ChatAnalysis.insights` + `buildInsights` (with its off-contract 65% threshold), `relationshipDynamics.changeInsights` + `buildChangeInsights`, and unused `components/analytics/InsightRow.tsx` (grep-verified unrendered). They are live confusion for the next agent writing a mapping layer.
- B2. Contract-own or retire `activity.recentTrend` (±20%, 8-day floor) and `nightMessageRate` hour bounds (§7.18).

**Before Stage 9:**
- B3. Single-source the duplicated TS math/utils (§10.2); pass dynamics into `evaluateForecastingResearch` (§10.3).
- B4. Web import hardening: size cap, encoding sniff, and a Web Worker for parse+analyze (kills the freeze and unblocks big exports).
- B5. Dependency hygiene: pin `latest` specifiers, move `shadcn` out of runtime deps, prune unused Radix/ui components (roughly 40 files in `components/ui/` are template residue; `hooks/` duplicates `components/ui/use-mobile`, `styles/globals.css` duplicates `app/globals.css`), resolve npm audit criticals.

**Later:**
- L1. Virtualize/collapse the adaptive-window timeline for long exports.
- L2. Accessibility pass (aria-live, reduced motion, fine-print contrast).
- L3. TS media/deleted classification or contract annotation (§10.4).
- L4. Consider extracting narrative templates to a data file to make scanner coverage enumerable.

**Ignore:** micro-performance in dynamics (O(windows×messages) filtering is fine at realistic sizes once the worker exists); the Python package's research breadth (it is properly quarantined); framer-motion (works; only pin it).

**Maintainability for future agents:** high — the contract + parity + boundary-test triad means an agent can change core math only by changing the contract and fixtures, loudly. The main hazard is documentation sprawl (§31), not code.

---

## 20. Release and operational audit

**CI (`ci.yml`):** Node 22 / Python 3.13 / JDK 21 / Gradle cached; full check suite + web build + pytest + benchmark artifacts + cap sync + gradle test + assembleDebug on every PR and main push. Comprehensive for the maturity. Costs: full Android build on docs-only PRs (~minutes wasted; acceptable, or add a paths-filter later).

**Release (`release-debug-apk.yml`):** re-verifies everything, builds, checksums, uploads 30-day artifacts, creates per-SHA prerelease with honest "not production-ready" notes, refuses tag reuse across SHAs. **Appropriate and unusually careful for a debug-only channel.** Known gaps, correctly out of scope for now: no signed release build, no Play listing, no update path beyond re-downloading, no crash diagnostics (none possible without telemetry — a "copy last error" screen is the privacy-compatible ceiling if ever needed).

**Known `.next` stale-cache failure:** documented in agent lore; encountered handling this audit's verification is reported in §Verification below. Standing rule (delete only `.next`, rerun) remains correct.

**Stacked-PR complexity:** the current 4-deep doc stack (#17→#18→#19→this) is at the edge of what's manageable; each doc's branch note says how to rebase. Recommendation: merge the stack bottom-up promptly and return to single-PR flow; docs-only PRs still run full CI (fine).

**Proposed addition:** the merged-manifest permission assertion (§17.4).

---

## 21. Market and positioning audit

(Product judgment throughout; grounded in PRs #17–#19's external research, spot-verified — e.g., the competitor set's fabricated-claims characterization checked against Lucen's live marketing, which sells compatibility scores, attachment styles, and red-flag detection with server-side chat processing.)

- **"Are you overthinking, or did the pattern actually change?" is still the best acquisition promise.** Nothing in the repo or the research contradicts it, and the shipped engine genuinely answers it. Keep.
- **Unusual silence is the strongest *trigger*; pattern change is the strongest *promise*.** They are the same funnel: silence is the moment, change is the question. Marketing leads with the question; the product's first screen must handle the silence moment (8A card priority order: silence → change → carried contact, per scenario §23 — corrected for the §7.13 caveat).
- **"Relationship Read" as in-app name:** keep, per market review §5, always paired with the promise line. Nothing new to add.
- **Privacy is a trust mechanism, not the pitch.** Verified as the settled position; the onboarding already gets this order right.
- **Painful enough problem?** The felt need is Established (uncertainty-reduction, reassurance-seeking literatures); whether *this artifact* relieves it is Product hypothesis until the 5–10-person check runs. This is the single most important unknown in the company-shaped question.
- **Friendship second market:** credible (unclaimed space, loneliness epidemiology), as a *second copy pack and second campaign*, not a second product. Family: support with restraint, never market. Work: technically works, keep hidden. Groups: secondary. All settled; no new evidence.
- **Usage shape:** occasional tracker for a live uncertainty. Not one-use novelty (silences recur), not subscription-grade daily habit. Monetization: none until the core read is validated; the plausible future shape is per-chat "check again" (unchanged from PR #17).
- **What would users screenshot?** The 8A hero card if and only if it contains a named, counted sentence ("Asha restarted 7 of 9 silences"). Today: nothing is quotable enough.
- **What would disappoint?** A hedge-mush read on a chat the user *knows* changed; or discovering the app can't say anything about the silence they're currently in (which — today — it can't; §7.13).

**Best one-sentence pitch:** "Are you overthinking it, or did the pattern actually change? See what your chat's timing actually shows — privately, on your phone."

**Best App Store paragraph:** the market review §9 draft stands; no improvement found. (Promise → mechanism → refusal, in that order.)

**Best first screenshot:** the 8A hero card in the *pattern-changed* state with named counts and the inline limitation visible.

**Best first-demo scenario:** keep `stage4_increasing_initiation` (one side visibly starts carrying contact — the most recognizable situation), but consider a second demo fixture post-8A showing the silence card, since that is the acquisition moment.

**Claims never to advertise:** anything with ghosting/red flags/attachment/compatibility vocabulary, even negatively-framed comparisons that echo it; "know if they like you"; any reply-probability; "AI-powered" (it isn't, and the word imports the wrong trust model); family-conflict or workplace use cases.

---

## 22. Product-value audit

| Classification | Items |
|---|---|
| **Core selling point** | The 8A hero read (pattern change / carried contact / silence-in-context / honest insufficiency); named, counted evidence bullets; "what usually happened after pauses" empirical sentences; local-only privacy (as trust, not headline) |
| **Necessary evidence** | Evidence bullets with dates and samples; confidence labels; limitation lines; coverage dates; per-metric evidence states |
| **Useful secondary** | People tab contribution/maintenance detail; Rhythm longest-pauses list with restarters; weekday/hour rhythm charts; group participation view |
| **Power-user detail (Layer 3)** | Adaptive-window timeline with per-window participants; comparison ChangeCards; median inter-message gap; percentile machinery; forecasting gate status; contract thresholds |
| **Research-only** | Everything in `python/chatsense_ml` beyond parity; Stage 5 candidates/metrics; quarantined labels; notebooks |
| **Misleading** | Nothing currently shipped qualifies; nearest risk is "Latest gap percentile" (wrong-gap + jargon, §7.13) — fix rather than remove |
| **Unnecessary** | "Average reply" on Rhythm (E2 violation); `recentTrend` as a separate system beside recent/prior; the forecasting gate's *placement* on a primary tab; ~40 unused `components/ui/*` files |
| **Remove or hide** | Remove: `insights`/`changeInsights` dead systems, unused UI components, duplicate globals/hooks. Hide (Layer 3): forecasting gate, window timeline, percentile row (until re-worded as counts) |

This table is the anti-accumulation contract: anything new must name its row before it ships.

---

## 23. What has been done well

Concrete credit, all Verified in repository:

- **The contract-and-parity architecture** (PR #1, extended through Stage 5): one JSON source of truth, two implementations proven equal on 21 fixtures with exact integer equality and honest rounding unification (`js_round`). This is what lets a future agent refactor without fear, and it is rare at any company size.
- **Turn-based reply semantics with censoring** (Stages 4–5): collapsing same-sender bursts, `openAtExportEnd`, supersession termination, percentile-excludes-itself. Nearly every "chat analyzer" on the market gets these wrong; ChatSense got them right *before* shipping any user-facing claim that depends on them.
- **The safety-language system**: contract-owned guardrail strings, stem-based risk patterns with negation allowances, scanning of *every* generated field, and the adversarial-content byte-identity test proving message text cannot steer output. This mechanizes the product's ethics; it is the most original testing idea in the repo.
- **Honest insufficiency as a designed state** at every level (evidence states, unavailable reasons, limited takeaways, forecasting abstention).
- **The forecasting gate that cannot pass** without real-world validation evidence — a research module built to say no, and saying it.
- **Stage 7 onboarding**: copy-as-data (scannable), a synthetic demo through the true pipeline, byte-checked against its fixture, and a self-contained Maestro flow.
- **The Android import plugin**: size-capped, cache-scoped, release-after-import, race/duplicate handling, all unit-tested; replacing the old JS-injection bridge was the single biggest security improvement in the history.
- **The research documents themselves** (PRs #16–#19): they disagree with each other in the open, narrow their predecessors explicitly, label their own evidence quality, and flag their own unvalidated constants. The scenario research's E1–E19 standards are a genuinely reusable methodological asset.
- **Strongest single decision:** refusing content interpretation from day one. Every safety property and most of the trust story flow from that one boundary.

---

## 24. What should be corrected before Stage 8A

Only genuine blockers. There are **three**, all small.

**24.1 Silence-card input mismatch.**
- *Problem:* Stage 8A's highest-value card (unusual silence) is specified (scenario research §11) against a field semantics that doesn't exist: `latestGapMinutes` is the last *completed* inter-message gap, not "export end minus last message."
- *Evidence:* `relationship-dynamics.ts` `buildPauseSummary` (pause entries are consecutive-message pairs; the export's last timestamp *is* the last message); scenario research §11 "Inputs" and §8 row 5.
- *Consequence:* an agent implementing §23 verbatim would either mislabel a completed gap as the current silence (wrong, user-visible) or stall.
- *Fix:* a documentation decision plus at most a tiny derivation: present the last completed gap as "the most recent quiet stretch," and/or introduce a clearly-labeled device-time "quiet so far" that is treated as censored (never in its own reference distribution) with the staleness line. Update scenario research §8/§11 wording via pointer (this audit + master plan record the correction; do not rewrite history in PR #19).
- *Effort:* hours. *Owner:* `@chatsense/core` + docs. *Acceptance test:* 8A silence-state unit test asserts the card's gap description matches the field's true semantics, and the staleness line renders.

**24.2 Dead insight systems removed (B1).**
- *Problem/evidence:* `analysis.insights`, `changeInsights`, `InsightRow.tsx` computed/present but rendered nowhere (grep over `features/`); `buildInsights` carries an off-contract 65% threshold.
- *Consequence:* the 8A implementer must read four presentational systems to find the two live ones; risk of extending the dead one.
- *Fix:* delete the two builders, fields, and component; run parity (unaffected — they're outside the shared scope).
- *Effort:* under an hour. *Owner:* core. *Acceptance:* typecheck + tests green; grep clean.

**24.3 One current Stage 8A prompt.**
- *Problem:* three copy-paste prompts exist (roadmap §14, context §20, scenario §23) plus this audit's refinements; supersession is stated in prose but a fresh agent may grab the wrong one.
- *Fix:* the master plan (§16 of that document) is now the only prompt; pointer edits in the older docs (this PR) direct to it.
- *Effort:* done in this PR. *Acceptance:* every older prompt location carries a pointer.

**Explicitly *not* blockers:** parser locale gaps (real exports may fail, but 8A changes no parsing — schedule as Stage 8B/9 hardening with fixtures); web worker; dependency hygiene; UI demotions (8B); everything in §19 "Before Stage 9."

---

## 25. Stage 8A recommendation

**Decision: B — modify Stage 8A slightly** (the scenario research §23 brief, with three amendments), rather than A (verbatim), C (prototype-first), D (foundations-first), or E (don't build).

Why not A: the §23 brief's silence card is specified against wrong field semantics (§24.1) and doesn't state the estrangement-suppression rule as logic. Why not C: the cheapest honest prototype *is* the built card on synthetic fixtures — the 5–10-person check (already required before 8B) is the usability test, and mock screens would test copy the fixtures can render anyway. Why not D: the foundations are sound; §24's blockers are hours, not a stage. Why not E: the engine's value is real and the gap is presentational; not building the answer layer is the only way to waste what exists.

**Exact scope (supersedes prior prompts; the master plan carries the executable version):**

- One hero card on Overview, above the existing takeaway, with **four states**: *pattern change*, *carried contact* (five-label hierarchy from scenario §12), *unusual silence* (amended semantics per §24.1), *honest insufficiency* (first-class answer). State selection: strongest evidence wins; ties break silence → change → carried contact.
- Card anatomy: direct answer sentence → up to three dated, counted evidence facts → one historical-next-pattern sentence **only when** ≥3 comparable completed pauses exist and the pattern is not estrangement-shaped (suppression rule implemented as code, not copy) → confidence tag (existing three labels) → one inline limitation line inside the card → "See the evidence" affordance scrolling to existing sections.
- Copy: relationship-neutral; counts not percentiles; §21 examples as the tone bar; staleness line on the silence state.
- Pure mapping layer in `@chatsense/core` (`relationshipRead` or similar): deterministic function of existing analysis outputs; **no new metrics** except the trivially-derived quantities named in §24.1; no dependency, math, gate, or release changes.
- Tests: unit tests per card state over existing fixtures (`stage4_balanced_then_one_sided`, `activity_decline`, `long_silence`, `stage4_insufficient_export`, plus new fixtures for any uncovered state); scanner extended over every new string; the silence-card/rhythm-tab consistency test; adversarial-content invariance still byte-identical.
- Exit gate to 8B: all tests green **and** the 5–10-person qualitative check (two questions, ≥1 non-romantic scenario) run on rendered cards.

Small enough to ship: one core module, one component, copy, tests. No tab restructuring (8B), no context packs (8C), no share artifact (8C/8D), no new analysis (Stage 9).

---

## 26. Long-horizon scientific roadmap

**Present/MVP (Stage 8A)** — as §25. *User value:* an answer. *Scientific basis:* shipped counting + robust description. *Data:* none new. *Gate:* scanner + fixture states + comprehension check. *Safety risk:* over-reading; mitigated by inline limitation + counts-not-percentiles. *Exit:* comprehension check passed. *Don't:* new metrics, context packs, projections beyond empirical past-tense.

**Next 1–2 PRs (Stage 8B)** — humanize tabs and demote Layer 3 (§12); parser-reality hardening (LRM stripping, dot-date support, encoding sniff, size cap, worker) with new adversarial fixtures. *Value:* first screen readable end-to-end; real exports stop failing silently. *Gate:* viewport/Maestro updated; parser fixtures pass both languages. *Don't:* redesign visuals.

**Next 3–6 months (Stage 8C/8D + Stage 9 start)** — optional goal/context wording layer (goal-selection favored; wording-only, scanner-enforced); local shareable report with embedded caveats; then Stage 9 analysis in the scenario research's order: (1) intermittency classification (run-length extraction + finite-size-corrected burstiness as internal feature; Established basis [1–3]); (2) drift composite (≥2 agreeing indicators × ≥2 windows + seasonal caveat); (3) time-of-day-stratified reply comparison; (4) censored time-to-restart (Kaplan–Meier rendered as sentences). Each gated on synthetic fixtures + parity + the two-card consistency invariant. *Don't:* ship any of these without their fixture matrix; don't surface B, hazard curves, or entropy numbers.

**Research track (parallel, Python-only):** change-point models (PELT/BOCPD) as offline validators of the threshold rules; donated-data corpus exploration (metadata-only, per the ChatDashboard/WhatsR precedent [44, 45]); threshold sensitivity studies on donations.

**6–12 months (Stage 10):** event markers (user-supplied dates, ITS-style before/after, recall-bias mitigations); repeat-export comparison (needs an explicit opt-in local persistence design first — it currently contradicts the "nothing persists" promise, resolve *in the privacy docs before code*); historical analogs behind the comprehension gate; friendship retention features; P2 forecasting (discrete-time survival) only if a donated corpus exists.

**Long-term optional:** cross-chat self-pattern placement (within-person only, no rankings); P3 calibrated projections if P2 passes; multi-platform import (Telegram/Signal exports) — same boundary, new parsers.

**Never (restated):** content interpretation without a dedicated opt-in privacy/legal design document; live monitoring/notifications; population norms presented as "normal"; person-subject predictions.

---

## 27. User-friendly roadmap

| Technical | Human benefit |
|---|---|
| Stage 8A relationship-read mapping layer | "Open the app, get a straight answer to the question you actually had — with the receipts under it." |
| 8B tab humanization + Layer-3 demotion | "Every tab starts with the answer; the machinery is one tap deeper, not in your face." |
| 8B parser hardening (locales, LRM, encoding, worker) | "Your export just works — whatever phone or language it came from — and big chats don't freeze the app." |
| 8C goal/context wording | "The app speaks about *your* situation — a friendship, a family thread — without you filling out a form first." |
| 8D local shareable report | "Show a friend exactly what you saw — with the honest caveats built into the picture." |
| Run-length + corrected-burstiness intermittency | "Find out whether stop-start contact is just this chat's normal shape." |
| Multivariate drift composite | "'Did we actually drift?' gets an answer only when several signs agree — not because one busy week moved a number." |
| Time-of-day-stratified reply comparison | "Slower replies because life moved to evenings is different from slower replies, full stop — the app tells you which." |
| Censored time-to-restart (K–M) | "Quiet stretches like this usually ended within N days here — counted from your own history." |
| Event markers | "Mark the move, the fight, the graduation — see what actually changed after it, and what was already changing before." |
| Repeat-export comparison | "Check again in three weeks and see whether the pattern held, without re-reading the whole chat." |
| Donated-data research | "The thresholds behind your read get tuned on real, consented data — never on yours without asking." |

---

## 28. Scientific validation program

**Validatable with synthetic fixtures:** parser correctness per format; metric arithmetic; boundary behavior; card-state selection; scanner coverage; deterministic reproducibility. **Not**: real-world validity of anything.

**With parity tests:** cross-language semantic drift. **Not**: shared misconceptions (add one hand-computed fixture).

**With historical backtesting (per-export):** the P1/P2 forecasting metrics — the future of a chat is its own label. **Not**: transfer across chats.

**With public corpora (e.g., NUS SMS [43]):** timing-machinery stress on real human rhythms; parser robustness. **Not**: dyadic relationship constructs.

**With metadata-only data donation (the pivotal path):** threshold sensitivity (are 30%/2×/15 pp the right notability bars on real chats?); intermittency/drift label base rates; restart-time distributions; P2 model validation. Ethics: consent design, third-party-consent minimization (strip content at donation time — exactly the app's own feature surface), IRB-style review if partnered.

**With manual usability/comprehension studies:** whether reads are understood as pattern-not-verdict; whether the next-pattern sentence is heard as history, not promise (context research §18 experiments 4 and 6 are the templates).

**With longitudinal opt-in studies:** whether "check again" reads track users' own assessments over time. **Cannot be validated by anyone:** motive, interest, relationship health, reconciliation likelihood — Not inferable in principle; no study design fixes a construct the data does not contain.

**Minimum ethical study before each step:**
- *Changing thresholds:* donated-data sensitivity analysis (no user study needed).
- *Shipping historical analogs:* the §10 comprehension test (8–10 people, open-ended "what is this telling you will happen?"; zero participants describing a guarantee).
- *Unblocking forecasting:* P2 gates on a donated corpus + the same comprehension standard on P3 wording.
- *Claiming retention value:* a 10–20-person two-check panel (import, then invited re-check at 2–3 weeks; measure genuine return intent) — before any monetization decision.
- *Family-specific wording:* do not add until a family-context comprehension check shows the extra hedging survives being read; default to neutral indefinitely otherwise.

---

## 29. Usability-validation plan

Affordable for one developer, run around Stage 8A (build first, test the built cards — §25).

- **Participants:** 8–10; recruit from acquaintances-of-acquaintances (not the developer's close circle); at least 3 currently in a live "uncertain chat" situation (romantic or friendship); at least 2 thinking of a non-romantic chat; no minors; no compensation needed beyond thanks (or a small voucher).
- **Materials:** the built app rendering the five §21-style cards from synthetic fixtures (screenshots acceptable for remote participants). Never a participant's real export in front of the developer; if a participant wants to try their own chat, they do it on their own device, alone, and only describe the experience.
- **Scenarios shown (fixed order, rotated start):** pattern-changed; steady/balanced; carried-contact (mixed); unusual-silence with restart history; not-enough-data.
- **Protocol per card (≈4 min):** silent read (10 s timed) → "What does this tell you?" (open) → "What does it *not* tell you?" (open) → comprehension check: "Will they reply, according to this?" (correct answer: it doesn't say) → usefulness 1–5 → creepiness/trust 1–5 → "Would you want this about a chat of yours?" → for the silence card only: "What do you expect to happen next in that chat?" (checks the history/promise boundary).
- **End-of-session:** "Which card would you screenshot for a friend, if any?"; "Would you check the same chat again in a few weeks?"; overall trust rating; "was the evidence visible enough or too buried?"
- **Success thresholds (pre-registered in the PR that runs the study):** ≥8/10 correctly state the app doesn't claim motives or predict replies; 0/10 describe the next-pattern sentence as a promise; median usefulness ≥4 on at least two of the five cards; median creepiness ≤2; ≥half say yes to seeing it for their own chat. Failing the comprehension thresholds blocks 8B and triggers a copy revision, not a feature change.

---

## 30. Master prioritized backlog

(The master plan mirrors Now/Next; this is the authoritative full list.)

**NOW**

| ID | Title | Problem → Benefit | Sci. status | Deps | Effort | Risk | Acceptance |
|---|---|---|---|---|---|---|---|
| N1 | Silence-gap semantics decision | §24.1 spec/code mismatch → the silence card can ship honestly | Verified defect | — | XS | Low | Documented semantics + unit test |
| N2 | Delete dead insight systems | §24.2 → clean surface for the mapping layer | Verified | — | XS | Low | Grep-clean, tests green |
| N3 | Stage 8A hero card (4 states) | No answer-shaped output → the product's core value | Shipped-math mapping | N1, N2 | M | Medium (copy) | State unit tests + scanner + consistency test |
| N4 | 8A comprehension check | Unvalidated resonance → evidence before 8B | Product hypothesis test | N3 | S | Low | §29 thresholds |

**NEXT**

| ID | Title | Benefit | Deps | Effort |
|---|---|---|---|---|
| X1 | 8B tab humanization + Layer-3 demotion | Readable tabs | N3, N4 | M |
| X2 | Parser-reality hardening + adversarial fixtures (LRM, dot dates, encoding, size cap, worker) | Real exports work | — | M |
| X3 | Dependency hygiene (pin `latest`, prune UI lib, audit fixes) | Supply-chain and bundle health | — | S |
| X4 | Merged-manifest permission assertion in release workflow | Build-verified local-only claim | — | XS |
| X5 | TS utils consolidation + single dynamics computation | Less drift surface, faster import | — | S |
| X6 | Contract-own or retire `recentTrend`/night-rate constants | Threshold governance consistency | — | XS |

**LATER:** 8C goal/context wording (after N4 says neutral isn't enough or is); 8D local report; Stage 9 order: intermittency → drift → stratified replies → K–M restart; window-timeline collapse; a11y pass; repeat-export comparison (privacy design first); event markers.

**RESEARCH:** change-point offline validators; donated-data corpus + threshold sensitivity; P2 discrete-time survival (corpus-gated); analogs comprehension test; retention panel.

**REJECTED (do not reopen without new evidence):** composite score; ghosting/red-flag/compatibility framings; person-subject probabilities; live monitoring/notifications; group pairwise reads; automatic event/relationship-type inference; work-marketed surface; population-norm comparisons.

---

## 31. Documentation consolidation

**Authoritative going forward:** `docs/product/chatsense-master-plan.md` (new, this PR) — the single entry point and the only live implementation prompt. `contracts/*` remain authoritative for all constants; `docs/runtime_boundaries.md` remains authoritative for boundaries.

**Current and load-bearing (read as needed, via the master plan's reading order):** this audit; scenario-evidence-research (spec detail, with the §24.1 correction noted); relationship-context-research (context rules); relationship-read-market-review (positioning); relationship-read-roadmap (safety boundary §7/§9 remain normative); insight-narrative.md; relationship-dynamics.md; forecasting-methodology/safety; privacy.md; onboarding-import.md; agent-tooling.md.

**Historical (add "superseded/historical" headers; do not delete):** `ARCHITECTURE_REVIEW.md` (pre-Stage-1 world); stage reports 2–6.x (accurate records of their moments); `docs/data_contract.md` (mark as Python-report-scoped). The three embedded Stage 8A prompts (roadmap §14, context §20, scenario §23) are superseded by the master plan §16 — pointer notes added in this PR rather than edits to merged/stacked content.

**Rule for future agents:** one strategy document per PR at most; every new strategy document must name what it supersedes in its header and add a pointer *in* the superseded document in the same PR. The master plan is updated in the same PR as any change that invalidates it.

---

## 32. Decision log

| Decision | Reason | Evidence | Reconsideration trigger |
|---|---|---|---|
| Local-only, no cloud/accounts/telemetry | Trust moat; category is defined by cloud-LLM privacy failures | §17; competitor scan | A feature that *cannot* work locally and is worth a full privacy redesign (none known) |
| Metadata/timing analysis only; no message semantics | Only honest evidence base; entire safety model depends on it | Contract; runtime boundaries; adversarial test | Explicit opt-in content-analysis design doc, reviewed by the human owner — hard gate |
| No motive/emotion/diagnosis inference | Not inferable; harm-dominant | Roadmap §9; scanner | None — permanent |
| Romantic-first marketing, relationship-general core | Wedge urgency is highest; engine is already general | PRs #17–#18 | Wedge fails the §29-style checks twice |
| Friendship second; family cautious; work unmarketed; groups secondary | Evidence and risk per context | PR #18 §8–§11 | Real usage data contradicting the ordering |
| Human answer → visible evidence → nerd metrics | Users buy answers; evidence is the trust mechanism | PR #17; §5 of this audit | None — presentation principle |
| Evidence visible in-card; caveat inside every claim-bearing card | Screenshots travel | §16 | None |
| Forecasting gated; empirical past-tense statements are the product ceiling until P2/P3 pass | Nothing validated; baselines are hard to beat | §15 | Donated-corpus P2 pass with calibration + comprehension |
| No live monitoring, no notifications, no compulsive loops | Reassurance-seeking and coercive-control risks | PR #18 §15 | None — permanent |
| Ties break toward the weaker claim; "not enough data" is an answer | Honesty under uncertainty | E-standards; shipped states | None |
| No composite score | Single numbers read as relationship grades | Roadmap open-q 5; PR #17 | None foreseeable |
| Self-baselines only; no population norms | No defensible norm exists; social signatures are individual | Scenario research §2 rules | A donated corpus large enough to publish *ranges* (still never "healthy") |

---

## 33. Final verdict

**Is ChatSense worth continuing?** Yes. The hard, unrepeatable work — an honest deterministic engine with enforced safety language and cross-language parity — is done and is good. The remaining work to a real product is mostly *writing and ordering*, which is cheap relative to what exists.

**Strongest thing:** the integrity architecture — contract, parity, censoring semantics, safety scanner, adversarial invariance. The product can make a promise ("we will never lie to you about what this data shows") that its own test suite enforces.

**Weakest thing:** the gap between computed answers and delivered answers. The engine knows whether the pattern changed; the user gets a dashboard with a good paragraph on top. Secondary weakness: the parser has never met a messy real-world export, and the dependency manifest is the one place hygiene slipped.

**Does it currently help a normal person?** Marginally. It orients ("one side carried more of the contact") but does not answer the question they arrived with, and it cannot yet speak to the silence they are currently sitting in.

**What would make it genuinely useful?** Stage 8A as scoped in §25 — four honest card states, ten well-written sentences, the silence semantics fixed. That is the whole distance between "careful instrument" and "useful product."

**What should be built next?** N1 → N2 → N3 → N4 (§30). Nothing else first.

**What should never be built?** The rejected list (§30/§32): content reading, monitoring, verdicts, rankings, person-subject predictions, engagement mechanics.

**Realistic long-term ceiling:** a respected, modestly-sized, privacy-first tool — the one product in its category that professionals could recommend without embarrassment; occasional-use with per-chat re-check monetization; thousands-to-hundreds-of-thousands of users, not viral millions (the honesty that creates the trust also caps the theater). Within that ceiling, it can be the *definitive* tool, because no competitor can copy the honesty without abandoning their business model.

---

## Verification

Runs executed for this audit on 2026-07-12 (Windows 11, Node 22, Python 3.13), from `product/full-project-audit` at the head of the PR #17→#18→#19 stack. This PR changes documentation only; the suite was run to validate this audit's repository-health claims.

| Command | Result |
| --- | --- |
| `npm ci` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test` | Passed (import/boundaries; relationship dynamics; 12-case narrative matrix; 15-case takeaway matrix; onboarding/demo; 13 forecasting tests) |
| `npm run test:parity` | Passed for 21 fixtures |
| `npm run test:forecast-parity` | Passed for 10 fixtures |
| `npm run forecast:eval` | Passed; wrote reports for 10 fixtures to `artifacts/forecasting/` |
| `npm run build` | Passed on the first run; the known stale-`.next` failure did **not** occur this time |
| `npm run test:viewport` | Passed — 6/6 across 360×800, 390×844, 412×915 |
| `python -m pip install -e ".[dev]"` | Passed |
| `python -m pytest` | Passed — 38 tests |
| `python -m chatsense_ml.forecasting.evaluate` | Passed; wrote report for 10 fixtures |
| `npm audit` | **3 vulnerabilities (1 moderate, 1 high, 1 critical)** — worse than the 2 recorded in the Stage 5 report; supports backlog item X3 |
| `git diff --check` | Clean (Windows CRLF warnings only) |
| `git status --short` | Only this PR's intended files modified/added |

*Maestro/device tests were not run (local device QA only, per `docs/agent-tooling.md`). Android/Gradle was not run (no runtime or Android files change in this PR).*
