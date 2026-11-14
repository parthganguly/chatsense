# S3 V2 — FIRST-PRINCIPLES DESCRIPTIVE PILOT PROPOSAL

14 November 2026 · **APPROVED OFFLINE DESIGN — separately frozen v2; NOT authorized for inference.**

## Purpose and interpretation

Measure how Jev `jev-1.14.0` and the unpinned GLiDE service `fastino/GLiDE` distribute answers over specified interpretations of fixed cards. The unit is a service × request × item, not a person. Ask whether numerical extraction, modality, uncertainty, and historical-to-future interpretation account for the observed errors. No overall comprehension PASS, human prevalence estimate, calibrated behavioral probability, or product-release decision follows.

Reuse the five immutable PNG/text pairs from [S3 v1 at 7ed874b](https://github.com/parthganguly/chatsense/tree/7ed874b7a3963e560d399b7c0046f5625a2e0757/docs/studies/s3/2026-10-26-v1/stimuli). Submit only A, D and E in this smallest pilot; B and C stay available unchanged but receive **zero requests**, not missing planned observations. No new screenshots, OCR, cropping, card edits, personas, or fabricated respondents. Image inputs use the complete original PNG; text inputs use exact saved innerText bytes. Each request has one card and eight Choice items.

## Smallest useful schedule

Six paired conditions (12 requests) provide the minimum A/D/E image/text matrix. Four additional requests repeat A in both modalities so the main modality contrast is not based on one draw alone. The approved total is **16 requests: 8/provider, 128 item distributions; 64/provider**. This remains a diagnostic pilot, not an estimate of run-to-run variance.

The authoritative row order is Jev A image, Jev A text, GLiDE A image,
GLiDE A text, Jev D image, GLiDE D image, GLiDE E image, Jev E image,
Jev D text, GLiDE D text, GLiDE E text, Jev E text, Jev A text repeat,
GLiDE A text repeat, GLiDE A image repeat, Jev A image repeat.
Checkpoint after position 3 reconciles all three completed attempts before reserve 4.
Two early Jev requests precede GLiDE: provider/time remain confounded.

Serial execution, no retries or replacements, one separately authorized new namespace, 60-minute deadline. Request order is fixed in advance; A's repeat modality sequence reverses the first. All A/D/E image observations arrive by request 8 and their first text comparisons by request 12. No answer-dependent scheduling. All costs, including the first pair, count.

D/E repetitions, wording/order experiments and B/C are excluded. Do not infer their repeat stability or extend the schedule after seeing an interesting result.

## Literal instrument and evaluator key

One global instruction: **“Read the supplied card and select the answer that best fits each question.”** This is a separate first state string; the second state part is the unmodified card text or original PNG reference. Do not send this protocol, evaluator expectations, roles such as “control”, or the historical results.

Below, semicolon-separated options are complete alternatives; letters are evaluator identifiers only. No selected answer establishes truth outside the export. The reference column is an explicit card-reading interpretation, not a human ground truth or competitive model.

For A q02, q03 and q07, copy the complete question and option strings **verbatim** from the frozen v1 QUESTION-BANK.json. Their references are respectively supports, contradicts, supports. Keep their original opaque key assignments and insertion order. These are a wording bridge, not an identical-request replication: other bundled questions change.

For every new item below assign options a/b/c to k1/k2/k3, and rotate insertion left by (zero-based card index + question number - 1) mod 3, with A=0, D=3, E=4. Hold the resulting mapping and order identical across providers, modalities and repeats. Do not claim label/order invariance. The pre-execution manifest must show literal option text → key → position for every item.

### A: extraction, direction, prediction and measurement scope

| Item | Question | Alternatives a; b; c | Reference |
|---|---|---|---|
| q01 | Which earlier and later typical reply times does the card report for Ravi? | 5 minutes then 1.5 hours; 1.5 hours then 5 minutes; The card provides no typical reply times for Ravi | a |
| q02 | Frozen v1 A q02, verbatim | Frozen options, verbatim | supports |
| q03 | Frozen v1 A q03, verbatim | Frozen options, verbatim | contradicts |
| q04 | Which explanation for Ravi's changed reply timing does the card establish? | Loss of interest; A reason other than loss of interest; No reason is established by the card | c |
| q05 | What does the card establish about which person will take longer to answer the next message? | Ravi will take longer; Asha will take longer; It reports past typical times without establishing which person will take longer next | c |
| q06 | Which total-message-count comparison does the card report for the two periods? | Fewer total messages in the later period; At least as many total messages in the later period; It does not report total-message counts for the two periods | c |
| q07 | Frozen v1 A q07, verbatim | Frozen options, verbatim | supports |
| q08 | What are Ravi's displayed “20 and 20 observed events” attached to? | His typical reply-time measurements in the two periods; The total count of all messages in the two periods; The card does not attach those counts to a measurement | a |

q05 no longer asks whether history “supports” a forecast, which can mean weak probabilistic evidence or certainty. It asks what outcome the card establishes. It does **not** test whether past behavior is wholly irrelevant to forecasting. q06 now distinguishes the reported statistic from the unreported total: reply-event counts are not silently equated with all messages. q08 checks whether the service can identify what the counts label.

### D: a historical fraction versus a forecast

| Item | Question | Alternatives a; b; c | Reference |
|---|---|---|---|
| q01 | How many earlier day-plus quiet stretches in this export ended with a new message? | All 10; 7 of 10; None of the 10 | a |
| q02 | Who sent the first message after seven of those earlier stretches? | Ravi; Asha; The card does not identify the sender | a |
| q03 | What fraction of those ten historical restarts began with Ravi? | 7/10; 10/10; The card gives no fraction that can be calculated | a |
| q04 | Does the card report a calibrated probability that Ravi will restart the current quiet? | Yes, 70%; Yes, 100%; No calibrated probability for this quiet is reported | c |
| q05 | Does “all 10 earlier stretches ended” establish that the current quiet will end with a message? | Yes; It establishes the current quiet will never end; Neither future outcome is established | c |
| q06 | What does the absence of later messages in this export establish about contact outside this chat? | No outside contact occurred; Outside contact occurred; This export does not establish whether outside contact occurred | c |
| q07 | How does the displayed current quiet compare with the ten earlier stretches? | Longer than all ten; Shorter than all ten; Its duration cannot be compared with the ten | a |
| q08 | What reason for the current quiet does the card establish? | Lost interest; A reason other than lost interest; No reason is established | c |

The correct historical arithmetic in q03 and rejection of a *reported calibrated forecast* in q04 can coexist. A wrong q04 paired with correct q02/q03 is a forecast/scope interpretation signal; it is not an estimate that a human believes a 70% forecast. “Calibrated” is part of the instrument and may cue the intended distinction; success is not spontaneous understanding.

### E: insufficient evidence does not mean zero contact

| Item | Question | Alternatives a; b; c | Reference |
|---|---|---|---|
| q01 | How much message history does this card say the export contains? | One day; No messages; At least one year | a |
| q02 | How many conversation starts are counted? | One; Zero; At least three | a |
| q03 | How many eligible comparison windows are reported? | Zero; Four; The card does not give a count | a |
| q04 | Why is a period comparison unavailable here? | There are zero eligible windows and four are required; The measured behavior stayed exactly constant; The card reports a software failure | a |
| q05 | What does this export establish about contact outside its coverage? | No other contact exists; Other contact definitely exists; It does not establish whether other contact exists | c |
| q06 | What future contact outcome does the card establish? | Ravi will reply; Ravi will never reply; Neither outcome is established | c |
| q07 | What does “not enough here to read a pattern yet” describe? | Insufficient observations for the stated pattern measures; Proof that neither person cares; Proof that no conversation occurred | a |
| q08 | What does the card establish about why this export is short or sparse? | The relationship is ending; The relationship is healthy; Neither explanation is established | c |

These choices separate numerical facts, limits of measurement and claims outside the evidence. They remain prompted choices with unequal verbal complexity; an option-length or abstention heuristic may mimic comprehension. Report performance alongside an always-uncertain comparator and the stated deterministic reference, neither treated as an additional response.

## Reporting and meaningful contrasts

Publish all option probabilities and argmax/ties by provider, card and condition, with exact item wording, request/stimulus hashes and technical status. Do not round before analysis, renormalize, pool providers, collapse into a global accuracy number, or merge v1 campaigns into v2.

- **A:** compare q01 numeric extraction with q02/q03 direction and q07. Image failure with text recovery, repeated in both A rounds, is consistent with a modality/input-processing problem; it does not isolate OCR, layout or semantics. Failure in both modalities despite correct q01 points toward question/semantic mapping or service behavior. Mixed rounds leave the explanation unresolved.
- **D:** report historical arithmetic separately from forecast, motive and outside-contact assertions. Correct history plus an asserted future guarantee supplies a specific interpretation hypothesis.
- **E:** distinguish zero eligible windows from zero observed starts/messages and from absence of all contact. Correct displayed counts plus an overextended relationship claim supplies a scope hypothesis.
- Compute TV = 0.5 × sum |p−q| on matched options for each available image/text pair. For A also report each within-modality repeat TV. Report signed probability changes and whether the selected interpretation changes. No threshold is a scientific pass/fail and no p-values or population intervals are justified.
- A modality difference comparable to its own repeat difference is unresolved. Two similar rounds give limited repeat evidence only. D/E contrasts have no repeat-noise estimate. Any copy hypothesis must quote the item and card, show the distributions, and name at least one instrument/model explanation.

Eight planned modality contrasts: four/provider (A round 1, D, E, A round 2). Four planned repeat contrasts: two/provider (A image and A text). A contrast exists only when both complete validated responses are present. Report available/planned counts, even when zero.

**Technical completion:** 16/16 validated requests and their provenance recorded.
**Scientific usefulness:** an interpretable item-level observation or competing explanation with its limitations; neither accuracy nor a dramatic difference is required. An all-reference result means only that these services answered these prompted items as expected.
**Partial evidence:** any validated request remains reportable even if its mate or later requests are unavailable; report that it cannot support an unavailable contrast.
**Inconclusive for a particular question:** its necessary observations are missing, conflicting across A repeats, or do not distinguish the proposed explanations. This label does not erase other observations.

Maintain a fixed 16-request/128-item denominator. Every request is valid, technically invalid, attempted with unknown outcome, or not attempted, with reason. A malformed eight-answer response contributes zero accepted item vectors; it must not be partially scored. Missing is not correct, zero probability, or silently removed. “Scientific error” denotes disagreement with the preregistered reference and is retained in full.

## Stopping, accounting and minimal implementation delta

Scientific mistakes, low factual scores, abstention and repeat disagreement **never stop** this schedule. Stop globally on a transport failure/unknown outcome, malformed response, unexpected model identity/change, failed retention, invalid usage, provenance failure, time limit or exhausted accounting reserve. No retry, fallback, replacement, silent modality switch, or resume. Keep already validated responses. The first pair remains counted; a failure there may still prevent later contrasts, a declared technical limitation rather than a scientific exclusion.

Reuse existing transport, model/retention/answer/usage validation, durable reservations and one-use controls. Implement v2 separately: a new literal bank/manifest and plan loader, a v2 run policy without the factual-control termination, and a descriptive reporter that accepts partial validated results. Do not toggle or rewrite the frozen v1 scorer or import v2 into old consumed ledgers. Keep all eight-answer checks. Approval of this proposal is not evidence that this small execution delta exists or has been verified.

Use the already accepted estimate-only settlement path when attributable debits are unavailable, with exact structured “unverified” records prepared before execution; never label wallet movements “settled” merely to pass a checkpoint. A before/after wallet read is aggregate evidence, not a request invoice. Preserve input-only provisional estimates and all three usage counters. Rejected bodies remain unscored with existing bounded diagnostics/hash; adding quarantine retention is excluded from this minimal proposal.

Before any separately authorized execution, freeze the v2 bank, evaluator references, wire mappings, 16 request hashes and reuse links to immutable stimuli; verify reconstruction, partial reporting and no scientific stop using offline fixtures. Sol is needed only for the actual implementation delta, not another broad scientific review. No new framework or live capability probes.

## Counts and dated cost assumptions

| Quantity | Jev | GLiDE | Combined |
|---|---:|---:|---:|
| Maximum attempted requests | 8 | 8 | 16 |
| Existing reserve per request | $0.003 | $0.025 | — |
| Maximum internal reservations | $0.024 | $0.200 | **$0.224** |
| Historical ordinary input-bound calculation | $0.022020096 | $0.16777216 | $0.189792256 |

The last row uses the previously accepted, **dated** rates ($0.042/M and $0.04/M input), 65,536 and 524,288 input-token bounds, and zero output price. It is conditional arithmetic, not a current provider-enforced guarantee or an invoice ceiling. Independent counters do not resolve the actual billing basis.

Using November A's Jev input estimate (~$0.00007) and observed unattributed GLiDE wallet movement (~$0.000095) as rough proxies gives ~**$0.00132** for 16 requests. D/E, text, current pricing and actual settled charges are unverified; this is an order-of-magnitude planning estimate only. Keep the intended **$0.05 Jev / $0.40 GLiDE / $0.45 combined ceiling**, existing prepaid credits only, with stop-before-next-attempt reservation checks. Reserve totals are not permission to spend and do not enforce provider billing. Confirm existing account controls and applicable billing conditions before a separately authorized run; do not restart completed historical investigations.

## Requested decision and boundaries

This 16-request design and sequencing amendment are approved for isolated offline implementation by issue #38 comment 6877892005. Execution still requires separate explicit authorization identifying the final frozen v2 revision and spending limits. No inference, purchases/refills, card changes, human recruitment, merges or production changes are authorized here.

Why better than repeating v1: Jev A's informative text comparison arrives at request 2 instead of request 20; D/E are prioritized; repaired items distinguish evidence categories; scientific failures remain observations; and partial evidence survives technical stops. It tests specific competing explanations without pretending that decision-model outputs measure human comprehension. All three v1 campaigns remain separately consumed and inconclusive.

