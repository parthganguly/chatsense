# Product roadmap: human relationship read and trajectory

**Status:** strategy document — nothing in this file is implemented yet.
**Audience:** the next model/agent (GPT-5.5, Sonnet 5, a future Fable/Codex agent) picking up ChatSense after Stage 7.
**Written:** 2026-07-07, from `main` at the merge of Stage 7 (onboarding, import, demo export).
**Superseded as an implementation prompt (2026-07-12):** the authoritative baton is now [`chatsense-master-plan.md`](./chatsense-master-plan.md), whose §16 prompt supersedes §14 below; the full-project audit ([`chatsense-full-project-audit.md`](./chatsense-full-project-audit.md)) is the evidence behind it. This roadmap's safety boundary (§7 allowed/forbidden forms, §9 forbidden-claims list) remains normative.

**Before implementing Stage 8A, read [`relationship-read-market-review.md`](./relationship-read-market-review.md)** — a skeptical product/marketing review of this roadmap. It recommends a narrower first slice than §10/§14 below describe; see its §12–§13 for the revised brief.

**Also read [`scenario-evidence-research.md`](./scenario-evidence-research.md)** — the scenario library and empirical-method catalog behind this roadmap. It maps every user situation to observable data, statistical method, minimum evidence, safe wording, and limitation; its §7 matrix, §11–§12 designs, and §23 brief are the implementation spec for Stage 8A's card content.

**Also read [`relationship-context-research.md`](./relationship-context-research.md)** — a deeper research pass on whether this product should stay romantic-only or expand to friendship, family, and work contexts. Its verdict: the analysis engine is already relationship-agnostic (it always has been); the risk was the roadmap's own copy layer (§6 below) reading as romance-coded by default. Its one binding addition to Stage 8A: write default copy in relationship-neutral language ("this chat," not "relationship"; "quieter/busier," not "cooling/warming" wherever equivalent) so a later optional context-wording layer (romantic/friendship/family/work) can be added without rewriting the default. See its §19–§20 for the revised sequencing and copy-paste prompt.

This is a baton document. It assumes you have not read the chat history that produced Stages 1–7. It tells you what we know, what the product should become, what not to do, what to build first, how to validate it, and where the ethical boundary sits. It deliberately leaves design room: you are expected to improve on the label sets and layouts proposed here, not transcribe them.

---

## 1. Executive summary

ChatSense is technically solid and unusually honest for its category. It parses WhatsApp exports locally, computes deterministic timing/volume/initiation analytics with no LLM, no sentiment, no content interpretation, and no cloud, and it presents them across four tabs (Overview, Changes, People, Rhythm) with evidence-backed narrative and a research-gated forecasting module that currently — correctly — reports itself as *not validated*.

The product problem: **users do not emotionally buy "analytics."** A normal person opening this app is not asking "what is my adaptive-window message velocity?" They are asking:

- Where does this connection seem to stand?
- Is it mutual, one-sided, warming, cooling, intermittent, or fading?
- What changed?
- What usually happens after silence?
- If the current pattern continues, what does that look like?
- How much should I trust this read?

Today the app answers these questions only implicitly, scattered across metric cards. It risks feeling like a stats dashboard about a relationship rather than a read of one. User research on this category (summarized in §4) shows people want actionable narratives — "is our communication growing or fading?" — while explicitly not wanting deterministic claims about motives, emotions, or relationship truth. That is precisely the lane ChatSense can own, because its architecture already refuses the unsafe claims competitors make.

**The recommended direction is a three-layer inversion of the UI:**

1. **Human read first** — a short, plain-language relationship read: here's the pattern, here's where it seems to be moving, here's why, here's what we cannot know.
2. **Evidence second** — the exact observable bullets that produced the read, with dates, ranges, and sample sizes.
3. **Nerd metrics third** — everything the app shows today, moved behind a details layer for power users.

Nothing about the analysis engine needs to change to do this. The work is a mapping layer (metrics → human labels), a presentation reorder, and a safety/language discipline. That is Stage 8 (§10).

---

## 2. Product positioning

**ChatSense is a local, private communication-pattern reader.**

It does not tell users what someone secretly feels. It tells users what the communication pattern *looks like*, from observable behavior only:

- mutual or uneven
- warming or cooling (in activity, not emotion)
- active or quiet
- intermittent or steady
- carried by one side or shared
- historically likely to restart or stay quiet after pauses

Every read is backed by inspectable evidence from the user's own export, computed on-device, with uncertainty stated rather than hidden.

### Candidate taglines / app-store-style descriptions

Pick or improve; do not use more than one primary tagline.

- "See the pattern behind your conversations."
- "Patterns, not guesses."
- "A private relationship read from communication behavior — not mind-reading."
- "Find out whether the chat is mutual, cooling, or carried by one side — with evidence."
- "Your chats have a rhythm. See it clearly, privately, on your device."
- "Not a fortune teller. A pattern reader."
- "The honest read: what your chat history actually shows, and what it can't."

Longer app-store paragraph draft:

> ChatSense reads the communication pattern in a WhatsApp chat export — who starts conversations, how replies flow, when the rhythm warms or cools, and what usually happens after a silence. Everything runs on your device: no upload, no account, no AI reading your messages. ChatSense never claims to know what someone feels. It shows you the pattern, the evidence behind it, and exactly how much the data can and cannot say.

The word "read" (noun) is doing deliberate work throughout this document: it is human, it implies interpretation-with-uncertainty (as in "my read is…"), and it does not promise truth the way "score," "analysis," or "prediction" do.

---

## 3. User problem: jobs-to-be-done

The person who imports a chat export is almost never curious about statistics. They are in a moment of uncertainty about a relationship and want a grounded external reference point. The jobs, by relationship type:

**Romantic**
- "Am I overthinking, or has the pattern actually changed?"
- "Is effort mutual, or am I doing the work?"
- "Is this silence normal for us, or unusual?"
- "When we've gone quiet before, did it usually restart?"

**Friendship**
- "Did we drift, or does it just feel that way?"
- "Am I the only one initiating?"
- "Is this friendship active, or just occasional check-ins?"

**Family**
- "Who carries contact in this family thread?"
- "Is this on-and-off pattern normal for us?"
- "Are the boundaries I set reflected in how the timing changed?"

**Work**
- "Who coordinates? Who follows up?"
- "Are replies slowing down on this project?"

Two things are true about these jobs simultaneously:

1. They are emotionally loaded questions, and the user *will* read emotional meaning into whatever we show. We cannot prevent that; we can only make sure what we show is honest and framed as pattern, not psyche.
2. Every one of these questions **has a legitimate pattern-level answer** that ChatSense's existing metrics can support. "Is effort mutual?" maps to initiation/restart share. "Is this silence normal?" maps to gap percentiles. "Did we drift?" maps to windowed activity comparison. "Does this usually restart?" maps to pause-reconnection history.

ChatSense should serve these questions through **pattern reads, not psychological verdicts**. The answer to "am I overthinking?" is never "yes/no" — it is "the measurable pattern did/didn't change, and here is exactly what changed." That reframing is the product.

---

## 4. Competitive reality

Apps in the "analyze my chat" space sell bold, emotionally magnetic claims: compatibility scores, hot/cold meters, ghosting risk, red-flag detection, relationship direction, future prediction, attachment-style typing, and direct advice ("text them / don't text them"). Some pipe message content through cloud LLMs to do it.

This proves two things:

1. **Demand is real.** People pay for a read on a relationship. The emotional job in §3 is a market, not a hypothesis.
2. **The prevailing supply is unsafe.** Compatibility percentages from message metadata are fabricated precision. "Avoidant attachment" from reply latency is diagnosis without basis. "Ghosting risk: 78%" is prophecy dressed as statistics. Cloud LLM pipelines mean the most intimate text people possess leaves their device. These products convert anxiety into engagement, and their confident wrongness can steer real decisions in real relationships.

ChatSense must not copy the unsafe version — not only ethically but strategically. It cannot out-bold products willing to fabricate, and it shouldn't try. Its differentiation is being **the honest one**:

- **Local-only.** The export never leaves the device. No account, no telemetry.
- **No message-content interpretation.** Timing, volume, initiation, structure only.
- **Evidence-backed.** Every read links to the exact observable bullets that produced it.
- **Uncertainty visible.** Confidence is shown, "not enough data" is a first-class answer, and limitations are printed next to conclusions.
- **No fake certainty.** No percentages that imply validated probability, no verdicts about motive or feeling.
- **Inspectable.** The user can drill from any read down to the raw metrics that produced it.

The bet: there is a segment of this market that has been burned by, or is suspicious of, the horoscope apps — and an honest read with visible evidence is *more* reassuring to the anxious user, not less compelling. "Here is what actually changed, and here is what we can't know" is a calmer, more trustworthy product than "❤️ 64% compatibility."

---

## 5. Product architecture: the three-layer UX

This is the critical product design principle of this whole document. Every screen should be organized as:

**Layer 1 — Human read (shown first).**
Short. Plain language. Mobile-first. Zero jargon — no "adaptive window," "percentile," "gate," "baseline," "sample," or "metric" visible at this layer. It answers "where does this seem to stand?" in a sentence or two plus a handful of human labels. A normal person should absorb it in under ten seconds.

**Layer 2 — Evidence ("Why this read?").**
Expandable or immediately below. Exact bullets: observable quantities, dates/ranges, sample sizes, and caveats. This is where numbers appear, but framed as observations ("Recent weeks averaged 31 messages vs. 52 earlier") rather than as a dashboard. Every Layer 1 label must be traceable to at least one Layer 2 bullet — no orphaned claims.

**Layer 3 — Details (power-user layer).**
Everything the app shows today: charts, windows, thresholds, raw metrics, forecasting-gate status, distributions. Behind a "Details" affordance or lower on the page. Nothing is removed from the product — it is demoted, not deleted.

Rules for future implementers:

- **Nerdy terms live only in Layer 3.** If a term needs a statistics course to parse, it does not appear in Layers 1–2.
- **Layer 2 is the trust mechanism.** The read is credible *because* the evidence is one tap away. Do not bury it so deep it feels withheld (see open question in §13).
- **Layer 1 must degrade honestly.** With sparse data, Layer 1 says "Not enough to read yet" — it never fills the space with a low-confidence guess styled like a confident one.
- The existing human takeaway cards (Stage 6.2, `packages/chatsense-core/src/human-takeaway.ts`) are a proto-Layer-1 and the natural foundation to build on, not replace from scratch.

---

## 6. Proposed top-level feature: Relationship Read

A new hero section — the first thing on Overview — called **Relationship Read** (working name; see §13 on whether this name should go bigger or smaller).

### Fields

| Field | Answers |
|---|---|
| Current pattern | What does the communication look like right now? |
| Direction of travel | Compared to this chat's own history, which way is it moving? |
| Effort balance | Who starts and restarts conversations? |
| Silence pattern | Is the current quiet normal for this chat? |
| What usually happens next | Historically, what followed situations like the current one? (§7) |
| Confidence | How much history backs this read? (§8) |
| Why this read appears | Layer 2 evidence bullets |
| What this cannot prove | Standing limitation line(s) |

### Suggested label vocabularies

These are starting points. Future agents should refine wording (and must run any wording through the safety filter in §9), but should keep the *shape*: small closed sets of human phrases, each mechanically derivable from existing metrics, always including a "not enough data" member.

**Current pattern**
- Mutual and steady
- Active, but uneven
- One side is carrying contact
- Warming up
- Cooling down
- On-and-off pattern
- Quiet lately
- Not enough to read yet

**Direction of travel**
- Getting warmer
- Cooling recently
- Holding steady
- Becoming more one-sided
- On-and-off
- Too early to tell

**Effort balance**
- Mostly mutual
- One side starts more
- One side restarts more
- Mixed effort
- Not enough evidence

**Silence pattern**
- Normal for this chat
- Longer than usual
- Pause-and-return pattern
- Quiet lately
- Too little history

Notes for the implementer:

- "Warmer/cooling" here refer to **activity and responsiveness relative to this chat's own baseline**, never to emotion. The evidence bullets must make that concrete, and at least one caveat line should say so explicitly.
- Labels compare the chat **to itself**, not to other people's chats or to a normative ideal. There is no "healthy" reference chat.
- When two labels are near-tied (e.g., "Cooling down" vs. "On-and-off"), prefer the weaker/more hedged claim. Ties break toward humility.
- Every label must be a pure function of existing deterministic outputs (`RelationshipDynamics`, `ReplyDynamics`, `SilenceSummary`, activity windows, initiation/restart shares). If a label can't be computed from what exists, it doesn't ship in Stage 8A.

---

## 7. "What usually happens next" design

This is the most sensitive surface in the product. Done wrong it is prophecy; done right it is the single most valuable field in the app.

**Design it as historical pattern description and conditional projection — never as prediction of a person's behavior.** The grammatical subject is always the *chat's history* or *the pattern*, never *they*.

### Allowed forms

- "After pauses longer than one day, this chat restarted 7 of 9 times."
- "Historically, replies in this chat usually arrived within 6 hours."
- "If the recent pattern continues, the next comparable period would likely be lower than the earlier baseline."
- "Past quiet stretches like this one usually ended within a week in this chat."
- "There is not enough history to estimate a usual next pattern."

Each of these is a frequency statement about the past, or an arithmetic extrapolation explicitly conditioned on "if the pattern continues." Both are defensible from data the user can inspect.

### Forbidden forms

- "They will reply." / "They won't reply."
- "They are ghosting you."
- "They lost interest."
- "This relationship will end." / "…is going somewhere."
- "You should message them." / "Wait three days."
- Any unconditioned probability of a *person's* future action ("82% chance they text back").

### Naming

Use one of: **"What usually happens next"** (recommended — plain, honest, self-limiting), "Usual next pattern," "Pattern projection," "Historical next-step pattern."

Avoid: "Prediction," "Future," "Will they reply?," "Relationship outcome," "Forecast" (in UI copy; fine as an internal module name).

### Relationship to the existing forecasting gate

Stage 5 built a research-only forecasting module (`packages/chatsense-core/src/forecasting.ts`, docs in `docs/forecasting-methodology.md` and `docs/forecasting-safety.md`) whose gate is currently **blocked**: backtests have not beaten conservative baselines on appropriate validation data, so product forecasting is off.

The rules for this section, given that state:

1. While the gate is blocked, "What usually happens next" uses **empirical baselines only** — counts and quantiles of what actually happened in this export (restart rates after pauses, historical reply-time quantiles, straight-line window comparison). These are descriptions of the past, not model output, so they do not require the gate. **Never label them as validated prediction.**
2. If Stage 9 (§10) someday validates forecasting past the gate, this section may strengthen — e.g., calibrated interval statements — but it must still show uncertainty, still speak about the pattern rather than the person, and still pass §9's language filter. Validation earns precision, not certainty.
3. The gate's status can be *mentioned* in Layer 3 for transparency, but Layer 1 must not expose gate jargon. The Layer 1 experience of an unblocked-vs-blocked gate is "slightly stronger statements," not a mode switch the user has to understand.

---

## 8. Evidence and confidence system

### Confidence labels

Three levels, card-level (see §13 for the card-vs-overall open question):

- **Strong read** — long history, multiple independent signals agreeing, adequate samples in every input.
- **Useful read** — enough data to say something, with visible caveats about what's thin.
- **Light read** — sparse, short, or contradictory data; the read is a sketch. Below some floor, don't show a read at all: show "Not enough to read yet."

### What confidence is computed from

- total message count and span of active days
- number of comparison windows available
- reply-opportunity sample count
- number of pause/restart events observed
- consistency of each signal across windows (a signal that flip-flops is worth less)
- agreement between independent signals (initiation share, reply timing, and volume trend pointing the same way beats one signal alone)
- sparsity/contradiction penalties (gaps in coverage, near-tied labels)

The existing `TakeawayConfidence` machinery in `human-takeaway.ts` is a starting point; extend rather than duplicate.

### What confidence is *not*

- It is **not truth.** A Strong read means "the pattern is well-evidenced," not "the interpretation of the relationship is correct." Copy must never equate the two.
- **No false precision.** Never render "87% confident" or any percentage/decimal confidence unless it is a *statistically justified, validated* quantity (which nothing in the current system is). Three coarse labels are a feature: they honestly represent the resolution we actually have.

### Evidence bullet style guide

Concrete, dated, quantified, past-tense observations. Model examples:

- "Recent activity dropped from 52 to 31 messages/week."
- "Asha restarted 7 of 9 pauses longer than one day."
- "Typical reply time moved from 18m to 2.4h."
- "Thread starts were uneven: 72% / 28%."
- "The latest gap was longer than 83% of earlier gaps."

Rules: name the participant when the metric is per-participant (using the names from the export); include both sides of any comparison; include the sample size when it is small ("7 of 9," not "usually"); percentages describe *observed shares of past events*, never future probability.

---

## 9. Safety boundary

This section is normative. Future agents extend the lists; they do not shrink them.

### Forbidden positive claims

The app must never assert, imply as a finding, or use as a label any of the following about people or the relationship:

love · rejection · attraction · interest/disinterest (as inner state) · cheating · ghosting · breadcrumbing · avoidant · anxious (as attachment/clinical label) · narcissistic · toxic · manipulative · soulmate · compatibility · healthy/unhealthy relationship · "the relationship will end" (or last) · "they will reply" (or won't) · "you should message" (or shouldn't) · any diagnosis · any therapy or coaching advice

The prohibition covers synonyms and euphemisms, not just the literal strings. "They seem distant" is a motive claim wearing a hedge; it is still forbidden at the claim level. ("The chat has been quieter than its earlier baseline" is the allowed pattern-level counterpart.)

### Allowed caveats (standing copy)

- "This does not prove interest or rejection."
- "This is not relationship advice."
- "Observed in this export; it does not explain why."
- "This is a communication-pattern read, not proof of motive or relationship status."

The existing `NARRATIVE_TAKEAWAY_SAFETY_LINE` constant in `packages/chatsense-core/src/contract.ts` is the current single source of safety copy; the Relationship Read should extend that mechanism, keeping safety strings as testable constants rather than scattered literals.

### The principle behind both lists

User-friendly *state labels are allowed* — "Cooling down," "One side is carrying contact," "Quiet lately" are warm, human words. What keeps them safe is that each one is **tied to an observable communication pattern and traceable to evidence bullets**. The forbidden list is exactly the set of claims that cannot be tied to observable pattern: inner states, motives, clinical categories, relationship verdicts, futures, and advice. The test for any new label is: *can a skeptical user tap through and see the arithmetic that makes this label true?* If yes, it can ship. If the label smuggles in a why, a feeling, or a future, it cannot.

Enforcement is already partly mechanized: `tests/helpers/narrative-safety.ts` holds the shared risk-pattern lists, and `tests/import-boundaries.ts` / `tests/onboarding.ts` scan copy against them (boundary *negations* like "does not prove love" are permitted; positive claims are rejected). Stage 8A must extend that scanner to cover the entire Relationship Read surface (labels, evidence templates, caveats) so that a future copy edit cannot silently cross the boundary.

---

## 10. Implementation roadmap

### Stage 8A — Relationship Read MVP

The smallest shippable version of everything above.

- New relationship-read module in `@chatsense/core`: a pure, deterministic `relationshipRead` object derived from existing analysis outputs (no new metrics required). Fields per §6: current pattern, direction, effort balance, silence pattern, what usually happens next (empirical baselines only, per §7), confidence, evidence bullets, limitation lines.
- Hero card on Overview rendering it in the three-layer shape: read → "Why this read?" evidence → link/scroll to existing details.
- Simple label sets from §6, each with a "not enough data" degradation path.
- Tests: unit tests over synthetic fixtures for each label (stable, cooling, one-sided, intermittent, short-history), plus the extended forbidden-language scanner over all new copy.
- No changes to analysis math, no new dependencies, no release-workflow changes.

### Stage 8B — Humanize all tabs

- Changes tab leads with "Where it's moving"; People leads with "Effort balance"; Rhythm leads with "Silence pattern" — each the corresponding Relationship Read field expanded, with tab-local evidence.
- Raw metric cards and charts move lower on each tab or behind a details affordance.
- Viewport tests and the Maestro flow (`maestro/chatsense-smoke.yaml`) updated for the new first-screen content.

### Stage 8C — Report / shareable read

- A locally generated HTML report (or printable view): relationship read first, evidence second, full details and limitations third.
- Generated and saved entirely on-device; no cloud, no share endpoint. Sharing is the user exporting a file themselves.
- Must include the limitation lines prominently — a shared artifact travels without the app's context, so the caveats have to travel inside it.

### Stage 9 — Validated projections

- Revisit the Stage 5 forecasting gate. Empirical baselines first; a model is promoted only if it beats those baselines on appropriate validation data with calibration evaluated (see `docs/forecasting-methodology.md`).
- If promoted, "What usually happens next" may make calibrated interval statements — still pattern-subject, still uncertainty-forward, still no motive claims (§7 rules persist).
- If not promoted, nothing changes; empirical baselines remain the ceiling.

### Stage 10 — Optional advanced research

- Multi-chat comparisons (how this chat's rhythm compares to the user's other chats — carefully framed; other chats are context, not a norm).
- Relationship-type presets (romantic/friend/family/work) adjusting emphasis, not claims.
- User-labeled ground-truth experiments and optional self-reported context, to validate whether reads match users' own assessments.
- **No message-content analysis** unless a future explicit opt-in, privacy, and legal design document is written and reviewed first. This is a hard gate, not a backlog item.

---

## 11. Implementation hints for the next agent

Before writing code, inspect:

| Where | Why |
|---|---|
| `packages/chatsense-core/src/index.ts` | The full exported analysis surface; the read must be derivable from these types |
| `packages/chatsense-core/src/human-takeaway.ts`, `insight-narrative.ts` | Existing narrative/takeaway machinery — the proto-Layer-1 to build on |
| `packages/chatsense-core/src/relationship-dynamics.ts` | Windowed comparisons, initiation/restart, pause-reconnection — most Read fields come from here |
| `packages/chatsense-core/src/forecasting.ts`, `forecasting-contract.ts` | Gate status and what "blocked" means for §7 |
| `packages/chatsense-core/src/contract.ts` | `NARRATIVE_TAKEAWAY_SAFETY_LINE` and the contract pattern for safety copy |
| `features/import/demoExport.ts`, `fixtures/whatsapp/`, `fixtures/forecasting/` | Demo and synthetic fixtures; the demo must show a compelling Read |
| `tests/helpers/narrative-safety.ts`, `tests/import-boundaries.ts`, `tests/onboarding.ts` | The shared risk-pattern lists and forbidden-language scanners to extend |
| `tests/viewport/`, `maestro/chatsense-smoke.yaml`, `playwright.config.ts` | UI test surfaces to update in 8B |
| `docs/privacy.md`, `docs/onboarding-import.md`, `docs/runtime_boundaries.md` | The boundary documents any new surface must stay inside |

Likely shape of Stage 8A (deliberately loose — design the details yourself):

1. Add a relationship-read module in core; expose it as `analysis.relationshipRead` (or a parallel top-level function — your call; keep it deterministic and content-independent either way).
2. Render the hero card on Overview; wire "Why this read?" to evidence bullets.
3. In 8B, add the section cards to Changes/People/Rhythm and demote raw metrics.
4. Test against synthetic fixtures for each labeled scenario; extend Playwright/Maestro.

Do not treat this document's label strings, field names, or thresholds as final. Do treat §7's allowed/forbidden forms and §9's boundary as final unless a human owner revises them.

---

## 12. Evaluation plan

The product is better if, and only if:

- A normal user can understand the first screen without reading a single metric.
- The first screen answers "where does this stand?" in under 10 seconds.
- Evidence bullets are visible (one tap or one scroll away, never hidden).
- A user can articulate the difference between what the app claims (pattern) and what it doesn't (motive) after using it once.
- No forbidden claim (§9) appears anywhere, in any data condition.
- The demo import produces a genuinely compelling example of a Read.
- A short export shows "Not enough to read yet" instead of a confident-looking guess.

### Manual QA checklist for Stage 8A/8B

- [ ] Real export read-through (the developer's own; never committed) — does the Read feel true to someone who knows the chat?
- [ ] Synthetic stable case → "Mutual and steady" / "Holding steady"
- [ ] Synthetic cooling case → cooling labels with correct evidence deltas
- [ ] Synthetic one-sided case → effort labels name the right participant
- [ ] Synthetic intermittent case → on-and-off labels, restart history correct
- [ ] Short export → graceful "not enough data" at every field
- [ ] Group chat → either a coherent multi-participant read or an honest "reads are designed for two-person chats" fallback — never a silently wrong two-person read

---

## 13. Open questions for the next model

Decide these during Stage 8 design; none are settled here.

1. **Label wording.** Which labels feel human but not unsafe? "Cooling down" is honest about pattern but users may hear emotion — is there better wording, or is the caveat line sufficient?
2. **Naming.** Should "Relationship Read" be the product's headline concept (marketing, onboarding, app store) or just a section title? Alternatives: "The Read," "Pattern Read," "Where things stand."
3. **Confidence granularity.** Card-level confidence (each field has its own) vs. one overall read confidence? Per-field is more honest (silence history can be rich while reply samples are thin) but heavier UI.
4. **Placement of "What usually happens next."** On Overview inside the hero, or a separate tab/section? It is the highest-interest and highest-risk field; placement affects how much framing surrounds it.
5. **Composite score.** Can a single "communication pulse" number be safe, or does any composite inevitably read as a relationship grade? (Current lean: don't build it; a single number is the horoscope-app move.)
6. **Details discoverability.** How do we hide Layer 3 without making evidence feel withheld? (Possible norm: Layer 2 always visible below the fold; only Layer 3 is behind a tap.)
7. **Relationship-type presets.** Should users pick romantic/friend/family/work? It could tune emphasis and copy, but it also invites the app to perform expertise it doesn't have. If added, presets change *emphasis*, never claims.
8. **Group chats.** Separate read design, reduced read, or explicit non-support? Effort balance and silence mean different things with five participants.

---

## 14. Recommended next PR prompt (Stage 8A)

Copy-paste for the next agent:

> You are working on the ChatSense repo. Start from `main` (green). Read `docs/product/relationship-read-roadmap.md` in full first — it is the baton document for this work — plus the files listed in its §11 table.
>
> Create branch `product/human-relationship-read-stage-8a`.
>
> Implement the **Relationship Read MVP** per roadmap §6–§10 (Stage 8A):
>
> - Add a deterministic, content-independent relationship-read module to `@chatsense/core`, derived only from existing analysis outputs. Fields: current pattern, direction of travel, effort balance, silence pattern, what usually happens next (empirical baselines only — the forecasting gate is blocked; see roadmap §7), confidence (Strong/Useful/Light read + not-enough-data floor), evidence bullets, limitation lines.
> - Render it as the hero card on Overview using the three-layer principle (roadmap §5): human read → "Why this read?" evidence → existing details below. Keep nerd metrics in the background; do not delete them.
> - Respect the safety boundary in roadmap §9 exactly. Extend the forbidden-language tests (shared patterns in `tests/helpers/narrative-safety.ts`, applied as in `tests/import-boundaries.ts`) to cover all new labels, evidence templates, and caveats.
> - Add unit tests with synthetic fixtures for stable, cooling, one-sided, intermittent, and short-history cases, including "Not enough to read yet" degradation.
> - Hard constraints: no new dependencies; no changes to analysis math or the forecasting gate; no message-content interpretation; no cloud/telemetry; no changes to the release workflow; never use or commit personal exports.
>
> Run full verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, plus `git diff --check`. Update the demo flow if the Read changes the first screen (Maestro/viewport tests).
>
> Open a **draft** PR titled "Stage 8A: Relationship Read MVP" describing what was added, the safety measures, and test coverage. Do not merge. You have design freedom on label wording, module shape, and layout within the roadmap's hard boundaries (§7 allowed/forbidden forms, §9 language boundary, three-layer hierarchy).

---

*End of baton. The engine is honest; make the product feel that way.*
