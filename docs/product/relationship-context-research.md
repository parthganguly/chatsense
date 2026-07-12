# Research: relationship contexts and the market wedge

**Status:** research only — nothing in this document changes code, analysis logic, or UI. It is a strategy input for whoever designs Stage 8A, not a Stage 8A spec, and not a rewrite of the roadmap or market review.
**Audience:** the next model/agent (GPT-5.5, Sonnet 5, a future Fable/Codex agent) deciding how wide ChatSense's product surface should be before implementing Stage 8A.
**Written:** 2026-07-11, from a branch stacked on PR #17 (`product/relationship-read-market-review`, not yet merged at time of writing — see note below).
**Reads first:** `docs/product/relationship-read-roadmap.md` (PR #16, merged) and `docs/product/relationship-read-market-review.md` (PR #17, draft). This document does not repeat their content; it extends them with a wider relationship-context lens and external research.
**See also [`scenario-evidence-research.md`](./scenario-evidence-research.md)** — the follow-on scenario library and empirical-method catalog (written 2026-07-12). It inherits this document's context rules (neutral copy, family restraint, work unmarketed, groups secondary) and adds the per-scenario evidence chains — construct, method, minimum sample, safe output, limitation — plus hard empirical standards (its §6) and the prediction research plan (its §18). Its §23 implementation brief supersedes the Stage 8A prompt in §20 below for card-content specifics, while §20's neutral-wording and hard-constraint requirements remain binding.

**Branch note:** PR #17 was still in draft, not merged, when this research began. Per the task instructions this branch was stacked on PR #17's head (`product/relationship-read-market-review`) rather than waiting. When PR #17 merges, this branch should be rebased onto `main`; the diff will shrink to just this document plus the three pointer edits.

---

## 0. How to read this document

The market review (PR #17) already answered "is Relationship Read compelling?" for the romantic case and said: yes, narrower, ship the one-sentence version first. This document asks a different question: **should the product's architecture, copy, and roadmap ever assume "relationship" means "romantic," and if not, how wide should it go, in what order, and what must never be inferred?**

The short version, expanded in §1: the analysis engine (`@chatsense/core`) is already relationship-agnostic — it has never known what kind of relationship a chat represents, because it only ever reads timing, senders, and volume. The thing that risked becoming romantic-only was the **copy layer** the roadmap proposed (§6 of the roadmap: "Cooling down," "One side is carrying contact" — words a reader will hear as being about romantic feeling). This document's central finding is that the fix is smaller than a re-architecture: keep the MVP's default copy relationship-neutral, market it romantic-first, and add explicit (never inferred) context refinement later, starting with friendship.

---

## 1. Executive verdict

**Recommendation: Romantic-first go-to-market, neutral-core product, explicit-opt-in context layer added after MVP validation — friendship second, family and work supported but not marketed, group chats reduced/secondary.**

This is a refinement of the proposed strategy ("romantic-first go-to-market + relationship-general product architecture"), not a replacement, but it changes what "relationship-general" means in a load-bearing way:

- **The engine is already relationship-general and always has been.** `@chatsense/core` computes turn share, thread-start share, reconnection share, reply latency, and messages-per-active-day from parsed messages and timestamps only (`packages/chatsense-core/src/relationship-dynamics.ts`, `contract.ts`). It has never taken a "relationship type" input and never inspected message content beyond word counts. There is no architecture to build to "make it general" — that part of the strategy is already true and should be stated as a fact, not a future milestone.
- **What is not yet general is the proposed copy layer.** Roadmap §6's label vocabulary ("Cooling down," "One side is carrying contact," "Warming up") reads as romantic-relationship language to most people, because temperature metaphors for relationships are romance-coded in everyday English. If Stage 8A ships those exact labels as the *default*, unconditional copy for every import — including a mother's chat with her adult son, or a manager's 1:1 thread — the product will feel like it's misapplying a dating frame to non-dating data, even though the underlying computation never assumed romance.
- **The fix is sequencing, not scope-cutting.** Ship Stage 8A (per the market review's narrowed brief) with copy that is relationship-neutral by default — "this chat," "this conversation," "contact" instead of "relationship," "warming/cooling" reframed as activity-level language everywhere it's ambiguous. Market it romantic-first (the wedge is real and validated below in §7). Add an *explicit* context choice later (§5) that only ever changes wording emphasis, never the underlying claim or the safety boundary.
- **Broadening to friendship strengthens the product; broadening to family, work, and group chats should stay supported-not-marketed for now**, for reasons specific to each (§8–§11). This is not "the idea becomes weaker when broadened" — it is "the idea is a single engine with a wedge-shaped front door and several rooms behind it, and only one room (friendship) is currently worth a second front door."

This verdict rejects three of the seven candidate strategies outright: **romantic-only** (throws away a real, already-general engine and the friendship opportunity in §8 for no engineering savings), **separate products for separate relationships** (fragments a single deterministic engine that already produces the same output shape for every context — there is nothing to separate), and **the idea becomes weaker when broadened** (the market research below shows the opposite: broadening to friendship addresses a *larger*, evidence-backed, currently-unserved need — US adult loneliness affects roughly half the population [8] and skews toward the *friendship* gap specifically, not just romantic gaps). It also rejects "needs more validation before choosing" as the top-line answer — there is enough theoretical and market evidence to commit to the sequencing above — while agreeing that the market review's narrower first-slice validation (5–10 people, §18) is still the right next experiment for the *copy*, independent of this scope question.

---

## 2. Universal human problem

Evaluating the candidate universal questions against the theory and market research below:

- *"Did the pattern actually change?"* is necessary but not sufficient — it's the empirical half of the answer, not the reason someone opens the app.
- *"Am I carrying this relationship?"* is close, but it's romance/friendship-coded; it reads as false or irrelevant for a parent-child pair (where asymmetric carrying is often structurally expected, not a red flag) or a manager/report pair (where it's a job description).
- *"Is this silence unusual?"* and *"Do we repeatedly reconnect?"* are real, high-value questions, but they're instances of the pattern-change question, not the root of it.
- *"Am I relying on feelings when the observable pattern says something else?"* is the deepest candidate, and the research supports it directly: uncertainty reduction theory [2] holds that people are chronically motivated to resolve uncertainty about relationships through available information, and the relational turbulence model [14] specifically ties *relational uncertainty* to rumination and communication difficulty. The hyperpersonal model [16, 17] explains the mechanism that makes this urgent in text-based relationships specifically: with nonverbal cues stripped out, people over-attribute meaning to whatever thin signal remains (a slower reply, a shorter message), so the feeling and the evidence drift apart more easily in chat than in person.

**The true universal core is a calibration need, not a diagnosis need**: across every relationship type, people form a felt sense of "something changed" or "something is off" faster and with less evidence than the actual communication record would justify, and they have no private, low-cost way to check that felt sense against the record. ChatSense's job is to be that check — not to replace the feeling, not to explain it, just to hold it up against the pattern.

**Universal product promise:**

> **"See whether what you feel about this relationship's pattern matches what the messages actually show."**

Shorter working variant for UI use: **"Check your read against the pattern."**

This holds without becoming meaningless in every required context:

- Romantic: "I feel like they've pulled away — has the pattern actually changed, or am I reading into a normal quiet week?"
- Friendship: "I feel like we've drifted — did contact actually drop, or does it just feel that way because we don't talk daily anymore?"
- Family: "I feel like Mom only calls when she needs something — does the contact pattern actually support that, or is it a few salient memories?"
- Work: "I feel like my manager is ignoring me — are replies actually slower, or does everything feel slow when you're anxious about a project?"

It fails gracefully where the underlying data can't support it (§4) by resolving to "not enough to read yet" rather than inventing a calibration it can't back up — which is itself consistent with the promise: silence about a feeling you can't check is more honest than a false check.

---

## 3. Relationship-context matrix

Emotional intensity, willingness-to-pay, willingness-to-share, and implementation difficulty are rated Low/Med/High as **product judgment calls informed by the research below**, not measured data — ChatSense has no telemetry and no user study yet (§18 proposes how to get real signal).

| Context | Core user question | Trigger moment | Emotional intensity | Import motivation | Useful observable metrics | Safe human-language outputs | Dangerous interpretations | Recurrence/retention | Willingness to pay | Willingness to share | Product value | Safety risk | Impl. difficulty |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Early romantic / talking stage | "Are they losing interest, or am I overthinking?" | A reply came slower than usual; a text went unanswered a day longer than normal | High | Acute, same-day | initiation share, reply latency trend, restart-after-pause rate | "Replies have slowed from ~20m to ~2h over two weeks"; "You started 8 of 11 threads" | "They're losing interest," "they're pulling away," attachment-style labels | High — re-check every 1–3 weeks during the uncertain phase | Low per-read, plausible for repeat "check again" | High (quotable, low social cost to seek external validation) | **Highest** — validated in market review §4 | Medium — anxious over-reading is likely and expected | Low (existing metrics) |
| Established romantic relationship | "Is this still working the way it used to?" | A milestone (anniversary, move-in) or a vague sense something shifted | Medium | Occasional, reflective | full early/late window comparison, contact-maintenance balance | "Contact has stayed steady across the last 6 months" | "the relationship is failing," compatibility claims | Medium — annual/occasional check | Low | Medium | Medium | Low-medium | Low |
| Post-breakup / no-contact | "Did I miss the signs? Was I imagining it?" | The breakup itself; the silence that followed | Very high | One-time, retrospective | historical pattern before the end, restart history | "Activity dropped in the final month, following a longer stable period" | "they never loved you," "this proves they were checked out," any claim about why it ended | Low — one dominant session, occasional relapse-checks | Low | Medium (people do discuss breakups with friends) | Medium — real pain, ethically fragile (market review §4) | **High** — grieving user, no ongoing relationship to "recalibrate" against, risk of obsessive re-analysis | Low |
| Close friendship | "Did we drift, or does it just feel that way?" | A long gap noticed after the fact, rarely a single sharp trigger | Medium | Reflective, often after noticing a gap | activity trend, initiation balance, restart-after-gap rate | "Contact has been steady for over a year"; "You've restarted after every long gap so far" | "they don't value the friendship," "you're being used" | **High** — durable relationships people revisit for years, good comparison-over-time loop | Low-medium | High (friendship-drift is a relatable, shareable feeling) | **High**, currently unserved (§8) | Low — lower stakes than romance, still real | Low |
| Drifting friendship | "Are we actually growing apart?" | Realizing you haven't spoken in months | Medium-high | Reflective, sometimes urgent after a missed event | long-run activity trend, longest gap vs. history | "This is the longest this chat has gone quiet in 3 years" | "the friendship is over," motive claims about why | Medium — natural to check again after reaching out | Low | High | High | Low-medium | Low |
| Family relationship (general) | "Is this on-and-off pattern normal for us?" | A holiday, a conflict, a long gap | Medium-high, often complicated | Occasional, event-driven | contact frequency over time, initiation balance, gap-and-return pattern | "Contact has followed a similar on-and-off shape for the last 2 years" | anything about love, obligation, or motive (§9) | Medium — event-driven (holidays, anniversaries of conflict) | Low | Low (families discuss this less openly than friendships) | Medium | **High** — see §9 | Low-medium |
| Parent–adult-child | "Am I the one always reaching out?" | Noticing a pattern after years, often prompted by a milestone (parent aging, own kids) | High, often ambivalent | Reflective | initiation share, contact frequency trend, restart-after-gap | "You've started most contact over the last year; contact overall has stayed steady" | "they don't care," "you're the martyr," any closeness/health claim | Medium-high — a relationship people revisit for decades | Low | Low-medium | Medium-high | **High** — ambivalence research [10] says close-and-strained coexist; a contact-share number cannot see that | Low-medium |
| Estranged / intermittent family contact | "Is this cycle of withdrawal-and-return normal, or is it ending?" | Reconciliation attempt, or another lapse | Very high | Rare, high-stakes | gap/return history, whether contact has a repeating shape | "Contact has resumed after every gap so far, average N months later" | anything implying reconciliation is likely, deserved, or a person's fault | Low-medium — infrequent but recurring across years | Low | Very low (highly private) | Medium — real need, highest fragility | **Very high** — Pillemer's research [12] shows reconciliation tracks letting go of "who's right," not contact frequency; a metric here can mislead badly if read as forecasting reconciliation | Medium (needs the most careful copy, not new metrics) |
| Professional one-to-one | "Are we coordinating well, or is something off?" | A stalled project, a missed follow-up | Low-medium | Rare, task-triggered | response-time trend, follow-up burden | "Replies have typically arrived within a working day" | anything with "relationship" framing; motive/performance claims | Low — task-bound, not identity-bound | Low (would want a work tool, not a "relationship" app) | Very low (surveillance-adjacent) | Low-medium (§10) | **High** — surveillance optics | Low (metrics exist) but **high** in perceived legitimacy |
| Manager/direct-report | "Am I being ignored, or is this normal for how my manager works?" | A pattern of slow replies, a stalled 1:1 | Medium (but professionally coded, not identity-coded) | Rare | reply-time trend, initiation asymmetry (structurally expected) | "Replies from your manager have typically taken about a day" | "your manager doesn't respect you," any performance/career-risk implication | Low | Low | Very low | Low — real coordination question, wrong brand for it (§10) | **Very high** — power asymmetry means a report analyzing a manager (or vice versa) is adjacent to workplace surveillance regardless of who initiates the import | Low technically, high in appropriateness |
| Mentor/student | "Is this a real ongoing connection or did it quietly end?" | End of a program, a long gap after graduation | Low-medium | Rare, often nostalgic | contact frequency trend, longest gap | "Contact has been infrequent but has restarted several times over 3 years" | any claim about how much the mentor "cares" | Low | Low | Low-medium | Low-medium, niche | Low-medium | Low |
| Two-person vs. group conversations | (structural, not a single question) | n/a | n/a | n/a | participation share, but reply-attribution is approximate | "Messages were concentrated: two participants sent 80% of messages" | any per-person "relationship" claim in a group — reply attribution is guessed, not observed (§11) | n/a | n/a | n/a | Low as a first-class mode; useful as a participation-only view | **High** — misattributed one-to-one claims in a group are the single easiest way to ship a wrong, confident-sounding read | Medium-high (real technical limits, not just policy)

---

## 4. What is universal in the data

The strongest single piece of external evidence for the whole strategy is Canary, Stafford, Hause & Wallace's inductive study comparing relational maintenance strategies **across lovers, relatives, friends, and other ties in one dataset** [3, building on 4]: the same maintenance-behavior taxonomy (positivity, openness, assurances, sharing tasks, social networks, joint activities) was empirically measurable across all of those relationship types. This is direct peer-reviewed support for the architecture bet already embedded in `@chatsense/core`: **initiation, restart-after-pause, and contact-maintenance behavior are constructs that exist and can be measured the same way regardless of relationship label.** ChatSense doesn't need a citation to justify computing `threadStartShare` generically — it already does — but this is external confirmation that the construct itself, not just the arithmetic, transfers across contexts.

The metrics that mean approximately the same *thing* (an observable fact about who does what, when) across every context in §3:

- **Who initiates** (`thread_start_share`) — always means "who starts new threads after a silence gap," full stop. The fact is universal.
- **Who restarts after silence** (`reconnection_share`) — always means "who sends the first message after a 24h+ pause," full stop.
- **Activity direction** (`messages_per_active_day` trend) — always means "more or fewer messages on active days than before," full stop.
- **Response-timing changes** (`median_reply_minutes` trend) — always means "the typical delay before a sender-switch changed," full stop.
- **Follow-up burden** (`follow_up_rate`) — always means "how often one side sends another message before the other replies," full stop.
- **Gap/return shape** (`pauseSummary`, longest gaps, latest-gap percentile) — always means "how does the current quiet period compare to this chat's own history of quiet periods," full stop.

What is **not** universal is what those facts are evidence *of* — and this is where every relationship-general claim must stop short:

| Same fact | Romantic reading | Manager/report reading | Parent/adult-child reading | Crisis/illness-period reading |
|---|---|---|---|---|
| One person starts 80% of threads | Feels one-sided, often read as "they don't want this as much as I do" | Often structurally normal — initiating check-ins is part of the manager role | Confounded by family role, life stage, and who has more discretionary time; a parent calling more is not evidence of more caring | Expected to invert or spike temporarily; a caregiver checking in constantly during a health scare is not evidence of anything about the baseline relationship |

This table is the crux of the whole document's methodological stance: **the data is universal, the interpretation is not, and ChatSense's entire safety model already depends on separating those two things** (roadmap §9's forbidden-claims list is, in effect, a list of interpretations the app must never supply). Widening to more relationship types does not add new interpretive risk in kind — it was already there for romance ("cooling down" is already an interpretation risk) — it adds *volume and variety* of context where the same interpretation would be wrong for a different reason. The mitigation is not new engineering; it's making sure copy never says more than the fact, regardless of which context selector (if any) is active.

---

## 5. Context selection

| Architecture | What it is | Verdict |
|---|---|---|
| **A. No relationship-type selection** | One universal read, wording kept neutral ("this chat," "contact") | **Best for Stage 8A.** Ships fastest, matches the market review's narrowed brief, avoids any inference risk entirely, and the neutral wording is honestly closer to what the data can say anyway (§4). |
| **B. User chooses relationship type before analysis** | Romantic / friendship / family / work / other, selected up front | Real value for wording (§6), but asking for a label *before* any value has been shown raises the bar to first use and implies the app will tailor its *analysis* to the choice — it should only tailor wording. Defer to Stage 8C, and even then keep it optional and after the first read, not a gate before it. |
| **C. User chooses a goal rather than a relationship type** | "Has the pattern changed?" / "Is effort mutual?" / "Is this silence unusual?" / etc. | Interesting alternative to B — a goal maps more directly to which metric to foreground and sidesteps naming a relationship at all, which is gentler for ambiguous or undefined connections (situationships, estranged family). Worth prototyping as an alternative to B in Stage 8B's context-experiment (§18), not decided here. |
| **D. Hybrid — universal read first, optional context refinement after** | Show the neutral read; offer an optional "make this feel more like [friendship/family/work] wording" refinement | **Recommended long-term architecture.** Matches the market review's "don't gate value behind a choice" instinct and this document's "neutral core, optional context layer" verdict in §1. |
| **E. App infers relationship type** | From message content, participant names, or emoji/pet-name usage | **Rejected. Do not build.** Beyond being explicitly out of scope per the task's hard constraint, it would require content interpretation the engine deliberately does not perform (`docs/runtime_boundaries.md`: "content-independent except for word-count volume features"), and inferring "this is your mother" from a name is exactly the kind of unearned expertise-performance the roadmap's open question 7 already flagged as risky for romantic/friend/family/work presets. |

**Recommendation: D for the long-term architecture, A for Stage 8A specifically.** The app must never infer relationship type from message content or participant names without explicit user input — this document treats that as a hard, non-negotiable boundary alongside the roadmap's forbidden-claims list, not a design preference.

---

## 6. Context-specific language

Using the roadmap's own example (one participant started 75% of threads):

| Context | Wording | Adds value or just complexity? |
|---|---|---|
| Neutral (Stage 8A default) | "You started most conversations in this chat recently." | Baseline — always safe, always available |
| Romantic | "You've been starting most conversations lately." | Adds value — matches the emotional register the market review validated (§4 of the market review) |
| Friendship | "One person has been keeping the friendship in motion more often." | Adds value — friendship-specific verb ("keeping in motion") reads as effort-neutral, less accusatory than "carrying" |
| Family | "Most periods of contact began from one side." | Adds value, but must stay carefully passive — family contact carries structural confounds (§3, §9) that romantic/friend wording doesn't, so the family variant should hedge harder, not just relabel |
| Work | "One person has handled most communication starts and follow-ups." | **Adds least value.** In a work context this reads as a coordination/workload fact, not a relationship fact — the honest move is closer to reporting a coordination metric than "translating" it into relationship language at all (§10) |

**Judgment: contextual copy adds genuine value for romantic and friendship (the register shift meaningfully changes how safe and how resonant the sentence feels), adds value with extra hedging required for family, and adds little value for work, where the "relationship" framing itself is the wrong frame more than the wording is.** This supports §5's recommendation: build context refinement as an optional wording layer over one underlying fact-template, not as four separate products — the incremental cost per context is a string table, not new logic, which is exactly the ratio that makes expansion cheap **if** the underlying claim never changes with the wording (test-enforceable, per §9 of the roadmap's scanner mechanism).

---

## 7. The romantic wedge

**Why romantic uncertainty is more urgent:** the relational turbulence model [14] ties relational uncertainty directly to rumination, and romantic uncertainty in an undefined-status relationship (dating, talking stage, situationship) is the case with the least external structure to fall back on — no defined role, no family history, no job description to explain an asymmetry. The hyperpersonal model [16, 17] compounds this: text is the primary channel for this relationship stage, so thin signals (reply delay) get maximally over-interpreted exactly when the relationship has the least other information to correct against.

**Is rumination/reassurance-seeking a real product demand?** Yes, and also a real risk. Excessive reassurance-seeking is a validated psychological construct [13] — a well-documented pattern where repeatedly seeking reassurance both signals and worsens relational anxiety, and (per the meta-analysis mirror of that work) also erodes the relationship being asked about. This cuts both ways for ChatSense: it confirms the demand is real (people do this constantly, currently by re-reading the same 20 messages or asking friends), and it means the "check again in two weeks" retention loop the market review recommends (§11 of that review) must be designed so it reads as *closure* ("this is normal, stop checking") rather than *feeding* a checking habit indistinguishable from reassurance-seeking. Partner-surveillance research [15] adds a sharper version of this warning specifically for post-breakup use: monitoring an ex correlates with worse recovery, which argues for treating "post-breakup" as a case needing the gentlest possible framing (already flagged as fragile in the market review §4), not a growth lever.

**Will this audience misunderstand the app more severely?** Likely yes, for the same reason it's the strongest wedge — high emotional stakes and the hyperpersonal over-attribution effect [16] mean the audience most likely to import a chat *today* is also the audience most likely to read "cooling down" as "they don't love me," no matter how many caveats surround it. The market review already reached this conclusion (§4, §10 of that review) and this research confirms it with a theoretical mechanism, not just intuition.

**Is this audience likely to pay?** Low per-read, plausible for repeat "check again" use — consistent with the market review's monetization read (§11 of that review) and with the observed pattern that comparable personal-tracking apps (Day One, Clue) monetize via subscription rather than one-time purchase [24], though those comps also show that over-aggressive paywalling of core insight (reported informally in Clue/Flo user commentary) erodes trust fast in exactly this kind of anxious, trust-sensitive audience — a cautionary data point, not a hard citation.

**Could marketing to this audience damage the broader brand?** Some risk, mitigated by the fact that the entire visible competitive set in this category [23] is romance-only and uniformly unsafe (fabricated attachment styles, "gaslighting detection," compatibility scores). Being the visibly-honest romantic-analysis product is a defensible, differentiated position rather than a trap, provided the marketing itself never slides from "communication pattern" to "relationship status" — the single most likely failure mode the market review already names (§7 of that review).

**Could the product expand naturally into friendship/family?** Yes — the underlying engine requires zero new work per §1 and §4, and the competitive landscape research found **zero** competitors currently serving friendship or family chat analysis [23] — every product found targets romance exclusively. That is either evidence of no demand or evidence of unclaimed space; §8 argues for the latter using loneliness-epidemiology data [8] that is independent of the romantic-app market entirely.

**Would users reject a romantically-marketed app when using it for family/work?** This is the sharpest risk in the whole wedge strategy, and it is unresolved without direct user testing (flagged as a gap by the competitor-research fork — direct app-store review text wasn't retrievable at scale). The mitigating design choice is exactly §1's recommendation: keep in-app default copy neutral regardless of how the app is marketed, so a user who found ChatSense through romantic marketing but imports their mother's chat is never shown romance-coded language they'd have to mentally discount.

**Recommended exact scope for romantic-first positioning:**
- Romantic-focused advertising, app-store screenshots, and headline copy (§13) — yes.
- A general "relationship pattern" in-app product name and default copy, not a romance-specific one — yes, this document's position, consistent with the market review's "communication-pattern read" as the safer technical/default register (§5 of that review).
- Explicit context choice during onboarding as an optional refinement, not a gate — yes, deferred to Stage 8C (§5 above).
- Non-romantic examples shown elsewhere (docs, possibly a "this also works for..." line in the app) once friendship support is copy-complete — yes, but not before Stage 8A ships.
- No dating-only architecture — confirmed; there was never dating-only architecture to begin with (§1).

---

## 8. Friendship opportunity

Friendship is the strongest second wedge, on four independent lines of evidence:

1. **Scale and specificity of the need.** The 2023 US Surgeon General Advisory on loneliness and isolation [8] reports roughly half of US adults experiencing loneliness, with the *highest* rates in 18–24-year-olds (not the elderly, as popular assumption often has it) — a demographic that also communicates primarily over text and is exactly ChatSense's plausible early-adopter profile.
2. **The maintenance-behavior evidence transfers directly** — the same cross-relationship-type maintenance study [3] that grounds §4's "universal data" argument was explicitly measuring friendship alongside romance; there is no theoretical gap to bridge.
3. **Reciprocity research complicates but doesn't undermine the case.** Equity-theory research on friendships [5, 6] finds that both under-benefiting *and* over-benefiting from a friendship correlate with loneliness/distress — meaning a naive "you initiate 80% of the time, that's bad" framing would be wrong; the safe framing is descriptive ("one person has been keeping the friendship in motion more often," per §6), not evaluative, and this constraint is manageable, not disqualifying.
4. **No competitor serves this need today** [23] — every product found in the competitive scan targets romantic analysis exclusively; friendship-specific chat analysis is unclaimed space, not a crowded one the way romance now is.

Is friendship a major second market, a retention use case, a stronger ethical use case, or too low-urgency for acquisition? **Some of each, matching the market review's own read (§4 of that review):** friendship is low-urgency for *acquisition* (nobody imports a chat about a friendship at 1am the way they do about a crush — there is rarely a single sharp trigger moment, per §3's matrix), which argues against leading marketing with it. But it is a strong candidate for (a) a **second wedge once the romantic cohort is established**, (b) a **retention use case** for existing users who have another chat they're curious about, and (c) arguably **the ethically safest major use case in the whole matrix** — lower emotional intensity than romance or family, no power asymmetry like work, and a large, evidence-backed unmet need [8]. Recommended sequencing: friendship is the second copy pack to ship (Stage 8C or a dedicated stage), and the second line in marketing ("also works for the friend you've drifted from") once the romantic-first launch has validated the core read.

---

## 9. Family opportunity

Family is real, valuable, and the context where the gap between "what the data shows" and "what a naive reader will assume it proves" is widest. The research is unambiguous that contact-pattern data cannot see the things people most want to know about family relationships:

- **Ambivalence, not simple closeness, is the norm.** Fingerman's research on parent–adult-child ties [10] finds these relationships are characteristically *simultaneously* close and strained — a contact-frequency number cannot distinguish "we talk a lot because we're close" from "we talk a lot because Mom calls when she needs something," and a low-contact number cannot distinguish "we're estranged" from "we're both just busy and secure enough not to need daily contact." This is a stronger and more specific version of the general "chat behavior does not equal relationship reality" caveat already in the market review (§10 of that review).
- **Family Communication Patterns Theory** [9] shows families vary on conversation orientation and conformity orientation *independent of contact frequency* — two families with identical message-frequency data can have opposite communication cultures. This is the clearest evidence that a single behavioral read cannot say anything about family *health* or *normalcy* without a same-family historical baseline, which is exactly what ChatSense's own-history-only comparison design already insists on (roadmap §6: "Labels compare the chat to itself... There is no 'healthy' reference chat").
- **Estrangement is common and cyclical, not rare or linear.** Pillemer's national survey work [12] finds roughly 1 in 4 US adults report an active family estrangement, and Agllias's research [11] (converging on a similar ~1-in-12-to-1-in-4 range depending on definition) finds most estranged adult children attempted repeated reconciliation before a final withdrawal — meaning **intermittent withdrawal-and-return is the expected shape of family estrangement, not a sign that reconciliation is imminent or that the relationship is resolving.** A "gap-and-return" metric applied here is descriptively accurate and psychologically loaded in a way it isn't for a normal friendship gap.
- **Reconciliation tracks something the data cannot see.** Per Pillemer [12], successful reconciliation correlates with both parties abandoning the need to agree on the past or receive an apology — not with contact frequency. This means "what usually happens next" (§7 of the roadmap, §17 below) is close to its most dangerous form here: a true statement like "contact has resumed after gaps like this before" could easily be misread as "reconciliation is likely" when the research says the actual predictor is something chat metadata cannot observe at all.

**Safe questions ChatSense can answer for family contexts:** who initiates contact; whether contact is episodic (event-driven bursts around holidays, etc.); whether there are repeated withdrawal/return cycles and their rough shape; whether frequency has changed over a long baseline; who acts as a communication bridge in a family group thread (a structural, not psychological, fact); whether one family relationship's pattern looks different from another the user has also imported (comparative, not evaluative).

**Never claim:** love, obligation, abuse, control, estrangement motive, enmeshment, narcissism, guilt, or healthy/unhealthy boundaries — all already covered by the roadmap's forbidden list (§9 of the roadmap) and restated here because family is the context where a user is most likely to *want* exactly these claims and where the app most needs to hold the line.

**Heightened ethical concern — analyzing a relative's private conversation.** This is the sharpest version of a concern that exists for every context but is easiest to see in family cases: the person importing a chat is often not the only participant whose words are in it, and that other participant (a parent, a sibling, an estranged relative) has not consented to having their communication pattern analyzed. Research-ethics frameworks for third-party consent [21] and privacy's "contextual integrity" framing [22] don't produce a bright-line rule for a consumer app (no such rule was found to exist for this product category), but the underlying reasoning transfers by analogy: a person's messages being technically accessible to the importer does not mean the *other party's* implied consent to have those messages statistically analyzed can be assumed, especially for a relative who might not want their contact pattern with an estranged family member characterized at all, by anyone. The existing onboarding line ("only import chats you have permission to analyze," `docs/onboarding-import.md`) is a reasonable, proportionate mitigation for a local-only, non-uploaded, non-shared product — but it should be read as a meaningful ethical boundary, not boilerplate, precisely because family (and post-breakup, and estranged-contact) cases are where a user is most likely to import a chat *specifically because* the other party would not want it analyzed.

---

## 10. Work opportunity

Skepticism is warranted, and the market review already reached a correct, low-confidence verdict here (§4 of that review: "weak... don't build for this; it dilutes positioning"). This research adds specifics that sharpen rather than soften that skepticism:

- **Asymmetry is often structurally normal, not relationally meaningful.** Organizational-communication research on network centrality [20] shows that communication concentrating through one node (a manager, a coordinator) is a predictable structural property of hierarchy and coordination roles — dominance-detection research on group CMC [26] finds the same pattern persists even in platforms explicitly designed for equitable participation. A manager replying slower or a report initiating more isn't evidence of anything beyond the org chart; the "safe wording" table in §6 already reflects this by demoting work's relationship-framing to a coordination-framing.
- **Consent and hierarchy make this categorically different from every other context.** Every other row in §3's matrix involves a user analyzing a relationship they have equal standing in (or, in family/estrangement cases, an asymmetry that at least isn't backed by an employer's authority). A manager analyzing a direct report's response patterns — or a report analyzing a manager's — sits adjacent to workplace surveillance regardless of who initiates the import, because the power differential means the analysis could be used punitively even if it was never intended that way.
- **Stronger competitors already exist for the legitimate part of this need.** Slack/Teams analytics and tools in the Viva-Insights category already serve "who's a coordination bottleneck" for organizations that actually want that (with, notably, real controversy over their own ethics — flagged but not deeply sourced in this pass, a gap for a future deeper dive if work is ever prioritized). ChatSense competing there means competing against enterprise tools with organizational buy-in, not a private consumer app's natural lane.
- **"Relationship Read" branding is actively wrong for this context**, independent of the analysis — the market review already flags this (§4 of that review: "the word 'relationship' actively repels a work use case").

**Recommendation: supported but not marketed.** The underlying metrics already work identically for a work chat (nothing to build), so there's no reason to block it in the UI — but it should never appear in marketing, app-store copy, or onboarding examples, and if it ever becomes a deliberate focus, it should be a **separate future mode or product** with different branding, different consent framing (ideally requiring the other party's awareness, unlike a private personal chat), and explicit handling of the power-asymmetry problem above — not a "context" option sitting next to "romantic" and "friendship" as if the ethical weight were comparable. This isn't "remove from scope" (the metrics are harmless and already there) but it is "keep it out of every surface a normal user or a marketer would see as an invitation."

---

## 11. Group-chat limitation

Group chats are already partially supported in the current engine (`groupApproximation`, `groupAttributionFinding` in `insight-narrative.ts`, an existing "attribution is approximate" narrative note) — this section is about whether group chats should ever become a first-class *Relationship Read* target, not whether they're supported at all.

The research gives concrete, technical (not just intuitive) reasons to keep group analysis secondary:

- **Reply-target ambiguity is an open research problem, not a solved one.** Determining who a message in a multi-party conversation is actually directed at is an acknowledged unsolved problem in conversational NLP research [27] — ChatSense's existing "credit the reply to the immediately previous sender" approximation is a reasonable simplification, but it is verifiably wrong some fraction of the time in any group with more than two active participants, in a way two-person chats structurally cannot be.
- **Dominance is real, persistent, and not size-normalized by a simple share metric.** Group CMC research [26] finds dominant-participant effects persist even in tools explicitly designed for equitable participation — meaning "Person X sent 40% of messages" in a 6-person group is not obviously comparable to "Person X sent 40% of messages" in a 2-person chat; the base rate of what "even" looks like changes with group size, and larger groups independently suppress response rates per-message regardless of relationship quality (a confound noted in the same research pass).
- **Subgroups are invisible to a sender-order-only analysis.** A family group thread with 8 members may contain two or three actual close ties and several peripheral ones; sender order and turn-taking cannot recover that structure, and any "who initiates" or "who restarts" claim risks describing the loudest participants rather than the most connected ones.
- **Topic switches compound the ambiguity** — in a two-person chat, a long pause is unambiguous silence; in a group, the same calendar gap could mean the whole group went quiet, or it could mean the conversation moved to a side-channel not captured in this export, and the export cannot distinguish those.

**Recommendation: group analysis should remain secondary, showing only participation/network structure (message share, activity rhythm) rather than one-to-one relationship claims, and should be explicitly excluded from the Relationship Read MVP.** The roadmap's own manual-QA checklist already anticipates this correctly (§12 of the roadmap: "Group chat → either a coherent multi-participant read or an honest... fallback — never a silently wrong two-person read"); this research confirms that instinct with independent technical grounding and recommends resolving it toward the fallback, not the multi-participant read, until reply-attribution accuracy can be validated (which would require ground-truth data ChatSense has no ethical way to collect today).

---

## 12. Product hierarchy

```
Universal core (always on, content-independent, never gated by context choice)
  - Did the pattern change?
  - Who sustains contact?
  - Is this silence/gap unusual for this chat's own history?
  - What has usually followed similar periods, historically, in this chat?

Optional context refinement (explicit user choice, wording only — never changes the underlying claim)
  - Romantic | Friendship | Family | Work | Other | Prefer not to say

Human-first output
  - One answer-shaped sentence per §13 of the market review, not four separate labeled fields (Stage 8A)

Evidence
  - Visible facts: dates, counts, both-sides values, sample sizes

Details
  - Existing metrics, charts, confidence machinery, forecasting-gate status (Layer 3, unchanged)
```

**Is this genuinely coherent?** Yes, with one necessary tightening beyond what the roadmap specifies: the "optional context" layer must be constrained by contract (a shared string-template mechanism, tested by the existing forbidden-language scanner) to only ever swap *nouns and verbs describing the relationship* ("conversation" → "friendship," "carrying contact" → "keeping the friendship in motion"), never to introduce new claims, new thresholds, or new metrics per context. If that constraint is enforced in code (a template function taking a context enum and returning only string substitutions, not branching logic that computes anything differently), the hierarchy is coherent and cheap to extend. If context selection is ever allowed to change *which* metrics are computed or *which* thresholds apply, the hierarchy breaks, because then "friendship mode" is really a different product silently wearing the same UI — precisely the failure mode this document's §1 verdict is designed to prevent.

---

## 13. Marketing architecture

- **Product category:** private communication-pattern reader (not "dating app," not "relationship coach," not "chat analytics tool").
- **Main product name:** ChatSense, with **"Relationship Read"** kept as the in-app hero-section name (per the market review §5's reasoning: it's the only name on that list a user feels something about, and the risk is manageable if every surface under the name obeys the safety boundary without exception).
- **App-store headline:** lead with the promise, not the mechanism, per the market review's own reordering (§9 of that review) — see headline options below.
- **Primary landing-page message:** the universal promise from §2, romantically inflected for the primary channel: *"Are you overthinking it, or did something actually change? See the pattern, not just the feeling."*
- **Primary acquisition wedge:** romantic overthinkers in the early-to-uncertain phase (dating, talking stage, situationship) — unchanged from the market review, reconfirmed by this research (§7).
- **Secondary use cases:** friendship drift (second-most-prominent, §8), with family and work explicitly not part of marketing (§9, §10).
- **Screenshots:** synthetic, clearly non-identifiable demo data only (already the product's practice via `demoExport.ts`) — the market review's warning (§7 of that review) against realistic-looking synthetic screenshots that "prime the audience to imagine their own real chats" applies with more force now that the audience includes people thinking about family and estranged relationships, where the imagined violation is more sensitive.
- **Example reports / demo fixtures:** keep romantic-coded demo scenarios for the primary onboarding flow; if a friendship-flavored demo scenario is added later (Stage 8C+), it should be a second, clearly-labeled fixture, not a replacement.
- **Keywords:** "relationship pattern," "communication pattern," "chat pattern reader," "private WhatsApp analysis," "overthinking," "is my texting one-sided" — avoid "compatibility," "attachment style," "red flags," "ghosting risk" entirely, even as keywords to rank against, since ranking near those terms invites exactly the comparison the market review warns against (§9 of that review: "don't let marketing imply ChatSense answers the same question, just more accurately").
- **What not to advertise:** anything work-related (§10); anything implying the app detects manipulation, gaslighting, attachment style, or love-bombing — the entire romantic-competitor set found in this research [23] does exactly this, and it is the most important thing for ChatSense's marketing to visibly *not* do, since it is the clearest, cheapest point of differentiation available.

**Headlines:**

*Romantic-first (5):*
1. "Are you overthinking it, or did something actually change?"
2. "See whether the conversation is mutual, fading, or carried by one side."
3. "Before you re-read the chat for the tenth time, let the pattern speak once."
4. "Stop guessing who's trying harder. See it — with evidence."
5. "Not a compatibility score. A pattern, with receipts."

*General relationship (5):*
6. "See the pattern behind any relationship — not what you feel it is."
7. "A private read on how contact actually moves, in any relationship that matters to you."
8. "Your conversations have a rhythm. See it clearly, on your device."
9. "The honest read: what your chat history actually shows, and what it can't."
10. "Patterns, not guesses — for the people you talk to most."

*Friendship-oriented (5):*
11. "Did you drift, or does it just feel that way?"
12. "See who's been keeping the friendship in motion."
13. "The friendship you haven't checked on in a while — see what the pattern says."
14. "Not every friendship ends. Some just go quiet and come back. See which this is."
15. "A private read on the friendships you don't want to lose track of."

*Family-safe (3):*
16. "See how contact with family has actually changed over time."
17. "Some family contact runs in cycles. See if this one does."
18. "A private, judgment-free read of your family's contact pattern — no verdicts, just the pattern."

*Professional-safe (3, for internal/enterprise-future use only — not consumer marketing per §10):*
19. "Understand where communication actually slows down on your team."
20. "A private read of your own working relationships — for you, not your manager."
21. "See your own coordination pattern, not anyone else's performance."

**Ranked best overall marketing approach:** romantic-first headline (#1) as the primary app-store and ad headline, paired with a general-relationship line (#9, nearly identical to the market review's own top-3 promise list) as the secondary tagline shown immediately below it — giving the romantic hook without foreclosing the broader positioning the in-app product (with neutral default copy per §1) actually delivers. Friendship headlines are held in reserve for a second campaign once the romantic cohort is established, not launched simultaneously (diluted focus was the market review's own worry, §12 of that review, about doing too much at once).

---

## 14. Multi-context onboarding

Recommended shape, built on the market review's revised Stage 8A brief (one hero card, not four fields):

1. Show the value first — the neutral-wording hero read (§1, §5) — **before** asking any context question. This matches architecture D (§5): universal read first, context refinement optional and after.
2. **After** the first read, offer, low-friction and skippable: *"Want this worded for a specific kind of relationship?"* → Dating/romantic, Friendship, Family, Work, Other, Prefer not to say.
3. Neither question should be required. The relationship-type question in particular must be easy to decline (a real, first-class "Prefer not to say" option, not a forced choice with "Other" as the only escape) — many of the highest-stakes contexts in §3 (estranged family, post-breakup, undefined-status romantic situations) are exactly the cases where naming the relationship type is itself uncomfortable.
4. **What is stored:** nothing that isn't already true today — the app persists no imported chat content between sessions (`docs/privacy.md`), and a context choice, if added, should be treated the same way: session-scoped, never uploaded, never used to change which metrics are computed (§12's constraint).
5. **Whether the choice affects analysis or only wording:** only wording, absolutely — restated from §5/§12 as the single most important implementation constraint in this whole document. Any temptation to let a context choice unlock a different metric or threshold recreates a separate-products problem under a single UI (rejected in §1).
6. **Avoiding false impressions of understanding:** the context question itself must be worded so it cannot be misread as the app learning something about the relationship — e.g., pairing it with a line like *"This only changes the words we use, not what we look at,"* directly counteracting the risk (flagged throughout this doc, sharpest in §9 and §11) that a context selector could imply expertise the app doesn't have.

---

## 15. Safety and consent across contexts

Every risk in this section already has a documented mitigation-shaped instinct in the roadmap or market review; this section says which ones need to be *stronger*, specifically because of the widened scope, not because the existing model is wrong.

| Risk | Existing mitigation | What widening scope changes |
|---|---|---|
| Analyzing another person's messages without consent | Onboarding line: "only import chats you have permission to analyze" | Family/estranged-contact and post-breakup cases (§9, §3) raise the stakes of this line from boilerplate to load-bearing — the other party is least likely to want their pattern read in exactly these cases |
| Workplace surveillance | None yet (work not built) | §10's recommendation (supported, not marketed, no separate work-branded surface) is itself the mitigation |
| Family conflict / estrangement | Existing forbidden-claims list already bars motive/health claims | §9's research shows the specific claim to guard hardest here is "what usually happens next" implying reconciliation likelihood — needs explicit, context-aware hedging beyond the generic guardrail |
| Post-breakup obsession / compulsive reassurance-checking | Roadmap already treats forecasting as gated and hedged | Reassurance-seeking research [13] and partner-surveillance research [15] argue for a *specific* soft nudge in this case, not just careful wording — see below |
| Minors | Not addressed anywhere in current docs | **Gap.** No age-gate or age-appropriate framing exists today. Recommend an App Store age rating consistent with user-generated emotionally sensitive content, and light copy consideration (avoid assuming adult relationship structures) if this is ever addressed — flagged, not resolved, here |
| Stalking / coercive-control contexts | Not addressed | The app's local-only, non-monitoring, no-notifications design (§ below) is itself a strong structural mitigation — a live-monitoring version of this product would be actively dangerous in an abusive-relationship context, and the current no-notifications, single-import, session-scoped design should be treated as a hard boundary, not a missing feature to add later |
| Repeated checking during active silence | Not addressed | The "check again in N weeks" retention loop (market review §11) should be designed to actively discourage same-day/same-hour re-checks — e.g., a soft "you checked this recently; the pattern hasn't had time to change" message rather than frictionless instant re-analysis |
| Relationship anxiety generally | Standing safety caveats already required on every finding | Unchanged; already the strongest part of the existing product |

**Recommended mitigations that don't make the app unusable** (the task's own framing, restated as a checklist):

- No live monitoring, no background checking, no "still no reply" push notifications — confirmed as a hard boundary, not just current scope.
- No advice, no ranking people, no red-flag labels — already in the roadmap's forbidden list; restated because family and post-breakup cases are where users will push hardest for exactly these.
- Local deletion/reset controls — already true in spirit (no persistence between sessions); worth stating explicitly as a feature, not an absence, in future privacy copy.
- A soft "you checked this recently" friction point on rapid re-import of the same chat, specifically motivated by the reassurance-seeking research [13] — this is a new recommendation from this research pass, not restated from prior docs.
- Age restriction: flagged as an open gap, not a recommendation with enough evidence behind it yet to specify a number.

---

## 16. Retention by relationship type

| Context | Realistic usage pattern | Shape |
|---|---|---|
| Romantic (uncertain phase) | Import, get a read, check again in 1–3 weeks while the uncertainty is live | Occasional tracker, tied to an active situation, not a habit |
| Established romantic | Import occasionally around milestones | One-time-to-occasional |
| Post-breakup | One dominant session, occasional relapse-checks | One-time novelty, ethically better if it stays that way (§15) |
| Friendship | Compare the same friendship after months; compare multiple friendships over time | The strongest multi-year retention candidate — durable ties people naturally revisit |
| Family | Event-driven (holidays, after a conflict, milestone ages) | Occasional tracker, low-frequency but recurring across years |
| Work | Repeated coordination checks | Real usage pattern exists but carries surveillance risk (§10) — not a loop to design toward |

**Is ChatSense a one-use novelty, occasional tool, recurring tracker, subscription product, one-time purchase, or freemium report product?** Confirming the market review's own conclusion (§11 of that review) with the added context evidence above: it is **an occasional tracker for an ongoing uncertainty**, not a daily habit loop and not a one-time novelty either — the friendship context in particular (§8) extends the plausible retention horizon from weeks (romantic uncertainty resolving) to years (friendships people check in on periodically for as long as the friendship exists), which modestly strengthens the case for a light subscription or "check again" per-chat model over a one-time purchase, without justifying a heavy daily-engagement subscription product. Do not force subscription logic where usage doesn't justify it — restated from the task's own instruction because it remains correct after this research, not weakened by it.

---

## 17. Context-aware "what usually happens next"

Extending the roadmap's grammatical rule (subject is always "this chat" or "the pattern," never "they") across contexts, with the empirical/conditional/unsupported distinction kept explicit:

- **Romantic:** *Empirical:* "After pauses like this, the chat restarted 6 of 8 times." *Conditional:* "If the recent slower-reply pattern continues, replies would likely stay above the earlier baseline." *Unsupported (forbidden):* "They'll probably text back soon."
- **Friendship:** *Empirical:* "Long quiet periods have happened before; most ended within three weeks." *Conditional:* "If this gap follows the shape of past gaps, contact would likely resume within a similar window." *Unsupported:* "They still care, they're just busy" (a motive claim the data cannot support).
- **Family:** *Empirical:* "Contact has usually resumed around recurring family events in the past." *Conditional:* none recommended — per §9's research on reconciliation predictors being invisible to chat metadata [12], this context should lean harder on pure empirical statements and avoid conditional projection almost entirely. *Unsupported (forbidden):* any statement implying reconciliation likelihood or "closeness."
- **Work:** *Empirical:* "Replies during weekdays have usually arrived within one working day." *Conditional:* "If the current slower pattern continues, replies would likely keep exceeding the historical typical delay." *Unsupported:* anything about the other person's engagement, performance, or intent.

The family row is the one place this document recommends being *more* conservative than a literal extension of the roadmap's existing rule would produce — not because the grammar changes, but because §9's research specifically shows that the thing users most want a conditional projection to answer (will we reconcile, is this normal for us) is precisely the thing the predictor variables (contact frequency, gap shape) do not actually predict, per the cited research [12]. A technically-safe conditional sentence can still be substantively misleading if the audience will inevitably read it as an answer to a question the data can't address; family is where that gap is widest.

---

## 18. Product experiments

No telemetry exists in the product (correctly, per its privacy design); all experiments below are manual, local, and privacy-preserving.

1. **Universal vs. romantic wording.** *Hypothesis:* neutral wording (§1, §6) is as emotionally resonant as romantic wording for the same underlying fact, for users who don't self-identify the chat as romantic. *Sample:* 8–10 people, mixed relationship contexts in mind (ask each to think of a specific chat before seeing anything). *Stimulus:* the same five example screens from the market review §6, shown twice — once in neutral wording, once in context-flavored wording matching what they said they were thinking of. *Question:* "Which version feels like it's talking about your specific situation?" *Success criterion:* neutral wording rated equally clear/relevant to context-flavored wording by at least 70% of participants — if not, context wording earns its complexity cost sooner than assumed.
2. **Relationship-type selection vs. goal selection (architecture B vs. C, §5).** *Hypothesis:* asking "what are you trying to understand?" (a goal) feels less presumptuous than asking "what kind of relationship is this?" for ambiguous ties (situationships, estranged family). *Sample:* 6–8 people who can name an ambiguous or undefined relationship. *Stimulus:* two onboarding mockups, goal-first vs. type-first. *Question:* "Which question would you rather answer about this specific chat?" *Success criterion:* clear majority preference for one architecture; a near-even split argues for hybrid/skippable design regardless.
3. **"Relationship Read" name: useful or creepy?** *Hypothesis:* the name is fine when paired with a promise line (market review §5) and feels presumptuous alone. *Sample:* 8–10 people. *Stimulus:* app-store mockup with name only, then name + promise line. *Question:* rate 1-5 "creepy/presumptuous" for each. *Success criterion:* promise-line version scores meaningfully lower on "creepy" than name-alone.
4. **Historical projection comprehension.** *Hypothesis:* users correctly distinguish "this chat restarted 6 of 8 times before" from a promise about what will happen this time. *Sample:* 8–10 people. *Stimulus:* the §17 examples. *Question, open-ended:* "What is this telling you will happen?" *Success criterion:* no participant describes the statement as a guarantee or a claim about the other person's intent.
5. **Do friendship users feel excluded by romantic marketing?** *Hypothesis:* a person motivated to check a friendship, shown romantic-first ad creative, either self-excludes or feels the product isn't "for" them. *Sample:* 6–8 people with a friendship (not romantic) situation in mind. *Stimulus:* current romantic-first ad mockups (§13 headlines #1–5). *Question:* "Would you download this for the situation you're thinking of?" *Success criterion:* majority still say yes — if not, the friendship-specific secondary tagline (§13) needs to move earlier/more prominent than currently planned.
6. **Does evidence reduce overinterpretation?** *Hypothesis, grounded in algorithm-aversion/explainability research* [18, 19]: showing the underlying counts alongside a read reduces the odds a reader over-extends the claim. *Sample:* 8–10 people, split into two groups. *Stimulus:* one group sees label-only ("Cooling down"), the other sees label + evidence bullets. *Question, open-ended:* "What do you think is going on between these two people?" *Success criterion:* the evidence group produces measurably fewer motive/emotion inferences in their open-ended answers than the label-only group.
7. **Would users re-import after two weeks?** *Hypothesis:* the "check again" loop (§16) has real pull for at least the romantic and friendship cases. *Sample:* whoever tests experiment 1 or 6, followed up two weeks later informally. *Stimulus:* none new — just ask. *Question:* "Have you thought about checking this again?" *Success criterion:* at least a third express genuine intent to re-check, not just politeness.

---

## 19. Revised roadmap

Building on the market review's already-narrowed Stage 8A (one hero card, not four fields) and this document's scope findings:

- **Stage 8A (unchanged from the market review's revised brief):** one hero card — current pattern + why this read + what usually happens next — written in **neutral, relationship-agnostic wording by default** (this document's one required addition to that brief: make the neutrality explicit and test-enforced, not incidental).
- **Stage 8B:** humanize all tabs per the original roadmap, still neutral wording; validate the one-card version with 5–10 people (market review §13) before expanding surface area.
- **Stage 8C:** optional context refinement layer (architecture D, §5) — wording-only string substitution for romantic and friendship contexts first (the two with the clearest positive value per §6); family wording added only with the extra hedging §9 requires; work wording built but never surfaced in default onboarding (§10).
- **Stage 8D:** local shareable report, per the original roadmap, now explicitly including whichever context wording (if any) the user selected, with the standing caveats traveling inside the artifact.
- **Stage 9:** validated projections (unchanged from the roadmap) — with the family-context conditional-projection caution from §17 applied once this stage is reached.
- **Stage 10:** friendship "compare over time" as the first genuinely new context-specific feature (not just wording) — multi-chat/multi-friendship comparison, per §8's retention argument and the roadmap's own Stage 10 sketch; family/group modes and any work-specific spinoff considered separately and later, gated on the ethical/branding resolutions in §9/§10, not on engineering readiness (which already exists).

This is the same shape the task's own suggested sequence proposes, with two changes: **neutral wording is pulled forward into 8A itself** (not left implicit) because shipping romantic-coded default copy even briefly creates exactly the mismatch this document's §1 verdict is designed to avoid, and **friendship is explicitly named as the first context addition** in 8C rather than a generic "goal/context selection," because the evidence in §8 makes friendship a stronger, better-evidenced second context than an undifferentiated four-way selector would suggest.

---

## 20. Decision for the next model

**Build next:** Stage 8A exactly as the market review's §13 specifies (one hero card: read + evidence + what-usually-happens-next + confidence + inline caveat), with one addition — write the default copy in relationship-neutral language from the start ("this chat," "contact," "conversation," not "relationship," and avoid "cooling/warming" wherever a colder synonym works as well) so that adding context wording later (Stage 8C) is a pure addition, never a rewrite of a romance-flavored default.

**Who it's for:** the same primary user the market review identified — a romantic overthinker in an early/uncertain relationship phase — but built so that a friend or family member who imports a different kind of chat gets an honest, undistorted read rather than a mismatched romantic-coded one.

**What must stay universal:** the four core questions (§12); the metric definitions and thresholds in `contract.ts` (unchanged by any of this); the forbidden-claims list (roadmap §9), which this document did not loosen and in several places (family, post-breakup, estrangement) argues should be enforced more, not less, strictly; the rule that context selection changes wording only, never which metric runs or which threshold applies (§12, §14).

**What can be context-specific:** wording only, via a template/substitution mechanism scanned by the existing forbidden-language tests (§6, §12); which secondary use cases appear in marketing and onboarding examples (§13); emphasis of which field leads the read (unchanged from roadmap, not addressed further here).

**What not to build:** relationship-type inference from content or names (§5, hard boundary); a live-monitoring or notification-driven checking loop (§15); a work-branded or manager/report-facing surface (§10); a first-class multi-participant relationship claim for group chats (§11); any conditional "what usually happens next" projection for family/estrangement contexts beyond pure empirical historical statements (§17); subscription infrastructure ahead of proof that the core read lands (unchanged from the market review, §11 of that review).

**What success looks like:** the market review's own go/no-go checklist (§14 of that review), unchanged, plus one addition from this document: a person who imports a non-romantic chat (a friend, a parent) during the Stage 8A/8B validation pass (experiment 1, §18) rates the neutral-wording read as clearly about *their* situation, not a mis-fitted dating frame.

**Questions that remain unresolved, for a future model to pick up:**
1. Whether relationship-type selection (B) or goal selection (C) is the better long-term onboarding shape (§5, §18 experiment 2) — this document recommends prototyping both, not choosing yet.
2. Whether family wording (§9) can ever be made resonant without losing the extra hedging it needs, or whether family should stay in neutral wording indefinitely.
3. The right age-restriction posture, if any (§15) — currently an unaddressed gap, not a researched recommendation.
4. Whether a "check again" re-import friction mechanism (§15) measurably reduces compulsive-feeling reuse without frustrating legitimate periodic checks — needs real usage data this product doesn't yet collect (and shouldn't collect via telemetry; a future privacy-preserving, on-device-only signal would need its own design pass).
5. Whether work support should ever surface as a deliberate, separately-branded product, or should remain permanently a supported-but-hidden capability (§10) — this document leans toward the latter but does not close the question.

**Copy-paste implementation prompt for the next agent (do not implement in this PR):**

> You are working on the ChatSense repo. Read `docs/product/relationship-read-roadmap.md`, `docs/product/relationship-read-market-review.md`, and `docs/product/relationship-context-research.md` in full first — in that order, the third being the most recent and the one that adds the relationship-context and neutral-wording requirement below.
>
> Create branch `product/human-relationship-read-stage-8a`.
>
> Implement the **Relationship Read MVP** per the market review's §13 revised brief (one hero card: read sentence, 3 evidence bullets, one "what usually happens next" sentence, a confidence tag, one inline safety caveat, a details affordance) — with this addition from the context-research document: **write every default string in relationship-neutral language** ("this chat," "contact," "conversation" — never "relationship" — and prefer activity-level words like "quieter/busier" over "cooling/warming" wherever they carry the same meaning) so a future context-refinement layer (romantic/friendship/family/work wording) can be added as pure string substitution later without rewriting the default copy. Do not build the context-refinement layer, relationship-type selection, or any goal-selection UI in this stage — that is explicitly deferred (Stage 8C, still undecided between architectures B and C).
>
> Hard constraints, unchanged from both prior documents: derive everything from existing `relationship-dynamics.ts` / `human-takeaway.ts` outputs only, no new metrics, no analysis-math changes, no new dependencies, no message-content interpretation, no cloud/telemetry, no changes to the forecasting gate or release workflow, never use or commit personal exports. Respect the full forbidden-claims list (roadmap §9) without exception, and extend `tests/helpers/narrative-safety.ts` coverage to the new hero-card copy.
>
> Add unit tests over synthetic fixtures for the five cases in the market review's §6 (mutual/stable, one-sided, cooling, intermittent, insufficient data), checking tone/claim-shape, not just non-empty output. Before building further, validate the one-card version qualitatively (market review §13's 5–10 person check) — include at least one non-romantic scenario (a friendship or family fixture) in that check to confirm the neutral wording reads sensibly outside the romantic case, per this document's §18 experiment 1 and §20 success criterion.
>
> Run full verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `git diff --check`. Open a **draft** PR titled "Stage 8A: Relationship Read MVP" describing what was added, the safety measures, the neutral-wording decision and why, and test coverage. Do not merge.

---

## Bibliography and source notes

Grouped by topic. Dates given where known. **Established** = peer-reviewed or official primary source. **Established (secondary)** = credible science journalism or summary of established peer-reviewed work, not itself the primary source. **Emerging/preprint** = not yet fully peer-reviewed. **Market fact** = official product page, not a research claim.

**Relationship science / interpersonal communication theory**
1. Altman & Taylor, *Social Penetration Theory* (1973); overview: https://en.wikipedia.org/wiki/Social_penetration_theory — Established (secondary summary of a 1973 theory). Matters because it's the classic model of relationship-deepening via disclosure pace — useful for showing what does *not* transfer cleanly to family ties (where closeness/distance is often assigned, not built).
2. Berger & Calabrese, *Uncertainty Reduction Theory* (1975); overview: https://en.wikipedia.org/wiki/Uncertainty_reduction_theory — Established (secondary summary). Matters as the strongest theoretical grounding for §2's universal-core claim: people are chronically motivated to resolve relational uncertainty through available information.
3. Canary, Stafford, Hause & Wallace, "An Inductive Analysis of Relational Maintenance Strategies: Comparisons Among Lovers, Relatives, Friends, and Others," *Journal of Social and Personal Relationships*: https://people.uncw.edu/mcdaniela/maintenance.pdf — Established, peer-reviewed. The single most load-bearing citation in this document: empirically shows the same maintenance-strategy taxonomy applies across romantic, family, and friend ties.
4. Stafford & Canary, "Maintenance Strategies and Romantic Relationship Type, Gender and Relational Characteristics" (1991), *JSPR*: https://journals.sagepub.com/doi/10.1177/0265407591082004 — Established, peer-reviewed. Companion/precursor to [3].
5. Hatfield, overview of equity theory in close relationships: http://www.elainehatfield.com/ch109.pdf — Established (author's own summary of her theory). Grounds the caution in §8 against naive "more initiation = worse" framing.
6. Buunk, "Loneliness, exchange orientation, and reciprocity in friendships," *Personal Relationships* (1998): https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1475-6811.1998.tb00156.x — Established, peer-reviewed. Both under- and over-benefiting correlate with distress in friendships.
7. Hall, friendship-maintenance research summaries: https://www.psychologytoday.com/us/blog/positively-media/202502/facetime-voice-or-text-what-strengthens-friendships-most and https://randtlab.ku.edu/friendship — Established (secondary; science journalism of peer-reviewed work). Supports "consistency of contact sustains friendship" as a maintained, active process.
8. U.S. Surgeon General, *Our Epidemic of Loneliness and Isolation* (May 2023): https://www.hhs.gov/sites/default/files/surgeon-general-social-connection-advisory.pdf — Established, primary government source. Grounds §8's friendship-opportunity case: ~50% of US adults report loneliness, highest among 18–24-year-olds.
9. Koerner & Fitzpatrick, Family Communication Patterns Theory: https://academic.oup.com/anncom/article-abstract/26/1/36/7850379 — Established, peer-reviewed. Shows family communication culture varies independent of contact frequency — core citation for §9's "same data, different meaning" argument.
10. Fingerman et al., intergenerational ambivalence: https://pmc.ncbi.nlm.nih.gov/articles/PMC4217483/ and https://onlinelibrary.wiley.com/doi/abs/10.1111/jomf.12604 — Established, peer-reviewed. Parent–adult-child ties are characteristically simultaneously close and strained.
11. Agllias, *Family Estrangement: A Matter of Perspective* (Routledge): https://www.routledge.com/Family-Estrangement-A-matter-of-perspective/Agllias/p/book/9781472458612; prevalence digest: https://www.psychologytoday.com/us/blog/brothers-sisters-strangers/202402/statistics-that-tell-the-story-of-family-estrangement — Established (book, established researcher) plus a secondary stats digest — re-verify the specific prevalence figure against Agllias's primary publication before quoting it as a precise number in user-facing copy.
12. Pillemer / Cornell Family Estrangement and Reconciliation Project, *Fault Lines*: https://www.familyreconciliation.org/book and https://news.cornell.edu/stories/2020/09/pillemer-family-estrangement-problem-hiding-plain-sight — Established, large national survey (1,300+ respondents). Core citation for §9 and §17's family-context caution: reconciliation tracks letting go of blame, not contact frequency.
13. Joiner & Metalsky, "Excessive Reassurance Seeking" (2001), *Psychological Science*: https://journals.sagepub.com/doi/abs/10.1111/1467-9280.00369; meta-analysis: https://www.psych.rochester.edu/research/starrlab/wp-content/uploads/2014/08/meta-analysis.pdf — Established, peer-reviewed. Grounds §7 and §15's caution about the "check again" retention loop resembling a clinically-studied risk pattern.
14. Solomon & Knobloch, Relational Turbulence Model: https://journals.sagepub.com/doi/abs/10.1177/0265407504047838 and https://academic.oup.com/hcr/article-abstract/42/4/507/4064724 — Established, peer-reviewed, validated in romantic samples. Extension to friend/family/work contexts in this document is **inference**, not itself established.
15. Fox & Tokunaga (2015): https://pubmed.ncbi.nlm.nih.gov/26348808/; Métellus et al. (2025), *Journal of Marital and Family Therapy*: https://onlinelibrary.wiley.com/doi/pdf/10.1111/jmft.70074 — Established, peer-reviewed. Partner/ex-partner surveillance research; grounds the post-breakup caution in §7 and §15.

**Computer-mediated communication / AI trust**
16. Walther, "Computer-Mediated Communication: Impersonal, Interpersonal, and Hyperpersonal Interaction" (1996), *Communication Research*: https://journals.sagepub.com/doi/10.1177/009365096023001001 — Established, foundational peer-reviewed theory. Explains why thin signals (reply timing) get over-interpreted in text — the mechanism behind §2 and §7's urgency argument.
17. Walther & Whitty, "Language, Psychology, and New New Media: The Hyperpersonal Model at Twenty-Five Years" (2021), *Communication Research*: https://journals.sagepub.com/doi/abs/10.1177/0261927X20967703 — Established, peer-reviewed. Confirms the mechanism persists on modern platforms.
18. Dietvorst, Simmons & Massey, "Overcoming Algorithm Aversion" (2018), *Management Science*: https://pubsonline.informs.org/doi/10.1287/mnsc.2016.2643 — Established, peer-reviewed. Grounds the "evidence visible, one tap away" design choice as a trust mechanism, not decoration (§18 experiment 6).
19. "Explanations Can Reduce Overreliance on AI Systems During Decision-Making," arXiv preprint: https://arxiv.org/pdf/2212.06823 — Emerging/preprint-grade, credible HCI research group, not yet fully peer-reviewed at time of citation. Same relevance as [18], with a more direct evidence/overreliance framing.

**Workplace communication and ethics**
20. Network centrality and organizational coordination: https://pubsonline.informs.org/doi/10.1287/orsc.2022.1584 and https://www.sciencedirect.com/science/article/abs/pii/S0263786309000155 — Established, peer-reviewed. Grounds §3 and §10's claim that communication asymmetry is often a structural, not relational, fact in hierarchical contexts.
21. Third-party consent in research ethics: https://ccnmtl.columbia.edu/projects/cire/pac/foundation/ and https://researchbasics.education.uconn.edu/ethics-and-informed-consent/ — Established professional-ethics standard, applied here **by analogy** to a consumer product, not as a direct ruling on this product category (no such ruling was found to exist).
22. "Privacy exchanges: restoring consent in privacy self-management," *Ethics and Information Technology* (2016): https://link.springer.com/article/10.1007/s10676-016-9410-4 — Established privacy-ethics theory (contextual integrity), applied by analogy in §9.

**Market / competitive landscape**
23. Direct romantic chat-analysis competitors (official product pages, accessed 2026): Lucen (https://lucen.app/); Relationship AI: Chat Analyzer, App Store (https://apps.apple.com/us/app/relationship-ai-chat-analyzer/id6757682149); Flagr (https://flagr.net/); LoveGraft (https://lovegraft.com/); RelatIQ (https://www.relatiq.app/); Mosaic (https://www.mosaicchats.com/chat-analysis); Chat Relationship Analyzer, App Store (https://apps.apple.com/uy/app/chat-relationship-analyzer/id6755564391) — Market fact, official sources. Grounds §1, §7, and §13's claim that the entire visible romantic-analysis market fabricates clinical/psychological claims ChatSense refuses to make.
24. Day One journaling app subscription model: https://dayoneapp.com/plans/ and https://www.macrumors.com/2017/06/29/day-one-app-now-a-subscription-service/ — Market fact plus contemporaneous tech-press coverage. Grounds §7 and §16's monetization comps.
25. Clue/Flo pricing and user-sentiment commentary — informally sourced market commentary during this research pass, not a verified primary source; treat as directional signal only, flagged explicitly in §7 and §16 as anecdotal-grade.
26. Group-CMC dominance-detection research, arXiv: https://arxiv.org/pdf/2002.10582 — Established (peer-reviewed-adjacent HCI/CMC research). Grounds §11's claim that dominance in group chats is a persistent, real effect, not a metric artifact.
27. Multi-party reply-target ambiguity, conversational-NLP research: https://ar5iv.labs.arxiv.org/html/2304.13835 — Established (open-problem framing in NLP research literature). Grounds §11's claim that reply attribution in groups is an acknowledged unsolved problem, not just a ChatSense simplification.

**Gaps flagged during research, not resolved:**
- No peer-reviewed literature specifically evaluating trust in AI relationship-coaching tools was found; any claim in this document about how users will react to ChatSense specifically is **product hypothesis**, validated only by the experiments in §18, not by citation.
- Direct app-store review text for competitor products was not retrievable at scale in this research pass; competitive-landscape conclusions in §13/§7 rest on product positioning and feature claims, not measured user sentiment — a deeper review-mining pass would strengthen this if the team wants harder qualitative evidence before the romantic-marketing launch.
- No academic source was found evaluating the ethics or efficacy of workplace communication-analytics tools (e.g., Viva Insights) specifically; §10's skepticism about that category rests on the general surveillance-ethics and network-centrality literature [20–22], not a direct citation about those products.
