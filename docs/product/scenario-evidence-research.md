# Product research: scenario library and empirical methods

**Status:** research only — nothing in this document changes code, analysis logic, UI, or dependencies. It is the evidence gate before Stage 8A, sitting alongside (not replacing) the roadmap, the market review, and the context research.
**Audience:** the next model/agent (GPT-5.5, Sonnet 5, a future Fable/Codex agent) implementing Stage 8A and beyond. This is a baton document: it assumes you have read nothing else yet.
**Written:** 2026-07-12, from a branch stacked on PR #18 (`product/relationship-context-research`), which is itself stacked on PR #17 (`product/relationship-read-market-review`). Neither was merged at time of writing. **When PR #17 and #18 merge, rebase this branch onto `main`; the diff should shrink to this document plus four small pointer edits.**
**Reads first, in order:** `docs/product/relationship-read-roadmap.md` (merged, PR #16) → `docs/product/relationship-read-market-review.md` (PR #17) → `docs/product/relationship-context-research.md` (PR #18) → this document. This document does not repeat their strategy content; it supplies what they deliberately left open: the scenario-by-scenario empirical grounding.

**Superseded as an implementation prompt (2026-07-12):** [`chatsense-master-plan.md`](./chatsense-master-plan.md) §16 is now the current Stage 8A prompt, replacing §23 below. The full-project audit ([`chatsense-full-project-audit.md`](./chatsense-full-project-audit.md), §7.13/§24.1) found one factual correction to this document: `pauseSummary.latestGapMinutes` is the last *completed* inter-message gap, not "export end minus last message" as §8/§11 assume — the master-plan prompt carries the corrected silence-card semantics. Everything else here (the §2 template, §6 E-standards, §7 matrix, §11–§12 designs, §21 copy bar) remains the spec detail behind the master plan.

**What this document is for.** The prior three documents settled *strategy*: romantic-first acquisition, relationship-neutral core, friendship second, family cautious, work unmarketed, groups secondary, human read → evidence → nerd details, and a hard no-motive/no-diagnosis/no-advice boundary. What none of them settled is the *evidential* question: for each real situation in which a person opens ChatSense, what exactly can be measured, with what method, on how much data, and what may honestly be said about it? This document answers that, scenario by scenario, so that every future user-facing insight has the chain:

> **human question → measurable construct → empirical method → evidence threshold → plain-language result → limitation**

**Evidence classification.** Every conclusion in this document carries one of five labels:

- **Established evidence** — peer-reviewed or primary-source finding, cited.
- **Supported method** — a standard, well-understood statistical method whose properties are established, cited; its *fit to ChatSense* is our judgment.
- **Product hypothesis** — a plausible product claim not yet validated with users or data.
- **Speculative / requires validation** — should not ship without a validation pass.
- **Not inferable from chat metadata** — cannot be established from timestamps, senders, and volume at all; must never be claimed.

Bracketed numbers like [12] cite this document's bibliography. References like [CR-14] cite the bibliography of `relationship-context-research.md`, which remains valid and is not duplicated here.

---

## 1. Executive verdict

**Are there enough genuinely useful scenarios to justify ChatSense? Yes — but fewer, and narrower, than the 45-scenario inventory below might suggest.** After mapping every scenario to what chat metadata can actually support, the product rests on **five load-bearing scenario families**, each answering a question people demonstrably have (uncertainty-reduction and chronemic-expectancy research say the felt question is real [CR-2, 12, 13]), each measurable with defensible statistics on a single export, and each already mostly computable from the shipped metric surface. Everything else is either a variation of these five, background texture, research-stage material, or not inferable.

**The top five scenarios worth building for:**

| # | Scenario family | Human question | Core constructs | Status |
|---|---|---|---|---|
| 1 | **Unusual silence** | "Is this quiet unusual for us, and what happened after quiets like it?" | latest-gap percentile vs. own history; restart history after comparable gaps | Implementable now (§8, §11); the answer-pairing copy is the only missing piece |
| 2 | **Carried contact** | "Am I the one keeping this alive?" | thread-start share, restart share, follow-up burden, turn share — converging or not | Implementable now (§8, §12); needs the multi-construct evidence hierarchy, not new math |
| 3 | **Pattern change** | "Am I overthinking, or did it actually change?" | early/late and recent/prior comparisons on activity, reply timing, initiation | Implementable now (§8); already threshold-gated by contract v2.0 |
| 4 | **Intermittent rhythm** | "Is this fading, or is on-and-off just our normal?" | gap/burst run structure, restart recurrence, burstiness | Partially now; a defensible intermittency classification needs one new derived feature set (§9, §14) |
| 5 | **Honest insufficiency** | "Can this data even say anything?" | evidence states, sample counts, span checks | Implementable now; it is a scenario, not an error state — treat it as a first-class read |

**Which scenarios provide immediate human value?** The five above. Their value is *calibration and rumination-reduction*: an external, numeric anchor against a felt sense, which the market review identified as the product's strongest emotional fit and which the excessive-reassurance-seeking literature says people currently seek in worse ways [CR-13]. (Product hypothesis for ChatSense specifically; the underlying need is Established evidence.)

**Which scenarios are merely interesting analytics?** Weekday/hour heatmaps, word-count shares, reply-graph edges, group participation shares, night-message rates. They are honest and already shipped, but nobody opens the app for them; they are Layer-3 texture. Similarly, most work scenarios (S31–S36) are real measurements with no marketable product home — supported, never marketed, per the context research's §10.

**Which scenarios are impossible without content or external context?** Anything requiring the *reason* for a pattern: whether slower replies mean less interest (Not inferable — the chronemics literature shows response latency is a real *signal* people read, but its meaning is context-dependent and unrecoverable from timing alone [12, 13]); whether a family gap means estrangement or busyness [CR-10, CR-12]; whether a work asymmetry reflects role or relationship [CR-20]; whether a life event caused a change (needs a user-supplied marker, §16); whether messages are missing because the chat moved platforms (§3 S39); who a group message replies to [CR-27].

**Does the metadata-only boundary still allow a strong product? Yes.** The five scenario families above are all fully answerable inside it. The boundary costs ChatSense the fabricated-certainty products' claims (compatibility, ghosting-risk percentages, attachment styles) — which the market review already concluded should not be copied — and costs nothing that survives empirical scrutiny anyway. The genuinely painful limits are subtler: right-censoring at export end (the export may be stale; §11), no cross-platform completeness, no ground-truth outcomes (§19). These bound *confidence*, not *existence*, of the product.

---

## 2. Scenario design framework

Every scenario in this library — and every future scenario anyone proposes — must be written in this canonical structure before any implementation:

| Field | Meaning | Rule |
|---|---|---|
| **Scenario name** | Short, human, kebab-case id | Stable across docs and tests |
| **User context** | Who is opening the app, in what life situation | Written as a person, not a persona label |
| **Trigger moment** | The specific event that makes them open it *today* | If no trigger exists, say so — it predicts low acquisition value |
| **User question** | The literal question in their head | One sentence, first person |
| **Relationship types** | Which of romantic / friendship / family / work / group it serves | Neutral-copy rule from the context research applies regardless |
| **Observable inputs** | Exact metrics/fields, existing or proposed | Name the TypeScript field if it exists |
| **Confounders** | What else produces the same observable pattern | At least two; if you can't think of two, you haven't looked |
| **Statistical method** | From the catalog in §5 | Simplest defensible method wins |
| **Minimum evidence** | Event counts, span, comparison windows required | Numbers, not adjectives; contract-owned where possible |
| **Output** | The plain-language sentence(s) shown | Must pass the narrative-safety scanner |
| **Confidence** | How Strong/Useful/Light is derived for this scenario | Multi-signal agreement counts upward, contradiction counts down |
| **What cannot be inferred** | The adjacent claim users will want, refused explicitly | Named, not implied |
| **Validation requirement** | What must be checked before promoting stronger wording | Synthetic fixture, parity, comprehension test, or backtest |
| **Product priority** | MVP / later / research / never | With one-line justification |

### Reusable template (copy for every new scenario)

```markdown
### Scenario: <kebab-case-name>
- User context:
- Trigger moment:
- User question: "..."
- Relationship types:
- Observable inputs: (existing: `field.path` | proposed: description)
- Confounders: 1) ... 2) ...
- Statistical method: (§5 reference)
- Minimum evidence: (counts / span / windows)
- Output (safe): "..."
- Output (forbidden — do not drift toward): "..."
- Confidence logic:
- Cannot be inferred:
- Validation requirement:
- Product priority:
```

Two framework rules that bind every scenario:

1. **The comparison baseline is always the chat's own history.** No population norms exist for "how often couples text" that would survive transfer to a specific pair — communication volume and rhythm are strongly individual and persistent (Established evidence: individuals carry distinctive, stable "social signatures" and daily rhythms [14, 15]), which is precisely why self-baselines are defensible and universal norms are not.
2. **Ties break toward the weaker claim, and "not enough data" is a valid, designed output for every scenario** — never converted to zero, never padded with a guess (roadmap §5; §6 rules E16–E17 below).

---

## 3. Scenario inventory

Forty-five scenarios, keyed S1–S45. Classification labels: **NOW** (high-value, implementable with current metrics), **NEW** (high-value but needs new analysis), **BG** (useful background only), **RES** (research experiment), **UNSAFE** (unsafe / not inferable as asked), **SKIP** (not worth building). Many scenarios are safe at the pattern level while the question *as the user feels it* contains a non-inferable core; those rows carry two labels, e.g. "NOW / core UNSAFE".

### 3.1 Romantic / dating

| # | Scenario | User question | Observable construct | Method (§5) | Min. evidence | Class | Cannot be inferred |
|---|---|---|---|---|---|---|---|
| S1 | Replies suddenly became slower | "Did their reply speed really change?" | per-participant `medianReplyMinutes`, recent vs. prior | robust paired-period quantile comparison (§5.2), contract threshold ≥2× and ≥10 min | ≥5 reply samples per participant per period (contract) | **NOW** | why; interest; feeling. Reply latency is a real social cue people over-read [12, 13] — the app reports the timing fact only |
| S2 | One person now starts most conversations | "Am I always the one starting?" | `threadStartShare` and its change | share + notable-change threshold (15 pp) | ≥3 thread starts per period | **NOW** | caring more/less; motive. Asymmetric initiation also occurs in stable, satisfied ties (equity research warns both directions [CR-5, CR-6]) |
| S3 | A previously daily chat has gone quiet | "We used to talk daily — what happened?" | `messagesPerActiveDay` trend, active-day density, latest gap percentile | windowed comparison + gap percentile (§5.2, §5.4) | ≥4 eligible windows for early/late; ≥1 earlier gap for percentile | **NOW** | whether it will resume; why it stopped |
| S4 | Intense bursts followed by silence | "Is this hot-and-cold pattern real?" | inter-event time dispersion, run structure of active/quiet days | burstiness coefficient + run-length description (§5.8) | ≥30–50 inter-event gaps for a stable B estimate [2, 3] | **NEW** | that bursts mean passion or games; any motive |
| S5 | One person repeatedly follows up before replies | "Am I double-texting into a void?" | `followUpRate`, `followUpCount` per participant | rate + minimum relevant turns; change threshold 15 pp | ≥3 relevant turns per participant | **NOW** | being ignored (a motive/attention claim); only the timing structure is observed |
| S6 | Contact keeps restarting after long pauses | "Do we always come back?" | `pauseSummary` gap/restart history, `reconnectionShare`, subsequent-thread stats | empirical restart frequency over past gaps (§5.4) | ≥3–5 completed long gaps before any "usually" wording | **NOW** | that it will restart this time; who *wants* the restart |
| S7 | Communication became more balanced over time | "Did this get more mutual?" | turn share / thread-start share early vs. late | paired-period share comparison | contract minimums both periods | **NOW** | that balance means health (relationship-quality claim — forbidden) |
| S8 | Communication became more one-sided over time | "Is this becoming all me?" | same constructs, opposite direction | same | same | **NOW** | motive; who cares more |
| S9 | The latest silence feels unusual | "Is this silence weird for us?" | `pauseSummary.latestGapPercentile` (vs. earlier gaps only) | empirical percentile with censoring caveat (§5.4, §11) | ≥5–10 earlier gaps for a percentile worth showing | **NOW** | probability *they* reply; anything about the person. Full design in §11 |
| S10 | Has this pattern happened before? | "Have we been here before?" | similarity of current window's features to past windows | historical-analog retrieval (§10) | ≥6–8 completed windows; ≥2–3 qualifying analogs | **NEW** | that past similarity predicts this outcome (analog ≠ cause [37, 38]) |
| S11 | What historically followed similar slowdowns? | "When it slowed like this before, then what?" | outcomes of windows following analog windows | analog + next-window outcome counts (§10) | same as S10, plus outcome observed for each analog | **NEW** | recovery promises; "this will recover" is forbidden |
| S12 | Talking stage: less frequent but not inactive | "Is this fading or settling?" | frequency trend + intermittency classification together | drift test (§13) × intermittency test (§14) | both tests' minimums; short histories usually fail — say so | **NEW / often insufficient** | the other person's intent; where it's heading |
| S13 | Long relationship shifts gradually | "Did we slowly change without noticing?" | long-horizon windowed trend, seasonality-checked | early/late + monotone-trend check + seasonal caveat (§5.2, §5.6) | ≥6–12 months span; ≥6 eligible windows | **NEW** (trend part) / **NOW** (early-late part) | that gradual change means decline in the relationship |
| S14 | Breakup / no-contact export, retrospective | "Did I miss the signs?" | full history description: changes, asymmetry, gaps | descriptive timeline of notable changes only | standard | **BG / core UNSAFE** | "signs," causes, who withdrew emotionally. Ethically the most fragile use (post-breakup surveillance correlates with worse recovery [CR-15]); serve with maximum restraint, never market |

### 3.2 Friendship

| # | Scenario | User question | Observable construct | Method | Min. evidence | Class | Cannot be inferred |
|---|---|---|---|---|---|---|---|
| S15 | A close friendship appears to be drifting | "Did we actually drift?" | multi-indicator drift: frequency, active days, starts, gaps | multivariate drift definition (§13) | ≥2 agreeing indicators, persisting ≥2 windows | **NOW** (indicators exist) / **NEW** (drift composite) | that drift means the friendship is ending; friendship decay without contact is real but its meaning is not readable from one chat [16, 17] |
| S16 | Friends talk rarely but reliably reconnect | "Are we fine, just low-frequency?" | gap distribution stability + restart recurrence | intermittency classification (§14) | ≥5 completed long gaps | **NEW** (label) / **NOW** (facts) | that low frequency means low closeness — kin/strong ties survive long gaps (Established [16]) |
| S17 | One friend carries nearly all initiation | "Is it always me?" | thread-start + restart share, stable across windows | asymmetry + stability check (§12) | contract minimums ×2 windows | **NOW** | value placed on the friendship (equity research: over-benefiting also correlates with distress — do not moralize the number [CR-6]) |
| S18 | Long-distance friendship with seasonal contact | "We only talk in summers — is that a pattern?" | monthly/seasonal activity concentration, recurrence across years | seasonal recurrence description (§5.6) | ≥2 full cycles (≥2 years) — rarely available | **NEW / often insufficient** | that seasonality is deliberate or means anything beyond timing |
| S19 | Friendship quieter after a life transition | "Did the move change us?" | before/after a user-supplied date marker | event-aligned comparison (§16) | marker + ≥1 eligible window each side, ideally more | **RES** (Stage 10) | causation; recall-biased marker dates are a known hazard (§16) |
| S20 | Alternating silence and intense contact | "Is on-off our normal?" | run-length distribution of active/quiet stretches | burstiness + run stability (§14) | ≥4–6 full on/off cycles | **NEW** | cycle motive; that the cycle is healthy or unhealthy (on/off *romantic* cycling correlates with distress [18] — but that is about relationships, not chats, and must never be projected onto a user's chat) |
| S21 | Is this normal for this friendship? | "Is the current state within our range?" | current window percentile within own history | own-baseline percentile (§5.1) | ≥6 completed windows | **NOW** | normal for friendships *in general* — no population norm exists in-product |
| S22 | Compare earlier and recent phases | "How different are we from two years ago?" | early/late comparison across all six metrics | contract early/late machinery | ≥4 eligible windows | **NOW** | why the phases differ |

### 3.3 Family

Family rows inherit the context research's hardened rules: heavier hedging, no conditional projections for estrangement-shaped patterns [CR-12], and role confounders stated in-copy [CR-10].

| # | Scenario | User question | Observable construct | Method | Min. evidence | Class | Cannot be inferred |
|---|---|---|---|---|---|---|---|
| S23 | Parent–adult-child contact is episodic | "We talk in bursts — is that our shape?" | gap/return structure, episode durations | intermittency description (§14) | ≥4 episodes | **NOW** (facts) / **NEW** (label) | closeness, obligation, ambivalence — parent–adult-child ties are typically close *and* strained simultaneously [CR-10] |
| S24 | One relative initiates around family events | "Does Aunt R only text at Diwali?" | initiation timing concentration near recurring dates | seasonal/event concentration (§5.6) | ≥2 cycles of the recurring event | **RES** | motive for event-driven contact |
| S25 | Contact increases around holidays or crises | "Do we spike every December?" | monthly concentration, recurrence | seasonal description (§5.6) | ≥2 years | **NEW / often insufficient** | that holiday contact is obligatory vs. warm |
| S26 | Family communication stops and restarts | "We keep going quiet and coming back" | pause/reconnection history | empirical restart description (§5.4) | ≥3 completed cycles | **NOW** | reconciliation likelihood — the strongest family-specific prohibition: reconciliation tracks factors invisible to metadata [CR-12] |
| S27 | Estranged relationship, intermittent reconnection | "Is this cycle ending or continuing?" | same as S26 | same, empirical-past-only wording | same | **BG / projections UNSAFE** | any forward statement. Withdrawal-and-return is the *expected shape* of estrangement [CR-11, CR-12]; a restart history must not be dressed as hope |
| S28 | One person bridges a family group | "Mom relays everything — is that visible?" | group participation share, who follows whom (approximate) | participation-share description only (§5.7) | group caveat always on | **BG** | pairwise relationship claims in groups — reply attribution is guessed [CR-27] |
| S29 | Family relationship changed after a major date | "Everything changed after the funeral" | before/after user-supplied marker | event-aligned comparison (§16) | as S19 | **RES** (Stage 10) | causation |
| S30 | Feels one-sided, but family roles may explain it | "Am I the only one who calls Dad?" | initiation asymmetry + explicit role confounder in copy | asymmetry description with structural caveat | contract minimums | **NOW** (with mandatory caveat) | that asymmetry means unequal caring — structurally expected asymmetries exist in family roles [CR-10, CR-20] |

### 3.4 Work / professional

All work rows are **supported, never marketed** (context research §10). They are listed for completeness, not investment.

| # | Scenario | Observable construct | Class | Note |
|---|---|---|---|---|
| S31 | One person carries follow-ups | `followUpRate` per participant | **BG** | Fact computable now; coordination framing only, no "relationship" copy |
| S32 | Replies slow during project phases | reply-time by period | **SKIP** | Needs phase labels the app cannot know; enterprise tools own this space |
| S33 | Communication concentrated in working hours | `hourlyCounts`, `weekdayCounts` | **BG** | Already shipped as charts; descriptive only |
| S34 | One person coordinates most tasks | — | **UNSAFE as asked** | "Coordinates tasks" is content; initiation share is the only honest proxy and must be labeled as such |
| S35 | Response times changed over time | reply-time early/late | **BG** | Same machinery as S1; hierarchy confounder must be stated [CR-20] |
| S36 | Group dominated by a few participants | message/turn share in group | **BG** | Participation share is honest; dominance persists across platforms (Established [CR-26]) but per-person claims stay off |

### 3.5 General / data-quality

These are scenarios, not error states: each deserves designed copy.

| # | Scenario | Detection today | Class | Honest output |
|---|---|---|---|---|
| S37 | Export is too short | window eligibility + `EvidenceState` | **NOW** | "Not enough to read yet" with the specific shortfall (days, messages, windows) — never a padded guess |
| S38 | Export ends during an open conversation | `ConversationTurn.openAtExportEnd`; forecasting censoring policy | **NOW** (machinery) / copy missing | "The export ends mid-conversation; the last exchange is not counted as unanswered" (right-censoring, §5.4 [24, 25]) |
| S39 | Messages missing / chat moved platforms | not reliably detectable | **UNSAFE to infer; disclose instead** | Standing caveat: "This reads one export from one platform; contact elsewhere is invisible here." Gap-based "hole detection" heuristics are **RES** at best — a long gap and a platform move are observationally identical |
| S40 | Too few comparable periods | `DynamicsComparison.available=false` + reason | **NOW** | Reason already computed; surface it in plain words |
| S41 | Group reply attribution ambiguous | `groupApproximation` finding exists | **NOW** | Keep; never emit pairwise reads in groups (roadmap QA rule) |
| S42 | Activity is highly seasonal | not computed | **NEW** | Seasonality check before any drift label (§13); with <2 cycles, disclose instead of adjusting (§5.6) |
| S43 | A single exceptional event distorts averages | medians already used in dynamics | **NOW** (by design) | Contract prefers medians/MAD [30, 31]; §6 E1–E2 make it a hard rule everywhere |
| S44 | Time zones / shift schedules confound reply timing | not detectable from a WhatsApp export (timestamps are exporter-local; no per-participant timezone) | **UNSAFE to adjust; disclose** | Time-of-day *stratification* (§15) partially mitigates; cross-timezone correction is Not inferable |
| S45 | Many short messages vs. fewer long turns | turn model already normalizes: `messagesPerTurn`, `wordsPerTurn`, turn share | **NOW** | Compare turns and words, not raw message counts — already the contract's design; state it in evidence copy |

---

## 4. Top scenario ranking

### 4.1 Qualitative ranking

Ranked by the ten criteria the task names (urgency, emotional value, scientific validity, explainability, data availability, feasibility, misinterpretation risk, cross-context usefulness, repeat use, marketability), argued qualitatively:

1. **Unusual silence (S9 + S6).** The highest-frequency trigger (a quiet chat, right now), the strongest scientific footing (empirical percentile of the chat's own gap distribution plus counted restart history — nothing is modeled), fully explainable in one sentence, and the market review's #3 promise. Misinterpretation risk is real (percentile → "90% chance something's wrong") and is designed against in §11. Repeat-use is the best in the product: silences recur.
2. **Carried contact (S2/S5/S17/S30).** Second-most-acute question, answerable with counted events and named participants; the multi-construct hierarchy (§12) is what makes it defensible rather than a single-number verdict. Works identically across romantic, friendship, family (with role caveat), work (unmarketed).
3. **Pattern change (S1/S3/S8/S22).** The market review's #1 promise ("overthinking, or did it change?"). Contract v2.0 already gates it with sample minimums and notable-change thresholds; the only work is answer-shaped copy. Slightly lower than #2 only because it needs more history to say anything strong.
4. **Intermittent rhythm (S4/S16/S20/S23/S26).** The most *reassuring* read in the product ("on-and-off is this chat's normal shape") and the one competitors cannot copy without honesty. Needs the one genuinely new derived feature set (§14). High cross-context value (friendship, family especially).
5. **Honest insufficiency (S37/S40).** Cheap, already computed, and strategically load-bearing: a confident "this data cannot answer that yet" differentiates the product from every fabricating competitor and is itself the answer to a real question ("can I even trust an app on three weeks of chat?").
6–10 (later tier): **historical analogs** (S10/S11 — high value, needs §10's design and enough history); **drift composite** (S15/S13 — needs §13); **seasonal recurrence** (S18/S25/S42 — usually starved of cycles); **event-aligned comparison** (S19/S29 — Stage 10, needs user markers); **balanced-improvement mirror** (S7 — same machinery as #3, positive framing).

**Reject:** compatibility/ranking of people (§17), any per-person group read (S28/S41), work phase analysis (S32), automatic event inference, "did I miss the signs" as a question the product answers (S14's core), platform-move hole detection shipped as fact (S39).

### 4.2 Transparent weighted ranking (optional check)

Scores are 1–5 product judgments, not measurements; the exercise is a consistency check on §4.1, not evidence. Equal weights are the honest default because no data exists to justify differential weights (Product hypothesis); misinterpretation risk is scored inverted (5 = low risk).

| Scenario family | Urgency | Emotional | Validity | Explainable | Data avail. | Feasible | Low-risk | Cross-context | Repeat | Marketable | Mean |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Unusual silence | 5 | 5 | 5 | 5 | 4 | 5 | 3 | 4 | 5 | 5 | **4.6** |
| Carried contact | 4 | 5 | 4 | 5 | 4 | 5 | 3 | 5 | 3 | 5 | **4.3** |
| Pattern change | 4 | 5 | 4 | 4 | 3 | 5 | 3 | 5 | 4 | 5 | **4.2** |
| Intermittent rhythm | 3 | 4 | 4 | 4 | 3 | 3 | 4 | 5 | 4 | 4 | **3.8** |
| Honest insufficiency | 3 | 3 | 5 | 5 | 5 | 5 | 5 | 5 | 2 | 3 | **4.1** |
| Historical analogs | 4 | 5 | 3 | 4 | 2 | 3 | 2 | 4 | 4 | 5 | **3.6** |
| Drift composite | 3 | 4 | 4 | 3 | 3 | 3 | 3 | 5 | 3 | 4 | **3.5** |
| Seasonal recurrence | 2 | 3 | 4 | 4 | 1 | 3 | 4 | 4 | 3 | 2 | **3.0** |
| Event-aligned comparison | 3 | 4 | 3 | 4 | 2 | 4 | 2 | 5 | 2 | 3 | **3.2** |

**Sensitivity check:** doubling the weight on *scientific validity* and *low misinterpretation risk* (the two criteria a safety-first product should privilege) does not change the top five's membership — insufficiency rises to #2, analogs falls further. Doubling *urgency* and *marketability* instead also keeps the same top five, reordering only ranks 2–3. The ranking is stable to any single-criterion doubling; treat that as adequate for sequencing decisions and nothing more.

**Top 5 MVP:** unusual silence; carried contact; pattern change; honest insufficiency; intermittent rhythm (facts-level now, full label after §14).
**Top 10 later:** historical analogs; drift composite; balanced-improvement mirror; long-horizon gradual shift (S13); event-aligned comparison; seasonal recurrence; talking-stage disambiguation (S12); group participation view (S36, unmarketed); work coordination facts (S31, unmarketed); retrospective description for closed chats (S14, heavily hedged, never marketed).
**Reject list:** as in §4.1.

---

## 5. Empirical method catalog

Each method: scientific basis · data required · assumptions · failure modes · explainability · computational cost · production vs. research verdict. "Production" means on-device TypeScript, deterministic, explainable in Layer 2 words; "research" means Python-side only.

### 5.1 Distributional summaries

| Method | Basis | Needs | Fails when | Explainability | Cost | Verdict |
|---|---|---|---|---|---|---|
| **Median** | Standard robust location; 50% breakdown point [30] | ≥5 values (contract already uses this) | Multimodal data (median hides the modes) | Perfect — "typical" | O(n log n) | **Production** (already shipped) |
| **Quantiles / empirical percentile** | Order statistics; distribution-free | ≥~10 values for quartiles to be meaningful; more for tails | Tiny samples make percentiles jumpy; ties | High — "longer than 8 of 10 past gaps" beats "83rd percentile" (frequency formats are better understood; Established [34]) | O(n log n) | **Production** — but render as counts, not percentile jargon, in Layers 1–2 |
| **Median absolute deviation (MAD)** | Robust scale, 50% breakdown [30, 31] | same as median | Zero-MAD degeneracy when >half the values are identical (guard exists in runtime silence anomaly) | Medium — keep in Layer 3 | O(n log n) | **Production** (already the shipped silence-anomaly scale) |
| **Trimmed means** | Robust location between mean and median [32] | ≥~20 values | Choice of trim fraction is arbitrary-looking | Low-medium | O(n log n) | **Research** — medians already serve the product need; two robust locations invite inconsistency |
| **Robust dispersion (IQR)** | Standard | ≥~10 values | Same small-sample jumpiness | High ("middle half of replies took 10m–2h") | O(n log n) | **Production** for evidence bullets |

**Standing rule (Supported method):** reply delays and inter-message gaps are heavy-tailed — established at population scale for email and messaging (most replies fast, a long tail of very slow ones [11]; heavy-tailed inter-event times are the default in human communication [1]). Means are therefore misleading for these quantities; the product already computes `avgReplyMinutes` and should keep it Layer-3 only. §6 E2.

### 5.2 Longitudinal comparison

| Method | Basis | Needs | Fails when | Explainability | Verdict |
|---|---|---|---|---|---|
| **Fixed calendar windows** | Standard epidemiological/eng practice; the shipped adaptive-window design (7/14/30d by span) | ≥20 msgs & ≥2 active days per window (contract) | Window boundaries split episodes; window size interacts with rhythm | High | **Production** (shipped) |
| **Rolling windows** | Standard smoothing | same | Autocorrelation — adjacent rolling values are not independent; invites over-reading wiggles | Medium | **Production for display, not for testing** — never count rolling points as independent evidence (§6 E4) |
| **Early vs. late** | Simple two-period contrast | ≥4 eligible windows (contract) | Conflates many causes; sensitive to endpoint choice | Very high | **Production** (shipped) |
| **Recent vs. prior** | Last window vs. previous | 2 eligible windows | Single-window noise | Very high | **Production** (shipped); always show sample sizes |
| **Paired per-participant comparison** | Within-person contrast removes between-person differences — the panel-data insight that within- and between-person effects differ [more below] | contract per-participant minimums | Participant behavior change vs. composition change confounded in groups | High | **Production** (shipped as per-participant `MetricChange`) |

**Within vs. between (Supported method, load-bearing):** "Asha replies slower than Ravi" (between-person) and "Asha replies slower than Asha did in March" (within-person) are different facts with different confounders; only the within-person one supports a "change" claim. Chronemic norms are person- and dyad-specific — people form reply-time expectations *per correspondent* after only a few exchanges (Established [13]) and individual daily rhythms are persistent [15] — so all "changed" claims must be within-person or within-dyad. §6 E5.

### 5.3 Change detection

| Method | Basis | Complexity | On-device | Explainability | Verdict |
|---|---|---|---|---|---|
| **Robust threshold on paired windows** (shipped) | Contract's notable-change thresholds (e.g., ≥30% relative activity change, ≥2× and ≥10 min reply-latency change) | trivial | yes | **Best in class** — "fell from 52 to 31/week, past the 30% bar" | **Production** (shipped). The default; everything below must beat it to earn a place |
| **CUSUM** | Sequential detection of mean shift; optimal for known shift size (Page 1954 [4]) | low | yes | Medium — cumulative sums are one step abstract | **Research** — its sequential-monitoring framing fits streams; ChatSense analyzes a static export where retrospective methods fit better |
| **Page–Hinkley** | CUSUM variant for drift in streams [4, 5] | low | yes | Medium-low | **Research** — same reason; used in concept-drift monitoring [5], not retrospective reads |
| **Bayesian online change-point detection (BOCPD)** | Exact online posterior over run lengths (Adams & MacKay 2007 [6]) | medium; needs hazard prior + likelihood model | feasible | Low — posteriors over run lengths are Layer-3-only material | **Research** — valuable as an offline validator of simpler labels; never as shipped copy |
| **PELT** | Exact penalized multi-change segmentation in linear time (Killick et al. 2012 [7]) | medium | feasible | Medium — "the history splits into 3 phases at these dates" is actually very explainable *output* even though the method is not | **Research now; candidate for Stage 9 production** for the phase-segmentation view, if validated on synthetic fixtures with known change points |
| **Segmented / interrupted regression** | Fit level+slope with a break; standard for evaluating interventions (ITS tutorial [8]) | low-medium | yes | Medium-high | **Research now; production candidate for §16** (user-supplied event markers) where the break date is *given*, which removes the hardest estimation problem |

**Verdict (Supported method):** the shipped threshold-on-eligible-windows design is the right production method: it is the only one whose every output is a checkable arithmetic fact. Model-based change-point methods (BOCPD, PELT) earn a place only as *offline validators* — run them in Python over fixtures and real-donation data (§19) to measure how often the simple thresholds miss real changes or fire on noise, and promote a segmentation view only if that evidence says the simple method is materially wrong. Do not ship a change-point model because it is more sophisticated; ship it only if it is more *correct* on data we can actually check.

### 5.4 Time-to-event analysis

The natural frame for "how long until a reply / a restart," because it handles the one thing simple averages cannot: **censoring** — opportunities where the export ends before the outcome is seen [24, 25].

| Method | Basis | Needs | Verdict |
|---|---|---|---|
| **Kaplan–Meier survival curve** | Nonparametric survival under right-censoring (Kaplan & Meier 1958 [24]) | ≥~20–30 events for a curve that isn't a staircase of noise | **Research now; Stage 9 production candidate** for time-to-restart after long gaps, rendered as plain sentences ("half of past long gaps ended within 6 days"), never as a curve in Layers 1–2 |
| **Censored reply opportunities** | The forecasting contract's existing censoring policy (right-censored at export end; superseded-thread termination) | shipped | **Production semantics already exist** — reuse them for any descriptive timing claim (§6 E3) |
| **Survival / hazard functions** | S(t), h(t) standard definitions [24, 25] | as K–M; hazards need more data | Survival: research→product as above. **Hazard curves: research-only** — hazard estimates are noisy and invite "the risk is rising" misreads |
| **Competing risks** | When multiple event types end a wait (Fine & Gray 1999 [26]) | event-type labels + large samples | **Research-only.** The product's one real competing-risk structure (reply vs. same-sender-new-thread supersession) is already handled by the forecasting contract's censoring rules; full competing-risk modeling adds nothing shippable |
| **Empirical restart probability after pauses** | Counted frequencies over completed past gaps | ≥3–5 completed comparable gaps | **Production** — this is the "restarted 7 of 9 times" statement, the product's single most valuable sentence shape. The subtlety: the *current* gap is censored and must never sit in its own denominator (the shipped `latestGapPercentile` already obeys this) |

**Product/research split (Supported method):** counted restart frequencies and percentile-of-past-gaps are production-safe today. K–M becomes worth shipping only when gap counts routinely exceed what counting handles gracefully (rare in one export) or when time-to-restart *distributions* (not just rates) are surfaced — a Stage 9 decision. Everything with a modeled hazard stays research.

### 5.5 Forecasting

The existing Stage 5 machinery (prequential rolling-origin evaluation, smoothed empirical baselines, transparent candidates, promotion gates in `contracts/forecasting_contract.json`) is methodologically correct and stays authoritative. External literature adds calibration and baseline discipline:

- **Historical / sender-specific baselines** — the required comparison floor. Forecast-competition evidence is blunt: simple statistical baselines are hard to beat, and complex methods often lose to them (M4: pure-ML entries underperformed; winners were combinations anchored in simple statistics [22]). Any ChatSense model must beat the *best* baseline, not the average one (already the contract's design). **Production floor.**
- **Moving average / exponentially weighted mean** — shipped as activity baselines. **Production.**
- **Logistic regression** — the natural first *model* for reply-within-horizon (features: sender, hour bucket, weekday, thread-start flag, recent rates). Transparent, cheap, calibratable. **Research; P2 candidate (§18).**
- **Discrete-time survival** — logistic regression on person-period rows; handles censoring natively and is the standard bridge between the two frames (Singer & Willett 1993 [27]). **Research; the recommended P2/P3 workhorse** because it unifies "will a reply come" and "how long until" in one calibratable model.
- **Calibrated probabilities** — calibration is measured (reliability tables, ECE [20, 21]) and scored (Brier [19]; proper scoring rules [23]); the contract already requires ECE and Brier. **Required gate, all stages.**
- **Conformal prediction** — distribution-free prediction intervals with finite-sample coverage guarantees (Angelopoulos & Bates 2021 [28]). Attractive in principle; exchangeability is strained by serial dependence in one chat's opportunities, and interval outputs are hard to render safely. **Research-only until P3; empirical quantiles of historical outcomes serve the same product need sooner.**
- **Abstention / no-prediction states** — the model refuses when evidence is thin or calibration unproven. Already the product's stance (gate blocked → no forecast). **Production; permanent.**
- **Chronological validation only** — random shuffles leak the future into training; blocked/rolling-origin designs are the correct evaluation for dependent series (Established [9, 10]). Already the contract's `prequential_rolling_origin`. **Permanent rule (§6 E11).**

### 5.6 Seasonality

- **Weekday and time-of-day patterns** — already computed (`weekdayCounts`, `hourlyCounts`, `peakHour`, `peakDay`). Communication has strong, individually distinctive daily/weekly rhythms (Established [15]). **Production (shipped).**
- **Stratification before adjustment** — comparing like-for-like slices (weekday vs. weekday, evening vs. evening) is more explainable than model-based seasonal adjustment and is the recommended production approach for reply-timing comparisons (§15). **Production candidate.**
- **Holiday/event effects** — real but need ≥2 cycles of the event to distinguish from one-offs; with less, disclose ("this December was busier; only one December is in the export"). **NEW, usually insufficient.**
- **Autocorrelation** — diagnostic only; an ACF is Layer-3/research material. **Research.**
- **Seasonal decomposition (STL [29])** — needs ≥2 full cycles of the season being removed; most exports have <2 years. **Research-only**; when cycles are insufficient, the honest product move is a seasonal *caveat*, not a seasonal *adjustment* (§6 E15 corollary).

### 5.7 Reciprocity and balance

- **Initiation share, turn share, restart share, follow-up burden** — shipped, contract-gated. The construct is legitimate across relationship types (maintenance behaviors are measurable across lovers/relatives/friends; Established [CR-3]). **Production.**
- **Rolling asymmetry** — the per-window share series, used to ask "is the asymmetry stable or emerging?" (§12). Needs ≥3–4 eligible windows. **Production candidate (derived from existing per-window participant summaries; no new math).**
- **Entropy / concentration indices (e.g., normalized entropy, HHI) for groups** — defensible descriptive statistics for "how concentrated is participation," better than eyeballing shares when n>3. Explainability is the cost; render as "two of six participants sent 80%." **Production-lite for the group participation view; otherwise skip.**

### 5.8 Burstiness

- **Inter-event-time distribution** — heavy tails are the default in human communication (Established [1, 11]); this is *why* "intermittent" is often normal rather than alarming, and the scientific backbone of scenario family 4.
- **Burstiness coefficient B = (σ/μ − 1)/(σ/μ + 1)** (Goh & Barabási 2008 [2]) — one number in [−1, 1): regular < 0 < bursty. Cheap and standard. **Bias warning (Established):** B is systematically distorted for short sequences; use the finite-size-corrected estimator for n below a few hundred events (Kim & Jo 2016 [3]) — which is *most chats*. **Production candidate as an internal feature only** — the number itself never appears in Layers 1–2; it drives labels like "runs in bursts."
- **Fano factor / index of dispersion** — variance-to-mean of counts per window; equivalent diagnostic in count space. **Research** (redundant with B for product purposes).
- **Run-length patterns** — distribution of consecutive active/quiet day runs. The most explainable burstiness evidence there is ("active 5–10 days, then quiet 1–3 weeks, five times in a row"). **Production candidate; the primary Layer-2 rendering for §14.**

### 5.9 Uncertainty

- **Bootstrap confidence intervals** (Efron 1979 [33]) — deterministic-seed bootstrap already used in the forecasting gate. For product surfaces, bootstrap CIs on medians/shares are feasible on-device but hard to render safely; prefer sample-size gating + coarse confidence labels in Layers 1–2, keep CIs in Layer 3. **Production (Layer 3) / gate machinery (shipped).**
- **Sample-size thresholds** — the shipped mechanism (contract minimums). The cheapest honest uncertainty method and the right Layer-1 rendering. **Production (shipped).**
- **Posterior intervals** — only if a Bayesian method ships (none recommended for product). **Research.**
- **Calibration plots / ECE / Brier** [19, 20, 21, 23] — required for any probability that ever reaches users (§18). **Gate machinery (shipped).**
- **Abstention** — first-class everywhere. **Production (shipped as evidence states + blocked gate).**
- **Uncertainty wording** — communicating uncertainty does not generally destroy trust; verbal-numeric hybrids and frequency framings work best, and *withholding* uncertainty is what damages credibility when discovered (Established [34, 35, 36]). Render probabilities as natural frequencies ("7 of 9"), state ranges over point values, and never show decimal-precision confidence (roadmap §8 already forbids it).

---

## 6. Hard empirical standards

Normative for every future model. Extend, don't shrink. Each rule: statement → why → enforcement hook.

- **E1 — No claim from a single raw average.** Every surfaced comparison needs a sample count on both sides and a robust statistic. *Why:* heavy tails and single-event distortion [1, 11, 30]. *Enforce:* narrative templates require `earlierSampleSize`/`laterSampleSize` (already in `MetricChange`).
- **E2 — Medians/quantiles for reply times and gaps; means Layer-3 only.** [11, 30] *Enforce:* copy scanner rejects "average reply" phrasing in Layers 1–2.
- **E3 — Right-censoring at export end is always respected.** The final open turn is never an unanswered message; the current gap never enters its own reference distribution. [24; shipped censoring policy] *Enforce:* already contract-owned; extend to any new silence copy (§11).
- **E4 — Rolling views are display, not evidence.** Overlapping windows are dependent; never count them as independent confirmations. [9]
- **E5 — Within-person change ≠ between-person difference.** "Changed" claims compare a participant/dyad to itself. [13, 15; §5.2]
- **E6 — No comparison across periods with radically different exposure without normalization.** Per-active-day and per-opportunity rates, not raw totals (shipped design; keep it).
- **E7 — Missing data is not silence.** A gap in the export is "no messages *in this export*." Platform switches are invisible (S39). *Enforce:* standing caveat string.
- **E8 — Minimum event counts, contract-owned, before any directional label.** (shipped; extend to every new feature)
- **E9 — Strong labels require ≥2 independent agreeing signals.** One metric = one observation, not a pattern (§12, §13). *Enforce:* confidence logic.
- **E10 — Effect size and significance are different facts.** A change can pass a threshold and be trivial, or be real and under-sampled. Report magnitude (before/after values) with the sample; prefer effect-size framing (e.g., Cliff's delta in research [40]) over p-values everywhere.
- **E11 — Chronological validation only; never random shuffles.** [9, 10; shipped]
- **E12 — Every model must beat the best simple baseline, meaningfully and consistently.** [22; shipped gate]
- **E13 — Calibration, not just accuracy, for any probability.** [19, 20, 21]
- **E14 — Abstention is always available and never converted to a guess.**
- **E15 — Personal baseline beats universal threshold wherever it exists.** Universal floors (like the 360-minute thread gap) are structural definitions, not judgments about the person. [14, 15]
- **E16 — Expose dates, samples, and raw values in evidence bullets.** (roadmap §8 style guide; makes E1–E15 user-auditable)
- **E17 — Insufficient data never becomes zero.** `null`/"unavailable" is the value (shipped `EvidenceState`; keep sacred).
- **E18 — Correlation never becomes motive.** The entire forbidden-claims boundary in one empirical sentence.
- **E19 — Multiple-comparison honesty when scanning metrics.** The engine scans ~6 metrics × 2 comparisons for notable changes; with thresholds this coarse the false-positive risk is modest, but any future expansion of scanned metrics must either tighten thresholds, require multi-signal agreement (E9), or disclose the scan ("one of nine measures moved") — scanning many measures and headlining the movers is the garden of forking paths [41, 42].

---

## 7. Scenario-to-method matrix

The most important section. High-priority scenarios only (MVP five plus the strongest later tier); each row is implementation-ready. "Existing metric" names the shipped TypeScript field; "Missing" names what Stage 9+ would add.

| Scenario | Exact user question | Measurable construct | Existing metric | Missing metric | Method | Baseline | Min. sample | Confidence logic | Plain-language output | Unsafe interpretation (refuse) | Effort | Validation status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **S9 unusual-silence** | "Is this silence unusual for us?" | current gap's rank among this chat's earlier gaps | `pauseSummary.latestGapPercentile`, `latestGapMinutes`, `longestPauses` | comparable-gap filter (optional, §11) | empirical percentile, censoring-aware (§5.4) | own gap history | ≥5–10 earlier gaps; else insufficiency copy | percentile from ≥10 gaps = Useful; ≥20 = Strong; contradictory rhythm ⇒ downgrade | "This quiet is longer than 8 of the 10 earlier gaps in this export." | "Something is wrong"; any reply probability | none (copy only) | parity-covered (`pause_summary`); percentile fixture exists |
| **S6 restart-history** | "What happened after quiets like this before?" | restart frequency + time-to-restart over completed past gaps | `pauseSummary.longestPauses` (+ reconnecting senders), `reconnectionShare` | time-to-restart distribution summary (Stage 9: K–M) | counted frequencies over completed gaps (§5.4) | none needed — pure description | ≥3 comparable completed gaps for "usually"; ≥5 for counts-with-confidence | 3–4 gaps = Light; 5–9 = Useful; ≥10 = Strong | "After the 9 earlier pauses longer than a day, the chat restarted every time — usually within a week." | "It will restart"; "they'll come back" | small (copy + one derived summary) | parity-covered inputs; new summary needs fixture |
| **S2/S17 carried-contact** | "Am I the one keeping this alive?" | convergence of thread-start share, restart share, follow-up rate, turn share | `threadStartShare`, `reconnectionShare`, `followUpRate`, `turnShare` (per participant, per period) | rolling per-window asymmetry series (derivable) | multi-construct hierarchy (§12) | balanced-range definition from contract (≤60% top share) | contract minimums per construct; ≥2 constructs evaluable | all evaluable constructs agree = Strong; mixed = Mixed read; one construct only = Light | "You started 14 of 18 conversations and restarted 6 of 7 long pauses; message volume was even." | "You care more"; "they're pulling away" | small-medium (hierarchy logic + copy) | all four inputs parity-covered |
| **S1/S3 pattern-change** | "Did the pattern actually change?" | within-person / within-chat change past contract thresholds | `earlyLate`, `recentPrior`, `notableChanges`, `activity.recentTrend` | none for MVP | paired-period robust comparison (§5.2) | own earlier periods | contract (≥4 eligible windows early/late; per-metric minimums) | notable on both comparisons + ≥2 metrics = Strong; one comparison = Useful; sub-threshold = "no clear change" | "Replies slowed from a typical 18m to 2.4h between spring and the last month (31 vs. 42 replies)." | why it changed; interest | none (copy only) | parity-covered (`early_late`, `recent_prior`) |
| **S37/S40 insufficiency** | "Can this data say anything?" | evidence states + span/window counts | `EvidenceState`, `DynamicsComparison.unavailableReason`, window eligibility | none | rule surface (§5.9 sample gating) | n/a | n/a — this *is* the floor | always "certain" about its own insufficiency | "Six days of messages isn't enough history to compare against — that's honest, not a bad sign." | "Nothing is happening"; zero-filling | none (copy only) | parity-covered evidence states |
| **S4/S16/S20 intermittency** | "Is on-and-off just our normal?" | run-length structure of active/quiet periods; restart recurrence; finite-size-corrected burstiness | daily counts, `pauseSummary` | run-length extraction; corrected B [3]; cycle-stability check | §5.8 + §14 classification | own run history | ≥4–6 completed quiet-runs ≥ threshold | recurring shape across ≥4 cycles = Useful; ≥6 = Strong | "This chat runs in bursts — five quiet stretches of 4+ days so far, and every one ended within 9 days." | fading; games; ambivalence | medium (new derived features + fixtures + parity) | not yet built; needs synthetic fixtures for bursty/steady/fading cases |
| **S15/S13 drift** | "Did we actually drift?" | ≥2 agreeing declining indicators persisting ≥2 windows, seasonality-checked | early/late + recent/prior on `messagesPerActiveDay`, active days, `threadStartShare`, gaps | multivariate drift rule (§13); seasonal caveat check | §13 | own history | ≥6 eligible windows spanning ≥3–6 months | 2 indicators × 2 windows = Useful; 3 × 2 = Strong | "Three signs point the same way: fewer messages per active day, fewer active days, and longer gaps — across both halves of the year." | the friendship is ending; anyone's motive | medium (rule + copy) | indicators parity-covered; composite needs fixtures |
| **S10/S11 analogs** | "What followed periods like this before?" | similar past windows + what the next window looked like | `adaptiveWindows` features | analog retrieval (§10) | percentile-bucket matching (§10) | requires ≥2–3 qualifying analogs | ≥8 completed windows | never above Useful (by design, §10) | "Two earlier months had similarly low activity and slow replies; the next month rose once and stayed low once." | "It will recover" | medium-large | not built; fixture design in §10 |
| **S38 open-ended export** | "Does the cut-off exchange count against anyone?" | open turn at export end | `ConversationTurn.openAtExportEnd` | none | censoring semantics (§5.4) | n/a | n/a | n/a (caveat, not read) | "The export ends mid-conversation; the last message isn't counted as unanswered." | last-word blame | tiny (copy) | field is parity-covered |

Rows deliberately absent: everything family-projection-shaped (S27 forward statements are banned outright), all work rows (facts ship, no scenario copy), group pairwise reads (banned), event markers (§16, Stage 10 design first).

---

## 8. What can be answered now

Repo-verified inventory of scenarios supportable **today** — existing computation, existing parity, existing or near-existing wording. ("Parity-covered" = in `contracts/behavioral_contract.json` `parity.exact_equality_metrics` and exercised by `fixtures/expected/*.json` through `tests/parity.ts`.)

| Question | Exact current output | Parity | Wording exists? | Missing UI mapping |
|---|---|---|---|---|
| Who starts more? | `relationshipDynamics.participantSummaries[].threadStartShare`, `threadStarts`; narrative `maintenance` finding | yes (`relationship_dynamics.participants`) | yes — People takeaway "Who kept contact alive?" + maintenance findings | the *answer-shaped hero sentence* (market review §6 case 2); naming the asker's own side |
| Who restarts after long pauses? | `participantSummaries[].reconnectionCount/-Share`; `pauseSummary.reconnectingParticipants`; narrative `reconnection` | yes (`pause_summary`, participants) | yes — "After long pauses, Ravi restarted 7 of 10 times." (Stage 6.3 style) | pairing with the silence read in one card (§11 output B) |
| Did recent activity change? | `activity.recentTrend`, `recentVsPriorPct`; `earlyLate`/`recentPrior` `messages_per_active_day` changes; `notableChanges` | yes (`adaptive_windows`, `early_late`, `recent_prior`) | yes — Changes takeaway "Did the pattern move?" | the "you asked if it changed; here is the direct answer" framing |
| Did reply timing change? | `MetricChange` on `median_reply_minutes` per participant, with direction faster/slower | yes | yes — Stage 6.4 requires stated direction | time-of-day stratification caveat (§15) not yet in copy |
| Is this silence unusual vs. history? | `pauseSummary.latestGapPercentile` (earlier gaps only), `latestGapMinutes`; `SilenceSummary.unusualSilenceCount` + modified-z threshold | yes (`pause_summary`; `unusual_silence_count`) | partially — Rhythm narrative mentions percentile; no answer-shaped sentence | §11's paired output (percentile + what-followed) is the whole gap |
| Is the chat bursty/intermittent? | indirectly: `longPauseCount`, `longestPauses`, `medianInterMessageGapMinutes`, daily counts | inputs yes | no — no intermittency wording exists | needs §14 (new derived classification) — the one "answerable now" that actually isn't fully |
| What happened after previous long gaps? | `pauseSummary.longestPauses[].reconnectingSender` + durations; `medianSubsequentThreadDurationMinutes/TurnCount` per participant | yes | partially — reconnection findings exist; no "what usually followed" sentence | empirical-baseline sentence from roadmap §7 (allowed today; gate not required) |
| Is evidence insufficient? | `EvidenceState` per metric; `DynamicsComparison.available/unavailableReason`; takeaway `limited` confidence | yes | yes — "There is not enough here to read a pattern yet." | elevating to a designed first-class screen (S37 copy) |
| Follow-up burden | `followUpRate`, `followUpCount`, `medianFollowUpDelayMinutes` | yes (participants) | partially — maintenance finding covers it | inclusion in the §12 hierarchy |
| Volume-shape fairness (S45) | `messagesPerTurn`, `wordsPerTurn`, `turnShare` | yes | no explicit copy | one evidence-bullet template ("counted in turns, not taps") |

Bottom line: **eight of the ten "answer now" rows need zero new analysis — only answer-shaped copy and card mapping.** That confirms the market review's core conclusion from the empirical side: Stage 8A is a copy-and-mapping stage, not an engineering stage. *(One correction to the task's own list: "whether the chat is bursty" is only half-supportable today — the facts exist, the classification doesn't.)*

---

## 9. What needs new analysis

Ordered by value-per-risk. For each: scientific value · product value · minimal implementation · baseline · validation plan · risk · stage.

1. **Intermittency classification (run-length + corrected burstiness).** *Scientific:* heavy-tailed, bursty timing is the established default of human communication [1, 2, 3, 11]; a chat that looks "dead" may be statistically normal-bursty. *Product:* unlocks scenario family 4 — the most reassuring read. *Minimal:* derive active/quiet day runs from existing daily counts; corrected B [3] as internal feature; closed label set (§14). *Baseline:* none needed (descriptive). *Validation:* synthetic fixtures (steady, bursty-recurring, bursty-then-stopped, short) + TS/Python parity for run extraction. *Risk:* low — descriptive. *Stage 9 (early).*
2. **Historical analog retrieval (percentile buckets).** §10. *Risk:* medium (over-reading). *Stage 9, behind fixtures + comprehension test.*
3. **Multivariate drift rule.** §13. *Minimal:* a pure function over existing `MetricChange`s requiring ≥2 agreeing indicators × ≥2 windows + seasonal caveat. *Risk:* low-medium. *Stage 9 (early — it is mostly aggregation logic).*
4. **Censored time-to-restart (Kaplan–Meier).** §5.4. *Product:* strengthens S6 from counts to distributions ("half ended within 6 days"). *Baseline:* raw counted frequencies — ship K–M only if it changes conclusions on real gap counts. *Validation:* Python `lifelines`-style reference vs. hand-computed fixtures; TS port only if promoted. *Risk:* low if sentence-rendered. *Stage 9.*
5. **Time-of-day / weekday stratified reply comparison.** §15. *Scientific:* daily rhythms are strong and person-specific [15]; unstratified reply-time changes can be pure schedule artifacts. *Minimal:* compare medians within broad hour buckets (the forecasting features already define them); flag when the aggregate change disappears under stratification — then *say that*. *Risk:* low. *Stage 9 (early).*
6. **Rolling asymmetry stability.** §12 needs to know whether asymmetry is long-standing or recent. *Minimal:* per-window shares (already computed per `AdaptiveWindow.participants`) + a stability check. *Stage 8B-9 boundary.*
7. **Change-point segmentation (PELT/BOCPD) as offline validator.** §5.3 verdict: research first, promotion only on evidence the simple thresholds are materially wrong. *Stage 9 research; Stage 10 product at earliest.*
8. **Prediction intervals / conformal.** Only inside the P2–P3 forecasting pipeline (§18); no product surface before calibration proof. *Stage 9+ research.*
9. **Event-aligned comparison (user-supplied markers).** §16. Interrupted-series logic with a *given* break date [8]. *Stage 10 (privacy/recall-bias design first).*
10. **Uncertainty-aware activity projection ("if the pattern continues").** Damped-trend arithmetic already exists in the forecasting module; the *product* version stays a conditional arithmetic sentence (roadmap §7) until the gate opens. *No new work justified now.*

Explicitly *not* recommended despite sounding advanced: competing-risks modeling (§5.4 — no shippable question needs it), hazard-curve surfaces, seasonal decomposition on sub-2-year exports (§5.6), entropy scores as user-facing numbers, any neural/embedding approach (boundary + no data + M4-style evidence that complexity must earn its keep [22]).

---

## 10. Historical analogs

**Question:** "What happened after periods like this before?" — answerable, with discipline, as *description of the export's own past*, never as prediction.

**Design (recommended): percentile-bucket matching.**

1. Represent every completed adaptive window by 3–4 features already computed: messages/active-day, median reply minutes, thread-start balance, active-day density — each converted to a *within-this-chat percentile* (E15: personal baseline).
2. Bucket each feature into coarse terciles (low/mid/high) *of this chat's own distribution*.
3. The "current period" is the latest completed window. An **analog** is any earlier window matching the current bucket signature (exact match on 3 features; relax to 2-of-3 only if exact yields <2 analogs and say so).
4. **Require ≥2 analogs** (prefer ≥3) and ≥8 completed windows total; below that, output the insufficiency read.
5. For each analog, report the *next* window's direction (higher/similar/lower activity, using the contract's 30% notable threshold). Render as counts.

**Safe output (the template):**
> "Three earlier periods had a similar combination of low activity and long replies. Activity rose again in two of the following periods and stayed low in one."

**Forbidden:** "This will recover." · any probability ("67% chance") — three analogs cannot support a probability estimate; ratios of tiny counts are not probabilities. · dropping the "in this chat" scoping.

**Method comparison:**

| Method | Verdict | Why |
|---|---|---|
| **Percentile buckets** | **Recommended** | Fully explainable ("months where activity was in this chat's lowest third"), no distance metric to defend, no tuning, degrades honestly into "no similar periods found" |
| k-NN on normalized features | Rejected for product | Distances over few noisy windows are unstable; "nearest" ≠ "similar enough"; k and the metric are unexplainable tuning choices |
| Clustering | Rejected | Cluster count/boundary instability on 8–20 windows; clusters shift when one window is added — a re-import would silently change the user's history |
| Dynamic time warping | Rejected | For aligning *shapes* of long series [37]; windows here are feature vectors, not curves; heavy and unexplainable for this need |
| Rule-based matched periods ("all gaps > 7 days") | Partially adopted | This is what §11 already does for gaps; buckets generalize it to multi-feature windows |

**The causality guard (Established evidence, by analogy):** analog forecasting in other fields shows similarity-based retrieval is legitimate *description* but a weak *predictor* without large libraries of analogs [38]; with 2–5 analogs the output is a historical anecdote count, and the copy must keep it one. The similarity-suggests-nothing-about-cause rule gets a standing caveat: "Similar-looking periods can have completely different causes."

**Validation requirement:** synthetic fixtures where analog outcomes are constructed (recovering chat, declining chat, mixed) + a wording comprehension check (do readers hear the "stayed low in one" as a real possibility, not a footnote? — mirrors context-research §18 experiment 4).

---

## 11. Current silence scenario

**Question:** "Is this silence unusual, and what normally happened after silences like it?" The product's highest-value single card (market review promise #3). Empirical logic, exactly:

**Inputs:** ordered inter-message gaps; `latestGapMinutes` (export end minus last message); earlier long pauses with durations and restart info.

**Step 1 — Staleness honesty.** The export's "now" is its last timestamp, not the device clock. The app may compute the device-time gap but must label it: *"Measured to the export's last message (July 3). If you've talked since, this read is out of date — re-export for a current one."* The current silence is **right-censored**: it has lasted *at least* this long (E3). Never phrase it as a completed gap.

**Step 2 — Percentile among prior gaps.** `latestGapPercentile` already implements the correct rule (earlier gaps only; never its own denominator; `null` when no earlier gaps). Rendering rule: counts, not percentiles — *"longer than 8 of the 10 earlier quiet stretches"* (frequency formats are understood better; Established [34]).
Gate: ≥5 earlier gaps to show anything; ≥10 for a Useful read; ≥20 for Strong.

**Step 3 — Comparable-gap selection.** "Gaps like this one" = earlier gaps ≥ some floor. MVP: the existing 24h reconnection definition (contract-owned, already parity-tested). Stage 9 refinement: gaps within the same tercile of the chat's own gap distribution (§10 buckets). Do **not** condition on weekday/season in MVP — it shreds the sample (E8 beats cleverness).

**Step 4 — What followed.** Over *completed* comparable gaps: how many were followed by resumed conversation (in a two-person export this is definitionally most of them — a recorded gap ends with a message; the honest framing is **who** restarted and **how long** the gaps ran, plus whether any gap simply ran to export end unresumed) → *"All 9 earlier day-plus pauses ended with a new conversation — 6 started by Priya, 3 by you. The longest ran 11 days."* This wording sidesteps the subtle trap that "restart rate" among *observed completed* gaps is tautologically high: report the composition and durations, not a fake probability.

**Step 5 — Time-to-restart distribution.** MVP: median and max of comparable completed gap durations ("usually ended within 4 days"). Stage 9: K–M with the current gap as a censored observation [24].

**Step 6 — Confidence and insufficiency.** <5 earlier gaps → *"This chat hasn't had enough quiet stretches to compare against yet."* Never zero, never a guess (E17).

**Step 7 — Repeated-checking risk.** Same-export re-checks produce identical output; the design must make that visible (*"Nothing new can change until you re-export"*) rather than inviting refresh-checking — reassurance-seeking research says the loop must close, not feed [CR-13]. No notifications, ever (context research §15 hard boundary).

**Safe copy (full card, the bar to hit):**
> **This quiet is unusual for this chat — but quiets here have always ended.**
> The current pause (5 days so far, measured to the export's last message) is longer than 8 of the 10 earlier ones.
> - All 10 earlier day-plus pauses ended with a new conversation; 7 were restarted by Asha, 3 by you.
> - Earlier pauses usually ended within 4 days; the longest ran 11.
> - This export ends July 3 — if you've talked since, re-export for a current read.
> *Longer-than-usual describes timing, not reasons. This can't say why it's quiet or whether it will end.*

**Cannot be inferred:** reply probability *for this gap*; the other person's awareness, intent, or state; whether the silence is "bad." *(The chronemics literature is unambiguous that people read silence as a meaningful, often negative cue [12, 13] — which is exactly why the card must keep handing back timing facts and not confirm the imagined meaning.)*

---

## 12. One-sided effort scenario

**Question:** "Am I actually carrying contact?" — answered as *observed contact structure*, never effort/caring (forbidden words: cares more, emotional effort, values it more, invested).

**Why message count alone fails:** volume and maintenance dissociate — a chat can be 50/50 on messages while one side starts 80% of threads (already the product's signature observation); turn structure absorbs texting-style differences (S45: many short messages ≠ more contribution [contract turn model]); and equity research warns the evaluative leap is wrong in *both* directions (over-benefiting also correlates with distress; asymmetry alone is not a wrong to be righted [CR-5, CR-6]).

**Constructs (all shipped):** thread starts (`threadStartShare`) · restarts after 24h+ pauses (`reconnectionShare`) · follow-up burden (`followUpRate`) · turn share · active-day participation (derivable from per-window participant summaries) · change over time (early/late per-participant deltas).

**Evidence hierarchy (the deliverable):**

| Label | Rule | Copy shape |
|---|---|---|
| **Balanced** | all evaluable constructs within contract balance bands (top share ≤60%; no construct ≥65%) | "Contact-keeping has been shared: starts 11–10, restarts 4–3." |
| **Mixed** | constructs disagree (e.g., starts uneven, restarts even) | "Mixed: you start most conversations (14 of 18), but restarts after long pauses are even." — *disagreement is a finding, not a failure* |
| **Consistently asymmetric** | ≥2 constructs ≥65% same side, stable across ≥2 comparison periods | "Most of the contact-keeping has come from one side for as long as this export runs: starts 72%, restarts 6 of 7." |
| **Recently becoming asymmetric** | earlier periods balanced; latest period(s) cross thresholds on ≥2 constructs | "This is new: starts were even until spring; since then you've started 9 of 11." |
| **Insufficient evidence** | <2 constructs evaluable at contract minimums | "Too few conversation starts and restarts to read a pattern yet." |

Confidence: number of agreeing evaluable constructs (2 = Useful, 3+ = Strong), downgraded one level if any evaluable construct points the other way (then prefer Mixed).
Validation: synthetic fixtures per label (the balanced-then-one-sided fixture already exists: `stage4_balanced_then_one_sided.json`); scanner coverage for the new copy; the §18-style comprehension check that readers do *not* paraphrase the output as "they care less."

---

## 13. Drift scenario

**Question:** "Did this relationship actually drift?" — reframed honestly: *did this chat's contact pattern decline, persistently, beyond its own normal variation?* ("Relationship drifted" is Not inferable; contact decline is.)

**Distinguish five shapes** (each an explicit, testable alternative):

| Shape | Signature | Verdict copy direction |
|---|---|---|
| True sustained decline | ≥2 indicators down, both comparisons, ≥2 consecutive windows | "quieter, and staying quieter" |
| Stable low-frequency | low absolute level, flat trend | "quiet, but it's always been quiet" — not drift |
| Cyclical / seasonal | decline coincides with a recurring seasonal trough (needs ≥2 cycles to establish; otherwise caveat) | "quieter — but last year this season looked similar" or the caveat |
| One-off disruption | single anomalous window, neighbors normal | "one unusual month, not a trend" |
| Slower-replies-only | reply latency up, volume flat | "replies slowed; the amount of contact didn't" — do not label drift |

**Multivariate drift rule (recommended, threshold-based — model-based change detection stays research per §5.3):**
- Indicators: messages/active-day ↓ (≥30% rel.), active days per window ↓, thread starts total ↓, median gap ↑, per-participant reply latency ↑ (≥2×, ≥10m).
- **Strong drift read:** ≥2 indicators cross thresholds in the *same direction* on *both* early/late and recent/prior, persisting across ≥2 consecutive eligible windows, seasonal caveat clear.
- **Emerging-decline read:** recent/prior only. **No drift:** otherwise, said plainly.
- Span floor: ≥6 eligible windows over ≥3 months (≥6 months where the 14/30-day window sizes apply).

*Why multi-indicator:* single-metric drift is over-sensitive to composition effects (one busy week, one trip) — E9's multi-signal rule is the defense; the friendship-decay literature justifies the *construct* (contact decline is real and measurable and tracks closeness decay for friends; Established [16, 17]) while the same literature forbids the *inference* (family ties survive contact decline undamaged [16] — decline ≠ relational meaning).

Fixture plan: synthetic drifting, stable-low, seasonal, disrupted, replies-only cases; the `activity_decline` fixture already covers part.

---

## 14. Intermittent relationship scenario

**Question:** "Is this fading, or is on-and-off simply the normal pattern?" — the drift rule's necessary complement; without it, every bursty chat false-positives as drifting.

**Empirical definitions:**
- **Active run / quiet run:** consecutive calendar days with/without messages (day-level granularity; hours are too noisy).
- **Quiet-run floor:** runs ≥ the chat's own 75th-percentile quiet-run length (personal baseline, E15), with the 24h contract floor as minimum.
- **Cycle:** active run + following quiet run. **≥4 completed cycles** to classify at all; ≥6 for Strong.
- **Recurrence:** share of past quiet runs (≥ floor) that ended within the export with resumed activity, plus their duration spread.
- **Corrected burstiness** B [2, 3] as an internal cross-check, never user-facing.
- **Cycle stability:** compare the recent half's run-length distributions to the earlier half's (coarse: medians within notable-change bounds).

**Label set:**

| Label | Rule |
|---|---|
| **Consistently active** | no quiet runs ≥ floor in most windows |
| **Consistently low-frequency** | low level, low variance — steady trickle, not bursts |
| **Intermittent but recurring** | ≥4 cycles; recent cycle lengths within historical spread | 
| **Recent departure from the intermittent baseline** | ≥4 cycles and the current quiet run exceeds the historical quiet-run maximum (or recent cycles broke the stable pattern) |
| **Insufficient history** | <4 cycles |

Safe copy: "On-and-off is this chat's normal shape: five quiet stretches of a week or more, each followed by an active stretch. The current quiet (9 days) is inside that range." · Departure: "This chat usually runs on-and-off, but the current quiet (31 days) is longer than any earlier one." — *note this converges with §11's percentile read; the two cards must agree, which is a test.*
Periodicity (true weekly/seasonal cycles): **research-only** — autocorrelation on sparse day counts over <2 cycles is noise (§5.6).
Scientific basis: bursty inter-event structure is the human-communication default [1, 2, 11]; the on/off *relationship* literature [18] is about romantic churning and psychological distress and must never leak into chat-level labels — the label describes the chat's rhythm, not the relationship's stability.

---

## 15. Reply-timing scenario

**Question:** "Are replies actually slower?" — with the drift toward "less interested" named and refused at every step (latency is a real social cue [12, 13]; its meaning is not recoverable).

**Method requirements, in order:**
1. **Turn-based reply units** (shipped): same-sender bursts collapse into turns; no artificial reply edges (contract `reply_event`).
2. **Per-participant, within-person** (E5): "Asha's replies slowed" compares Asha to earlier Asha.
3. **Medians and quantiles only** (E2, heavy tails [11]); report the IQR shift as the effect size: "typically 18m (10m–1h) → 2.4h (40m–6h)."
4. **Censoring:** open final turn excluded (E3).
5. **Contract change gate:** ≥2× and ≥10 min, ≥5 samples per side (shipped).
6. **Time-of-day / weekday stratification (the Stage 9 addition):** recompute the comparison within broad hour buckets and weekday/weekend (buckets already defined in forecasting features). If the aggregate slowdown disappears under stratification, the finding is a *schedule shift*, and that's the read: "Replies look slower overall, but at the same times of day they're unchanged — the timing of conversations moved, not the speed." Daily-rhythm persistence makes this confound common (Established [15]). Stratified cells need ≥5 samples each; when they don't have them, show the aggregate with the schedule caveat instead.
7. **Recommended test (research validation):** Mann–Whitney U on log-delays, or bootstrap CI on the median difference, plus Cliff's delta for magnitude [40] — Python-side to tune thresholds; production keeps the explainable contract gate.

**Do not** convert slowness to interest; do not compare between people as if between-person differences were changes; do not average.

---

## 16. Transition and life-event scenario

**Question:** "Did communication change after a known event?" — the app never knows events; the user may **optionally, locally** supply a dated marker (move, breakup, job change, graduation, conflict, relocation, holiday, illness, other).

**Method:** with a *given* break date, this is interrupted time-series comparison [8] in its simplest honest form: eligible windows before vs. after (level change; slope optional later), same contract thresholds, plus segmented regression as a Stage 10+ research upgrade. The break date being user-supplied removes change-point estimation, the statistically hardest part (§5.3).

**Assessment:**
- *Scientific validity:* before/after descriptive comparison is sound; **causal attribution is not** — single-subject ITS with one intervention and no control cannot separate the event from anything else that happened concurrently [8]. Copy must stay "after the date you marked," never "because of."
- *Recall bias (Established as a general phenomenon):* self-dated life events are misremembered, typically telescoped toward the present [39]. Mitigation: coarse windows (month granularity is enough), show the marker on the timeline so the user can correct it, and treat "the change actually started before your marker" as a legitimate, visible outcome — it is often the most informative one.
- *Multiple events:* allow multiple markers; refuse attribution when markers are closer together than one window ("two markers are too close to tell apart").
- *Privacy:* markers are session-scoped, local, never uploaded — same rules as context choice [context research §14]; marker *labels* are user text and must never enter analysis (wording only).
- *Product value:* high for S19/S29 (friendship/family transitions — the school-transition literature shows exactly these transitions reshape communication networks [16, CR-14]); genuinely differentiating; ethically clean because the user asserts the event.

**Verdict: Stage 10, worth building.** Never infer events automatically (hard boundary, restating context research §5's rejection of inference).

---

## 17. Cross-chat comparison

**Question:** could ChatSense compare the same relationship across exports, several friendships, family members, romantic connections, or the user's own style across relationships?

- **Same chat across exports (re-import over time):** the strongest and safest case — it is the retention loop the market review designed toward. Alignment is technical (overlap detection, dedup), not ethical. **Stage 10; build.**
- **Several friendships side by side:** legitimate *only* as within-person context ("your chats range from 5 to 60 messages/week; this one sits at the low end") — descriptive placement, no ordering presented as a ranking. Normalization: per-active-day and per-opportunity rates; own-history percentiles. Selection bias is structural: users import the chats they're anxious about; any cross-chat "norm" built from imports is a norm of *worried-about chats*, and the copy must never call it normal. **Stage 10, carefully.**
- **Family members / romantic connections compared:** relationship-role confounds dominate (a parent-chat and a partner-chat differ structurally [CR-10, CR-20]); comparison invites exactly the evaluative reading the boundary forbids. **Within-person descriptive placement only, if at all.**
- **"User's communication pattern across relationships":** genuinely interesting (social-signature research says individuals have stable, distinctive allocation patterns [14]) and safe *as self-knowledge*: "you typically reply within an hour everywhere." **Stage 10 research; plausible future feature.**
- **Rejected outright:** any "best relationship," compatibility ordering, or per-person league table. Ranking people is the horoscope-app move plus an ethical hazard (the roadmap's forbidden list, extended by context research §15) — and statistically indefensible anyway given role confounds and import selection bias.

---

## 18. Prediction research plan

Staged; each stage names target · label · censoring · baseline · design · metric · calibration · subgroup checks · promotion gate · abstention · wording. **No model reaches product unless it beats the best simple baseline meaningfully and consistently (E12) with calibration proven (E13) — the current gate stays blocked until then.**

**P0 — historical statements only (current product).** Target: none. All "what usually happens next" copy is counted history (roadmap §7 empirical baselines). Promotion gate: n/a. Wording: past-tense frequency sentences. *This stage is permanent as the fallback.*

**P1 — simple empirical baselines, evaluated (current research, shipped in Stage 5).** Targets: reply-within-horizon (60/360/1440m), delay bucket, next-window activity. Labels: per forecasting contract. Censoring: right-censored at export end; supersession-censored (shipped). Baselines: global/participant/recent/time-context smoothed rates (shipped). Design: prequential rolling-origin, warm-up floors (shipped). Metrics: Brier, log loss, ECE; MAE family for activity (shipped). Calibration: reliability tables (shipped). Subgroups: per-participant, time slices (shipped). Gate: baseline-relative bootstrap interval (shipped). Abstention: below warm-up counts. Wording: none (research artifact only).

**P2 — validated sender/chat-specific models.** Target: same tasks. Candidate: **discrete-time survival / logistic regression** on person-period rows [27] with the existing content-free features. Design: chronological only [9, 10]; leakage rules per contract. Gate: beats *best* P1 baseline on Brier **and** ECE, consistently across fixture matrix + donated-data corpus (§19) + subgroups; deterministic and portable to TS. Abstention: any subgroup where the model loses to baseline. Wording: still none — P2 passing unlocks P3 *research*, not product copy.

**P3 — calibrated conditional projections (first product-visible change).** Target: interval statements conditioned on pattern persistence. Requires P2 passed + calibration on real validation data (synthetic fixtures cannot open this gate — forecasting-safety rule) + comprehension-tested wording. Wording: "If the recent pattern continues, the next few weeks would most often look like X–Y in chats' own past behavior" — pattern-subject, conditional, interval, never person-subject. Conformal intervals evaluated here as an alternative to quantile intervals [28]. Abstention: default state; projection appears only when earned per-export.
**Family/estrangement carve-out:** conditional projections stay off for family-context wording permanently unless separately justified [CR-12; context research §17].

**P4 — historical analogs (parallel track, not sequential).** §10's percentile-bucket design. Not a model — no gate to pass — but requires fixture validation + the §10 comprehension test before shipping. Wording: counts of analog outcomes only.

---

## 19. Dataset problem

ChatSense has **no labeled relationship-outcome dataset**, and for its core claims none can ethically exist inside the product (no telemetry, no uploads).

**Validatable without labels:** parser correctness (synthetic fixtures; shipped) · descriptive metric correctness (cross-language parity; shipped) · historical timing forecasts (the future of a chat's own timeline is its own label — the entire Stage 5 design; shipped) · self-consistency (same export → same output; adversarial-content invariance test already proves wording can't be steered) · calibration against observed future events (P1–P2, using export time-splits).

**Not validatable without labels — and mostly not with them either:** relationship health, interest, attachment, emotional state, motive (Not inferable *in principle* from metadata — no label set fixes a construct the data does not contain). **Breakup/dissolution risk** is the special case: outcome labels could in principle exist (relationship status at follow-up), making it *technically* learnable — and it stays out anyway because the forbidden-claims boundary excludes the output itself, whatever its accuracy.

**Ethical data paths, ranked:**
1. **Synthetic fixtures** (in use) — correctness and boundary cases only; never evidence of real-world validity (forecasting-safety rule stands).
2. **Public conversational corpora with real timestamps** — e.g., the NUS SMS corpus [43]; useful for stress-testing timing machinery on real human rhythms; limited (SMS-era, no dyadic continuity guarantees).
3. **Donated chat logs under research ethics** — the established CMC-research route: data-donation frameworks with informed consent, anonymization, and data minimization exist specifically for WhatsApp exports (ChatDashboard/WhatsR; donation-ethics best practices [44, 45]). The realistic P2 validation corpus. Requires a real consent design pass; participants donate *their* chats, which include non-consenting partners — the third-party-consent analogy [CR-21] applies and pushes toward metadata-only donation (strip content, keep timestamps/senders — exactly ChatSense's own feature surface).
4. **Opt-in user-labeled longitudinal study** — small-N panel who export at intervals and self-report coarse outcomes ("still in regular contact?"); the only path to any outcome-adjacent validation; expensive; Stage 10+ at the earliest, and it validates *timing forecasts*, not the forbidden constructs.
5. **Research partnerships** — with CMC/relationship-science labs already running donation studies; realistic mid-term option.
6. **On-device evaluation** — the app computing backtest metrics locally on the user's own export and *showing them* (never uploading) is already the product's design; genuinely novel honesty surface.
7. **Federated analysis** — distant possibility; a privacy-engineering project in itself; do not plan around it.

**Never:** scraping private chats; buying chat datasets of unverifiable provenance; using the developer's own exports as committed fixtures (repo rule stands).

---

## 20. User benefit model

For each top scenario, the practical human benefit — stated as benefit, never converted to advice:

| Scenario | Benefit | Mechanism (evidence class) |
|---|---|---|
| Unusual silence | **Relief or grounded validation** — "this is within our normal" ends a checking loop; "this is genuinely unusual" replaces free-floating dread with a bounded fact | External anchors against rumination; the felt need is established [CR-13, 12], the product effect is Product hypothesis |
| Carried contact | **Naming without blaming** — the user's felt asymmetry gets checked against counts; sometimes confirmed, sometimes corrected (volume even, starts uneven — the "mixed" read is the product at its best) | Calibration-need framing (context research §2); Product hypothesis |
| Pattern change | **Permission to stop re-reading** — "the pattern did change, here's exactly what" or "nothing measurable moved" both end the 10th re-read of the same thread | Market review §2 row 1; Product hypothesis |
| Intermittent rhythm | **Reframing** — "on-and-off is this chat's historical shape" converts a scary silence into a recognized rhythm | Burstiness-as-default is Established [1, 2]; the reassurance effect is Product hypothesis |
| Honest insufficiency | **Trust and boundary-learning** — the app that says "can't know yet" earns belief for the times it speaks; uncertainty disclosure does not generally erode trust (Established [35]) |
| Historical analogs | **Memory augmentation** — people misremember their own long-term patterns; the export remembers | Product hypothesis |
| Restart history | **Realistic expectation-setting** — "every pause so far has ended, usually within a week" is comfort *from the user's own data*, not from a promise | Established method, Product-hypothesis effect |

The line that keeps every row honest: the benefit is **better information about a pattern**, never a recommendation about a person. "That's your call — this shows the pattern, not what to do about it" (market review §10) remains the refusal shape.

---

## 21. Scenario-specific first screens

Answer-shaped example outputs (the §6-of-market-review bar), one per required context. Format: headline · plain sentence · three evidence facts · historical-next-pattern (where justified) · confidence · limitation.

**1. Romantic uncertainty (change detected)**
> **The pattern did change.**
> This chat has been quieter and slower for about three weeks, after four steady months.
> - Messages fell from about 50 to 22 per week over the last three weeks.
> - Asha's typical reply moved from 15 minutes to 3 hours (38 vs. 24 replies).
> - You started 8 of the last 10 conversations; earlier it was even.
> **What usually happened next:** after the one earlier slowdown like this (in March), activity returned to its old level within two weeks.
> *Useful read — solid history, but only one similar earlier period.*
> *This describes timing and volume, not feelings — it can't say why.*

**2. Stable romantic relationship**
> **Steady, both ways.**
> The rhythm of this chat has barely moved in eight months, and keeping it going has been shared work.
> - Conversation starts: 26 vs. 24. Restarts after long pauses: 5 vs. 4.
> - Typical reply time has stayed near 30 minutes on both sides all year.
> - No month fell more than 20% below the chat's usual volume.
> **What usually happened next:** quiet stretches here have never lasted more than 3 days.
> *Strong read — long history, every signal agreeing.*
> *A steady pattern is a fact about messages, not a verdict on the relationship.*

**3. Drifting friendship**
> **Quieter — and staying quieter.**
> This chat has settled at a lower level than last year, on more than one measure.
> - Active days per month: 14 → 6 across the year's two halves.
> - Messages per active day: 21 → 12.
> - Conversation starts fell on both sides — this isn't one person going quiet.
> **What usually happened next:** no earlier stretch this quiet exists in this export to compare against.
> *Useful read — two seasons of history, three agreeing signals.*
> *Quieter contact in one chat is not a measure of the friendship — people also move conversations elsewhere.*

**4. Long-distance friendship (intermittent, recurring)**
> **On-and-off — and that's this chat's normal.**
> This friendship runs in bursts with long quiets in between, and it has come back from every quiet so far.
> - Five quiet stretches of 2+ weeks in three years; every one ended with a new conversation.
> - Restarts came from both sides: 3 from you, 2 from Sam.
> - Active stretches look alike each time: a few weeks of near-daily messages.
> **What usually happened next:** past quiets ended within 6 weeks, every time so far.
> *Strong read — five full cycles of history.*
> *A recurring rhythm describes the past; it doesn't promise the next restart.*

**5. Parent / adult child**
> **Contact here is episodic — bursts around a few periods, quiet between.**
> That shape has repeated for the two years in this export.
> - Most contact clusters in a few weeks around recurring dates; 70% of messages fall in 20% of weeks.
> - You sent the first message after 6 of the 8 long quiets.
> - Overall volume is unchanged year over year.
> *Useful read — clear repeating shape, moderate history.*
> *Who reaches out first often follows family roles and schedules; this counts messages, and family contact often runs through calls and visits this export can't see.*

**6. Intermittent family contact (estrangement-shaped — maximum restraint)**
> **This chat has stopped and restarted before.**
> Three long silences, three returns, over four years.
> - Silences ran 4, 9, and 6 months.
> - Each ended with a new conversation — twice started by you, once by them.
> - The current silence is at 5 months, within the range of the earlier ones.
> *Light read — few events, long spans.*
> *A history of returns is only history. It doesn't say whether or when contact resumes, and this export can't see contact happening anywhere else.*
> *(No "what usually happens next" line: forward framing is disabled for this shape [CR-12].)*

**7. Work coordination (unmarketed; coordination framing only)**
> **Follow-ups ran one way.**
> Most check-ins before a reply came from one side, at steady speed.
> - You followed up before a reply in 9 of 14 threads; the reverse happened twice.
> - Replies typically arrived within a working day, unchanged across the project.
> - Messages concentrate 9am–6pm weekdays.
> *Useful read.*
> *Who follows up usually reflects roles and workload, not anyone's attitude.*

**8. Insufficient data**
> **Not enough to read yet.**
> This export is too short for honest pattern reading — that's the answer, not a failure.
> - 11 days of messages; comparisons need about a month of eligible history.
> - 2 quiet stretches — too few to say what's usual.
> - Reply-time samples: 4 and 6 — below the reliability floor of 5 per period per person.
> **What usually happens next:** nothing can be said from 11 days, and it would be dishonest to pretend otherwise.
> *Light read by design.*
> *If the chat is older than this export, re-export with the full history for a real read.*

---

## 22. Product roadmap impact

This research **confirms the prior sequence and re-scopes its contents**. Changes from the context research's §19 sequence, with reasons:

- **Stage 8A — hero card for the top 3 NOW scenarios (unchanged in shape, sharpened in content).** One hero card synthesizing *pattern change + carried contact + unusual silence*, whichever is most evidenced for this export, with honest insufficiency as the fourth first-class state. All current-metric, neutral wording, §21 examples as the copy bar. **Addition from this document:** ship §11's silence card logic (percentile-as-counts + restart composition) inside 8A — it needs zero new analysis and is the single highest-value card.
- **Stage 8B — scenario-aware mapping across tabs (unchanged).** Changes→pattern-change, People→§12 hierarchy, Rhythm→silence/intermittency facts. Add the §12 five-label effort hierarchy here (aggregation logic only).
- **Stage 8C — optional goal/context selection (unchanged; still undecided B vs. C per context research).** This document mildly favors *goal* selection (§5.C there): goals map 1:1 to scenario families here, which now have defined evidence chains.
- **Stage 8D — historical analogs prototype (kept, gated).** §10's percentile-bucket design behind fixtures + comprehension test. If the comprehension test fails, analogs wait for Stage 9 rewording, not a method change.
- **Stage 9 — new analysis, in this order:** (1) intermittency classification (§14) — cheapest, most reassuring, lowest risk; (2) drift composite (§13); (3) time-of-day-stratified reply comparison (§15); (4) censored time-to-restart (K–M) upgrading §11 step 5; (5) P2 forecasting research (discrete-time survival) on donated-data corpus if §19 path 3 materializes; change-point models as offline validators only.
- **Stage 10 — event markers (§16), re-import comparison + within-person cross-chat placement (§17), friendship retention features; P3 projections only if P2 passes its gates.**

The one structural recommendation the prior documents lacked: **every stage's exit criterion now includes the scenario chain check** — each shipped card must have its §2 template filled in and its row in §7's matrix, or it doesn't ship.

---

## 23. Next implementation brief

Copy-paste for the next model (do not implement in this PR):

> You are working on the ChatSense repo. Read, in order: `docs/product/relationship-read-roadmap.md`, `docs/product/relationship-read-market-review.md`, `docs/product/relationship-context-research.md`, and `docs/product/scenario-evidence-research.md` (this document — its §7 matrix, §11–§12 designs, and §21 copy examples are your implementation spec).
>
> Create branch `product/human-relationship-read-stage-8a` from green `main`.
>
> **Build Stage 8A: one hero card on Overview supporting four scenario states, using existing metrics only:**
> 1. **Pattern change** (§7 row S1/S3): answer-shaped read over `earlyLate`/`recentPrior`/`notableChanges`.
> 2. **Carried contact** (§12): implement the five-label evidence hierarchy (balanced / mixed / consistently asymmetric / recently-becoming / insufficient) as a pure function over existing per-participant, per-period outputs.
> 3. **Unusual silence** (§11): percentile-rendered-as-counts + restart composition + staleness line + censoring wording, from `pauseSummary` fields.
> 4. **Honest insufficiency** (§21 example 8): a designed first-class state, never an error.
> The card shows whichever state has the strongest evidence for this export; when several qualify, prefer the priority order silence → change → carried-contact (acuteness order from §4).
>
> **Reuse, don't rebuild:** `relationship-dynamics.ts` outputs, `human-takeaway.ts` confidence machinery, contract v2.0 thresholds and sample minimums, `NARRATIVE_TAKEAWAY_SAFETY_LINE` mechanism. **New logic is mapping/aggregation only** — no new metrics, no analysis-math changes, no dependencies, no forecasting-gate changes, no content interpretation, no telemetry.
> **Do not implement:** intermittency classification, drift composite, analogs, K–M, stratified reply comparison, event markers, context wording packs, group pairwise reads, any probability or forward-looking claim beyond roadmap-§7 empirical past-tense baselines.
>
> **Copy rules:** relationship-neutral default wording (context research §20); §21 examples are the tone bar; frequencies as counts ("8 of 10"), never percentile/statistical jargon in Layers 1–2; every card carries its scenario-specific limitation line; family-shaped restraint (§21 example 6) applies whenever the intermittent-restart facts lead.
>
> **Tests:** unit tests per card state over synthetic fixtures (reuse `stage4_balanced_then_one_sided`, `activity_decline`, `long_silence`, `stage4_insufficient_export`; add fixtures where a state lacks one); extend `tests/helpers/narrative-safety.ts` scanning to every new label, template, and caveat; add the two-card consistency test (silence card and any rhythm wording must not contradict); keep parity untouched (no shared-metric changes).
>
> **Validation gates before 8B:** all §6 standards E1–E19 hold on the new surface (E1/E2/E3/E16/E17 are directly testable); the market-review §13 qualitative check (5–10 people, two questions) including ≥1 non-romantic scenario; no forbidden claim under any fixture, adversarial-content test still byte-identical.
>
> Run: `npm run lint && npm run typecheck && npm run test && npm run test:parity && npm run test:forecast-parity && npm run build`, plus viewport tests if the first screen changed. Open a **draft** PR titled "Stage 8A: Relationship Read MVP". Do not merge.

---

## Bibliography

Format: authors · year · title · source · link · evidence type · why it matters to ChatSense. **Established** = peer-reviewed or primary source. **Supported method** = standard statistical methodology, peer-reviewed origin. **Established (secondary)** = credible summary of established work. **Market/tooling fact** = official documentation. Cross-references [CR-n] point to the bibliography of `relationship-context-research.md` (Canary & Stafford maintenance [CR-3]; equity in friendship [CR-5, CR-6]; Surgeon General loneliness [CR-8]; family communication patterns [CR-9]; intergenerational ambivalence [CR-10]; estrangement [CR-11, CR-12]; excessive reassurance seeking [CR-13]; relational turbulence [CR-14]; partner surveillance [CR-15]; hyperpersonal model [CR-16, CR-17]; algorithm aversion / explanation effects [CR-18, CR-19]; network centrality [CR-20]; third-party consent [CR-21]; contextual integrity [CR-22]; competitor scan [CR-23]; group-CMC dominance [CR-26]; multi-party reply ambiguity [CR-27]) — those are not repeated here.

**Human communication timing and burstiness**

1. Barabási, A.-L. (2005). "The origin of bursts and heavy tails in human dynamics." *Nature* 435, 207–211. https://www.nature.com/articles/nature03459 — Established. Human communication inter-event times are heavy-tailed, not Poisson; the scientific backbone of §5.8/§14 and of treating "intermittent" as often-normal.
2. Goh, K.-I. & Barabási, A.-L. (2008). "Burstiness and memory in complex systems." *EPL* 81, 48002. https://iopscience.iop.org/article/10.1209/0295-5075/81/48002 — Established. Defines the burstiness coefficient B used (internally only) in §14.
3. Kim, E.-K. & Jo, H.-H. (2016). "Measuring burstiness for finite event sequences." *Physical Review E* 94, 032311. https://arxiv.org/abs/1604.01125 — Established. B is biased for short sequences (i.e., most chat exports); mandates the finite-size-corrected estimator in §5.8.

**Change detection**

4. Page, E. S. (1954). "Continuous inspection schemes." *Biometrika* 41(1/2), 100–115. https://doi.org/10.1093/biomet/41.1-2.100 — Supported method. CUSUM origin; evaluated and assigned to research-only in §5.3.
5. Gama, J., Žliobaitė, I., Bifet, A., Pechenizkiy, M. & Bouchachia, A. (2014). "A survey on concept drift adaptation." *ACM Computing Surveys* 46(4). https://dl.acm.org/doi/10.1145/2523813 — Supported method. Situates Page–Hinkley/stream detectors; explains why stream-monitoring framings fit poorly with static-export analysis.
6. Adams, R. P. & MacKay, D. J. C. (2007). "Bayesian Online Changepoint Detection." arXiv:0710.3742. https://arxiv.org/abs/0710.3742 — Supported method. The BOCPD reference for §5.3's research-validator role.
7. Killick, R., Fearnhead, P. & Eckley, I. A. (2012). "Optimal detection of changepoints with a linear computational cost." *JASA* 107(500), 1590–1598. https://www.tandfonline.com/doi/abs/10.1080/01621459.2012.737745 — Supported method. PELT; the strongest candidate if segmentation is ever promoted (§5.3, §9.7).
8. Lopez Bernal, J., Cummins, S. & Gasparrini, A. (2017). "Interrupted time series regression for the evaluation of public health interventions: a tutorial." *International Journal of Epidemiology* 46(1), 348–355. https://academic.oup.com/ije/article/46/1/348/2622842 — Supported method. The methodological template (and the causal-inference warnings) for §16's user-supplied event markers.

**Forecast evaluation and validation design**

9. Bergmeir, C. & Benítez, J. M. (2012). "On the use of cross-validation for time series predictor evaluation." *Information Sciences* 191, 192–213. https://www.sciencedirect.com/science/article/abs/pii/S0020025511006773 — Supported method. Chronological/blocked validation over random shuffles; grounds E11.
10. Tashman, L. J. (2000). "Out-of-sample tests of forecasting accuracy: an analysis and review." *International Journal of Forecasting* 16(4), 437–450. https://www.sciencedirect.com/science/article/abs/pii/S0169207000000650 — Supported method. Rolling-origin evaluation; the design the forecasting contract already implements.
11. Kooti, F., Aiello, L. M., Grbovic, M., Lerman, K. & Mantrach, A. (2015). "Evolution of conversations in the age of email overload." *WWW 2015*. https://arxiv.org/abs/1504.00704 — Established. 16B-email study: reply times are heavy-tailed (most replies fast, long tail slow) and load-dependent; grounds E2 and §15's insistence on quantiles.

**Chronemics: how people read timing**

12. Kalman, Y. M. & Rafaeli, S. (2011). "Online pauses and silence: chronemic expectancy violations in written CMC." *Communication Research* 38(1), 54–69. https://journals.sagepub.com/doi/10.1177/0093650210378229 — Established. Response latency and silence function as social cues that violate expectations and change evaluations; why silence cards must return timing facts, not confirm imagined meanings (§11, §15).
13. Tyler, J. R. & Tang, J. C. (2003). "When can I expect an email response? A study of rhythms in email usage." *ECSCW 2003*. https://link.springer.com/chapter/10.1007/978-94-010-0068-0_13 — Established. People form per-correspondent responsiveness expectations quickly and notice breakdowns; grounds E5's per-dyad baselines and the reality of the "is this silence unusual" question.

**Stability of personal communication patterns**

14. Saramäki, J., Leicht, E. A., López, E., Roberts, S. G. B., Reed-Tsochas, F. & Dunbar, R. I. M. (2014). "Persistence of social signatures in human communication." *PNAS* 111(3), 942–947. https://www.pnas.org/doi/10.1073/pnas.1308540110 — Established. Individual communication-allocation patterns are distinctive and persistent; justifies self-baselines (E15) and the §17 within-person framing.
15. Aledavood, T., López, E., Roberts, S. G. B., Reed-Tsochas, F., Moro, E., Dunbar, R. I. M. & Saramäki, J. (2015). "Daily rhythms in mobile telephone communication." *PLOS ONE* 10(9), e0138098. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0138098 — Established. Persistent individual daily rhythms; grounds §15's stratification requirement and the schedule-shift confounder.

**Friendship/relationship maintenance over time**

16. Roberts, S. G. B. & Dunbar, R. I. M. (2011). "The costs of family and friends: an 18-month longitudinal study of relationship maintenance and decay." *Evolution and Human Behavior* 32(3), 186–197. https://www.sciencedirect.com/science/article/abs/pii/S1090513810000966 — Established. Friendships decay without contact; family ties survive gaps — the empirical basis for §13's "decline ≠ meaning" split by relationship type.
17. Oswald, D. L. & Clark, E. M. (2003). "Best friends forever?: High school best friendships and the transition to college." *Personal Relationships* 10(2), 187–196. https://onlinelibrary.wiley.com/doi/10.1111/1475-6811.00045 — Established. Communication decline over a transition tracks friendship-quality decline; context for S15/S19.
18. Dailey, R. M., Pfiester, A., Jin, B., Beck, G. & Clark, G. (2009). "On-again/off-again dating relationships: How are they different from other dating relationships?" *Personal Relationships* 16(1), 23–47. https://onlinelibrary.wiley.com/doi/10.1111/j.1475-6811.2009.01208.x — Established. Romantic cycling is common (~1/3 of daters) and correlates with distress; cited in §14 *only as a boundary warning*: chat-rhythm labels must never import relationship-cycling judgments.

**Calibration and probability quality**

19. Brier, G. W. (1950). "Verification of forecasts expressed in terms of probability." *Monthly Weather Review* 78(1), 1–3. https://journals.ametsoc.org/view/journals/mwre/78/1/1520-0493_1950_078_0001_vofeit_2_0_co_2.xml — Supported method. The Brier score; already the contract's headline reply metric.
20. Naeini, M. P., Cooper, G. F. & Hauskrecht, M. (2015). "Obtaining well calibrated probabilities using Bayesian binning." *AAAI 2015*, 2901–2907. https://ojs.aaai.org/index.php/AAAI/article/view/9602 — Supported method. ECE's origin; the calibration measure the contract already requires.
21. Murphy, A. H. & Winkler, R. L. (1977). "Reliability of subjective probability forecasts of precipitation and temperature." *JRSS Series C* 26(1), 41–47. https://www.jstor.org/stable/2346866 — Established. Reliability-diagram tradition from weather forecasting — the field that solved consumer-facing calibrated uncertainty first.
22. Makridakis, S., Spiliotis, E. & Assimakopoulos, V. (2018). "The M4 Competition: Results, findings, conclusion and way forward." *International Journal of Forecasting* 34(4), 802–808. https://www.sciencedirect.com/science/article/abs/pii/S0169207018300785 — Established. Simple statistical baselines are hard to beat; pure-ML entries underperformed; grounds E12 and the gate's baseline-first design.
23. Gneiting, T. & Raftery, A. E. (2007). "Strictly proper scoring rules, prediction, and estimation." *JASA* 102(477), 359–378. https://www.tandfonline.com/doi/abs/10.1198/016214506000001437 — Supported method. Why Brier/log-loss are the right objectives and accuracy alone is not.

**Survival / time-to-event**

24. Kaplan, E. L. & Meier, P. (1958). "Nonparametric estimation from incomplete observations." *JASA* 53(282), 457–481. https://www.tandfonline.com/doi/abs/10.1080/01621459.1958.10501452 — Supported method. The censoring-correct estimator for time-to-restart (§5.4, §11 step 5).
25. Clark, T. G., Bradburn, M. J., Love, S. B. & Altman, D. G. (2003). "Survival analysis part I: basic concepts and first analyses." *British Journal of Cancer* 89, 232–238. https://www.nature.com/articles/6601118 — Established (secondary/tutorial). Accessible survival-analysis grounding for future implementers.
26. Fine, J. P. & Gray, R. J. (1999). "A proportional hazards model for the subdistribution of a competing risk." *JASA* 94(446), 496–509. https://www.tandfonline.com/doi/abs/10.1080/01621459.1999.10474144 — Supported method. Competing risks, assessed and assigned research-only in §5.4.
27. Singer, J. D. & Willett, J. B. (1993). "It's about time: using discrete-time survival analysis to study duration and the timing of events." *Journal of Educational Statistics* 18(2), 155–195. https://journals.sagepub.com/doi/10.3102/10769986018002155 — Supported method. The recommended P2 modeling frame (§18): logistic regression on person-period rows, censoring-native.
28. Angelopoulos, A. N. & Bates, S. (2021). "A gentle introduction to conformal prediction and distribution-free uncertainty quantification." arXiv:2107.07511. https://arxiv.org/abs/2107.07511 — Supported method. Distribution-free intervals; evaluated for P3 with the exchangeability caveat (§5.5).

**Robust statistics and time-series decomposition**

29. Cleveland, R. B., Cleveland, W. S., McRae, J. E. & Terpenning, I. (1990). "STL: a seasonal-trend decomposition procedure based on loess." *Journal of Official Statistics* 6(1), 3–73. https://www.scb.se/contentassets/ca21efb41fee47d293bbee5bf7be7fb3/stl-a-seasonal-trend-decomposition-procedure-based-on-loess.pdf — Supported method. Why decomposition needs ≥2 cycles; research-only verdict in §5.6.
30. Huber, P. J. (1981). *Robust Statistics.* Wiley. https://onlinelibrary.wiley.com/doi/book/10.1002/0471725250 — Supported method. Breakdown-point grounding for medians/MAD (§5.1, E1–E2).
31. Leys, C., Ley, C., Klein, O., Bernard, P. & Licata, L. (2013). "Detecting outliers: do not use standard deviation around the mean, use absolute deviation around the median." *Journal of Experimental Social Psychology* 49(4), 764–766. https://www.sciencedirect.com/science/article/abs/pii/S0022103113000668 — Established. MAD-based outlier detection — the shipped silence-anomaly design's published justification.
32. Wilcox, R. R. (2012). *Introduction to Robust Estimation and Hypothesis Testing* (3rd ed.). Academic Press. https://www.sciencedirect.com/book/9780123869838/introduction-to-robust-estimation-and-hypothesis-testing — Supported method. Trimmed means and robust comparison; research-side reference for §15.7.
33. Efron, B. (1979). "Bootstrap methods: another look at the jackknife." *Annals of Statistics* 7(1), 1–26. https://projecteuclid.org/journals/annals-of-statistics/volume-7/issue-1/Bootstrap-Methods-Another-Look-at-the-Jackknife/10.1214/aos/1176344552.full — Supported method. The bootstrap already used (deterministic-seed) in the forecasting gate.

**Uncertainty communication**

34. Gigerenzer, G. & Hoffrage, U. (1995). "How to improve Bayesian reasoning without instruction: frequency formats." *Psychological Review* 102(4), 684–704. https://psycnet.apa.org/doi/10.1037/0033-295X.102.4.684 — Established. Natural frequencies ("7 of 9") are understood better than probabilities/percentiles; the rendering rule throughout §11/§21.
35. van der Bles, A. M., van der Linden, S., Freeman, A. L. J., Mitchell, J., Galvao, A. B., Zaval, L. & Spiegelhalter, D. J. (2019). "Communicating uncertainty about facts, numbers and science." *Royal Society Open Science* 6, 181870. https://royalsocietypublishing.org/doi/10.1098/rsos.181870 — Established. Framework for communicating epistemic uncertainty; disclosing uncertainty (esp. numerically) does not generally erode trust — grounds §20's insufficiency-benefit row and E16.
36. Fernandes, M., Walls, L., Munson, S., Hullman, J. & Kay, M. (2018). "Uncertainty displays using quantile dotplots or CDFs improve transit decision-making." *CHI 2018*. https://dl.acm.org/doi/10.1145/3173574.3173718 — Established. Well-designed uncertainty displays improve real consumer decisions; the existence proof that uncertainty-forward products work (§5.9).

**Analog retrieval**

37. Berndt, D. J. & Clifford, J. (1994). "Using dynamic time warping to find patterns in time series." *KDD Workshop 1994*, 359–370. https://cdn.aaai.org/Workshops/1994/WS-94-03/WS94-03-031.pdf — Supported method. DTW reference; evaluated and rejected for §10.
38. Lorenz, E. N. (1969). "Atmospheric predictability as revealed by naturally occurring analogues." *Journal of the Atmospheric Sciences* 26(4), 636–646. https://journals.ametsoc.org/view/journals/atsc/26/4/1520-0469_1969_26_636_aparbn_2_0_co_2.xml — Established. The original analog-forecasting result: analogs are legitimate description but weak predictors without large analog libraries — §10's causality guard.

**Measurement hazards**

39. Rubin, D. C. & Baddeley, A. D. (1989). "Telescoping is not time compression: the effect of the elimination of response bias on temporal dating." *Memory & Cognition* 17, 653–661. https://link.springer.com/article/10.3758/BF03202626 — Established. Dating of remembered events is systematically biased (telescoping); §16's recall-bias mitigation.
40. Cliff, N. (1993). "Dominance statistics: ordinal analyses to answer ordinal questions." *Psychological Bulletin* 114(3), 494–509. https://psycnet.apa.org/doi/10.1037/0033-2909.114.3.494 — Supported method. Cliff's delta, the ordinal effect size recommended for research-side reply-time comparisons (§15.7, E10).
41. Gelman, A. & Loken, E. (2014). "The statistical crisis in science." *American Scientist* 102(6), 460–465. https://www.americanscientist.org/article/the-statistical-crisis-in-science — Established (secondary of the underlying 2013 paper). The garden of forking paths; grounds E19's multiple-comparison honesty when scanning metrics.
42. Benjamini, Y. & Hochberg, Y. (1995). "Controlling the false discovery rate." *JRSS Series B* 57(1), 289–300. https://www.jstor.org/stable/2346101 — Supported method. The standard correction if metric-scanning ever grows beyond E19's disclosure approach.

**Datasets and data donation**

43. Chen, T. & Kan, M.-Y. (2013). "Creating a live, public short message service corpus: the NUS SMS corpus." *Language Resources and Evaluation* 47, 299–335. https://link.springer.com/article/10.1007/s10579-012-9197-9 — Established. A public, timestamped mobile-messaging corpus; §19 path 2.
44. Kohne, J. & Montag, C. (2024). "ChatDashboard: a framework to collect, link, and process donated WhatsApp chat log data." *Behavior Research Methods* 56, 3658–3684. https://link.springer.com/article/10.3758/s13428-023-02276-1 — Established. WhatsApp-export donation is an established, ethics-reviewed research method; the realistic P2 validation route (§19 path 3).
45. Ohme, J. & Araujo, T. (2022). "Digital data donations: a quest for best practices." *Patterns* 3(4), 100467. https://www.sciencedirect.com/science/article/pii/S2666389922000411 — Established. Consent, privacy, and data-minimization best practices for donation studies; §19's ethical frame.

**Gaps flagged, not resolved:**
- No peer-reviewed study evaluates *consumer-facing* chat-pattern products; every claim about how ChatSense's outputs land emotionally is Product hypothesis pending the context research §18 experiments.
- No published base rates exist for restart-after-silence in dyadic messaging (the S6/S11 quantities); ChatSense computes them per-export, which is the correct design, but cross-export "typical" values must never be quoted until a donated-data corpus (§19) exists.
- The ghosting literature (LeFebvre; Freedman) establishes prevalence and psychology of unilateral cessation but offers no metadata-level signature — a deliberate omission here: any "ghosting detection" framing is forbidden regardless, and no citation would make it inferable.
- Cliff's-delta thresholds, analog bucket counts (terciles), and the ≥4-cycle intermittency floor are defensible starting choices, not validated constants; they are contract-owner decisions to tune against fixtures and donated data, and are marked Product hypothesis.

---

*End of baton. The scenarios are mapped, the methods are graded, the thresholds are named. Stage 8A is copy and mapping over shipped math — build the five cards, keep the boundary, and let "not enough data" stay an answer.*
