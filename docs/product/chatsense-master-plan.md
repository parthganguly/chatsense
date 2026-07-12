# ChatSense master plan

**Status:** authoritative baton. This is the default entry point for any agent or human continuing ChatSense. Where it conflicts with earlier implementation prompts (roadmap §14, context-research §20, scenario-research §23), **this document wins**. Its evidence base is [`chatsense-full-project-audit.md`](./chatsense-full-project-audit.md) (2026-07-12).
**Update rule:** any PR that invalidates a statement here updates this file in the same PR.

---

## 1. Product definition

ChatSense is a **local, private communication-pattern reader** for WhatsApp chat exports. It computes deterministic, content-independent descriptions of communication structure — initiation, reciprocity, reply timing, pauses, reconnections, longitudinal change — and presents them as a plain-language read backed by visible, counted evidence, with "not enough data" as a first-class answer. It never interprets message content, infers motive or emotion, diagnoses, advises, ranks people, or predicts a person's actions.

## 2. User promise

> **"Are you overthinking it, or did the pattern actually change?"** — see what the chat's timing actually shows, privately, on your device, with the receipts and the limits stated.

## 3. Primary audience

Romantic overthinkers in the early/uncertain phase (dating, talking stage, situationship), triggered by a specific delta: a slower reply, an unusual silence, a felt shift. Marketing is romantic-first; **in-app copy is relationship-neutral** ("this chat," "contact" — never "relationship" in default copy).

## 4. Secondary audiences

Friendship drift (second market and second copy pack, unclaimed space); family (supported with extra restraint — no forward statements for estrangement-shaped patterns, structural-role caveats on asymmetry); work (technically supported, never marketed, never a branded surface); group chats (participation view only, never pairwise relationship reads).

## 5. Scientific boundary

- Data: timestamps, senders, message/word counts only. No content semantics.
- Comparisons: always the chat against its own history (within-person/within-dyad). No population norms.
- Statistics: medians/quantiles for delays and gaps (means Layer-3 only); counts rendered as frequencies ("8 of 10"), never percentile jargon in user-facing copy; right-censoring respected everywhere (open final turn, current silence, export end); sample minimums before any directional label; ties break toward the weaker claim; insufficiency is never converted to zero or a guess.
- Forecasting: **blocked**. `realWorldValidationEligible` is hardcoded false; only counted history and explicitly conditioned arithmetic ("if the pattern continues…") may reach users. The full standards are E1–E19 in `scenario-evidence-research.md` §6 — normative, extend-only.

## 6. Architecture boundary

- `@chatsense/core` (TypeScript) is the only production engine; free of React/DOM/Capacitor/Node-fs imports (test-enforced).
- Screens render precomputed `ChatAnalysis`; they never calculate behavioral metrics (test-enforced).
- Python `chatsense_ml` is research/reference only; never bundled into Android.
- All thresholds live in `contracts/behavioral_contract.json` / `forecasting_contract.json`; both languages mirror them via tested constant layers; shared behavior is proven equal on `fixtures/expected/*` (exact equality, 21 fixtures).
- Android native code does file access and lifecycle only (SharedFile plugin: private cache, 50 MB cap, release-after-import). No permissions in the manifest.
- All user-facing strings must pass the forbidden-language scanner (`tests/helpers/narrative-safety.ts`).

## 7. Current state (2026-07-12)

Stages 1–7 merged and green: parser, contract v2.0, relationship dynamics, blocked forecasting gate with cross-language parity, evidence-backed narrative + human takeaway cards on four tabs (Overview/Changes/People/Rhythm), Android native import, onboarding + synthetic demo, debug-APK release workflow. Research stack PRs #17 (market review) → #18 (context research) → #19 (scenario library) open as stacked drafts; this plan and the full audit sit on top of #19.

The engine computes answers; the UI does not yet deliver them as answers. Stage 8A closes that gap.

## 8. Known problems (from the audit; §-refs into it)

1. **Silence-spec mismatch (blocker):** `pauseSummary.latestGapMinutes` is the last *completed* inter-message gap, not "export end minus last message" as scenario-research §11 assumed. The current, ongoing silence is right-censored and not represented. Decide presentation before the silence card ships (audit §7.13, §24.1).
2. **Dead code (blocker-adjacent):** `ChatAnalysis.insights`, `relationshipDynamics.changeInsights`, and `components/analytics/InsightRow.tsx` are computed/present but never rendered; `buildInsights` carries an off-contract threshold. Delete before building the mapping layer (audit §24.2).
3. Rhythm tab violates house rules: "Latest gap percentile: 83%" (percentile jargon, wrong gap) and "Average reply" (mean of a heavy-tailed quantity) on a primary surface (audit §9).
4. Parser has never met a messy real export: no dot-date locales, no U+200E/LRM stripping (silent message merging on iOS exports), web path is UTF-8-only with no size cap, parse+analyze runs synchronously on the UI thread (audit §11).
5. Dependency hygiene: two `"latest"` specifiers in runtime deps, `shadcn` CLI as a runtime dep, ~40 unused UI components, unresolved npm audit findings (audit §17.8, §19).
6. `activity.recentTrend` and night-rate constants are hardcoded, not contract-owned (audit §7.18).
7. Forecasting-gate status renders on a primary tab; it is Layer-3 material (audit §12).
8. Guardrail repetition approaches fatigue: up to five safety texts visible on one screen (audit §6).

## 9. Next implementation: Stage 8A — Relationship Read MVP

One hero card on Overview with **four states** — pattern change, carried contact (five-label hierarchy), unusual silence (corrected semantics), honest insufficiency — selected by strongest evidence (ties: silence → change → carried contact). Card anatomy: direct answer sentence; up to three dated, counted evidence facts; a historical-next-pattern sentence only when ≥3 comparable completed pauses exist **and** the pattern is not estrangement-shaped (suppression implemented as logic); confidence tag (existing labels); one inline limitation inside the card; details affordance to existing sections. Pure mapping layer over shipped math. Full prompt in §16.

## 10. Next three stages after 8A

- **8B:** humanize all tabs; demote Layer 3 (forecasting gate, window timeline, percentile row, average reply) behind Details; parser-reality hardening (LRM, dot dates, encoding sniff, size cap, worker) with adversarial fixtures; update viewport/Maestro.
- **8C:** optional goal/context wording layer (goal-selection favored; wording-only string substitution, scanner-enforced; friendship pack first); dependency hygiene if not already done.
- **8D:** local shareable report with caveats embedded in the artifact; second demo fixture showcasing the silence card.

## 11. Research roadmap

Stage 9 analysis, in order: (1) intermittency classification (run-length extraction + finite-size-corrected burstiness as internal feature); (2) multivariate drift composite (≥2 agreeing indicators × ≥2 windows + seasonal caveat); (3) time-of-day-stratified reply comparison; (4) censored time-to-restart (Kaplan–Meier rendered as sentences). Parallel Python-only track: change-point models (PELT/BOCPD) as offline validators; metadata-only donated-data corpus (ChatDashboard/WhatsR precedent) for threshold sensitivity and P2 forecasting (discrete-time survival). Stage 10: event markers; repeat-export comparison (requires an opt-in local-persistence privacy design *first* — it currently contradicts "nothing persists"); historical analogs behind a comprehension test; friendship retention features. P3 calibrated projections only if P2 passes on real data.

## 12. Validation gates

- **8A → 8B:** all tests green + a 5–10-person comprehension check on rendered cards (two questions minimum: "what does this tell you?" / "would you want this for your own chat?"), ≥1 non-romantic scenario included; pre-registered thresholds in audit §29 (notably: zero participants read the next-pattern sentence as a promise).
- **Any new analysis (Stage 9):** synthetic fixture matrix + TS/Python parity + the two-card consistency invariant (silence card and rhythm wording must agree) before any user-facing label.
- **Historical analogs:** comprehension test passes or the feature waits.
- **Forecasting unblock:** P2 beats best baselines on Brier **and** ECE across fixtures + donated corpus + subgroups; then P3 wording passes comprehension; synthetic fixtures can never open the gate.
- **Threshold changes:** donated-data sensitivity analysis; never tuned on intuition alone.
- **Monetization:** only after a retention panel shows genuine re-check intent.

## 13. Safety rules (permanent unless the human owner revises)

No motive/emotion/attachment/diagnosis/advice/relationship-status claims, including synonyms and hedged variants. Subject of any next-pattern sentence is the chat/pattern, never "they." No person-subject probabilities. No live monitoring, notifications, or re-check nudging mechanics. No content interpretation without a dedicated reviewed opt-in design document (hard gate). No ranking of people or chats. No population "normal." Every claim-bearing card carries its limitation *inside* the card (screenshot-safe). Every new string passes the scanner. Family/estrangement-shaped patterns get no forward-looking sentences. "Not enough data" is an answer, never an error.

## 14. Rejected ideas (do not reopen without new evidence)

Composite/compatibility scores; ghosting or red-flag detection under any name; reply-probability for a specific silence; group pairwise reads; automatic event or relationship-type inference; work-marketed surface; population-norm comparisons; engagement/streak mechanics; content semantics; separate products per relationship type.

## 15. Reading order for a new agent

1. This file.
2. `chatsense-full-project-audit.md` — evidence for every claim above (skim §1, §7, §24, §25, §30).
3. `docs/runtime_boundaries.md` + `contracts/behavioral_contract.json` — non-negotiables.
4. `scenario-evidence-research.md` §6 (E-standards), §7 (matrix), §11–§12 (card designs, with audit §24.1's correction), §21 (copy bar).
5. As needed: market review (positioning), context research (context rules), roadmap (safety boundary §7/§9), insight-narrative.md, relationship-dynamics.md, forecasting docs, privacy.md, agent-tooling.md.
6. Historical only (do not execute): ARCHITECTURE_REVIEW.md, stage reports, the older Stage 8A prompts in roadmap §14 / context §20 / scenario §23.

## 16. Ready-to-copy prompt for the next implementation agent

> You are working on the ChatSense repo. Read `docs/product/chatsense-master-plan.md` in full, then follow its §15 reading order. Start from green `main` (verify the research-doc stack PRs #17–#19 and the audit PR have merged; if not, coordinate before branching). Create branch `product/human-relationship-read-stage-8a`.
>
> **Pre-work (same PR, first commits):**
> 1. Delete the dead systems: `ChatAnalysis.insights` + `buildInsights` in `chat-analyzer.ts`, `relationshipDynamics.changeInsights` + `buildChangeInsights` in `relationship-dynamics.ts`, and `components/analytics/InsightRow.tsx`. Run parity (unaffected) and all tests.
> 2. Implement the silence-gap decision (audit §24.1): present `latestGapMinutes` truthfully as the most recent *completed* quiet stretch; add a clearly-labeled, device-time "quiet so far" figure treated as right-censored (never in its own reference distribution), with the staleness line "Measured to the export's last message (DATE). If you've talked since, re-export for a current read."
>
> **Build Stage 8A: one hero card on Overview, above the existing takeaway, with four states over existing metrics only:**
> 1. **Pattern change** — answer-shaped read over `earlyLate`/`recentPrior`/`notableChanges`.
> 2. **Carried contact** — the five-label hierarchy (balanced / mixed / consistently asymmetric / recently-becoming-asymmetric / insufficient) as a pure function over per-participant, per-period outputs (scenario research §12).
> 3. **Unusual silence** — most-recent-quiet-stretch rank rendered as counts ("longer than 8 of the 10 earlier quiet stretches"), restart composition ("all 9 earlier day-plus pauses ended with a new conversation — 6 started by Priya"), duration spread, staleness line (scenario research §11 as corrected above).
> 4. **Honest insufficiency** — a designed first-class answer (scenario research §21 example 8), never an error.
> Show whichever state has the strongest evidence; ties break silence → change → carried contact. The historical-next-pattern sentence appears only with ≥3 comparable completed pauses AND suppressed (as code, not copy) when the gap/return shape is estrangement-like (multi-month silences dominating the history).
>
> **Rules:** new logic is mapping/aggregation only — no new metrics beyond the trivially-derived quantities above, no analysis-math changes, no dependencies, no forecasting-gate changes, no content interpretation, no telemetry, no release-workflow changes. Relationship-neutral wording; counts not percentiles; scenario research §21 is the tone bar; every card state carries its scenario-specific limitation line inside the card; family-shaped restraint applies whenever intermittent-restart facts lead. Never use or commit personal exports.
>
> **Tests:** unit tests per card state over synthetic fixtures (reuse `stage4_balanced_then_one_sided`, `activity_decline`, `long_silence`, `stage4_insufficient_export`; add fixtures for uncovered states); extend `tests/helpers/narrative-safety.ts` scanning to every new label, template, and caveat; add the two-card consistency test (hero silence state must not contradict Rhythm wording); keep the adversarial-content byte-identity test green; keep parity untouched.
>
> **Verify:** `npm run lint && npm run typecheck && npm run test && npm run test:parity && npm run test:forecast-parity && npm run build && npm run test:viewport` (update viewport expectations for the new first screen), plus `python -m pytest` and `git diff --check`. If `npm run build` fails on a stale cache, delete only `.next` and rerun, and say so in the PR.
>
> Open a **draft** PR titled "Stage 8A: Relationship Read MVP" describing the states, the silence-semantics decision, safety measures, and test coverage. Do not merge. Before Stage 8B, run the comprehension check in audit §29 and report results in the PR.

---

*The engine is honest. Make the first screen an answer.*
