# S3 synthetic-reader protocol v1 — frozen proposal, NOT EXECUTED

26 October 2026. Scientific owner: Astra. Authority: [issue #38](https://github.com/parthganguly/chatsense/issues/38). This is a closed interpretation experiment on five fictional ChatSense cards. It is not a human study, an interview simulation, a reply predictor, a product release gate, or a continuation of Decision Lab v1.

## Decision and estimand

**PROCEED with this bounded design for owner review; REVISE / HOLD paid launch until the provider and execution gates below are satisfied.** No Jev or GLiDE request has been sent. No credentials, Keychain, balances or authenticated model catalogs have been accessed. No live dispatcher has been implemented. Authorization is requested separately after publication.

The estimand is each hosted decision service's distribution over the supplied, closed interpretations of each fixed card, conditional on modality, exact question wording and option order. “Synthetic reader” is shorthand for this task, not an empirical person or a cognitive simulation. Provider probabilities are neither frequencies of human misunderstandings nor calibrated probabilities about Ravi or Asha. Providers cannot furnish free-form interviews. Neither provider's confidence field is used as a scientific outcome.

The study can expose a model's unsupported inference, failure to distinguish absence of evidence from evidence of absence, or sensitivity to the instrument. It cannot show how often people misunderstand, prove motives or future replies, establish an effect of CSS/typography, certify accessibility, or satisfy #29's human comprehension gate. Five deliberately selected cards are a fixed panel, not a random sample. Repeated calls are technical repeats, not additional readers. There are no population tests, p-values, demographic personas, psychometric scores or “winning model” ranking.

## Immutable inputs

Accepted app code: `72eeb00d436d3a85a117fb8fced3cf7597b12d31`. Frozen P0 v2 packet: `56034b7dbff14b4fde3920cd14e80e7635ce8357`. Exactly five selected card PNGs and their exact UTF-8 `innerText` are copied, byte for byte, into `stimuli/`. `stimuli/manifest.json` gives canonical source paths, full hashes and byte sizes. No v1 image, export fixture, DOM, hidden label, summary, answer key or study hypothesis is provider input. No cropping, enlargement, OCR substitution, re-encoding or copy edits occur locally. The existing frozen packet remains unchanged.

| Card | State | PNG SHA-256 | Text SHA-256 |
|---|---|---|---|
| A | Pattern change | `eea78a25698389ab31dc52a232b7384b6165444157680f34219e171065c0b51f` | `8e77123a283e07a3bb03cc418c792d04aec95fbd764ee71dcebb2f6fed2e24d0` |
| B | Shared keeping-in-touch | `c8498e524874adf000a693c46a7e1a2154d6392e24759494f1de0bd3713f5adf` | `e8a3f104a27c56d1e91f2a3aac98f9c2819a33e6a9ca8af3b3d5bcc461e44cca` |
| C | Mixed measures | `70470d8b2a3ba4c7c738dd09088a1f05cd786ee2b07dcf375a607e23685ed602` | `a84f90be893c2c337014f44008c0bc37b77aa6d363931af50c7e0256ed20b4fa` |
| D | Unusual quiet / historical restarts | `56b2ac46dcaa48cfd11e229b462d6bd2ac1f8b6630ec965723dfecbdc7106816` | `d0712ba7660daadd1d429312c2959db589bc26647196d400073dbc00107a0608` |
| E | Insufficient evidence | `77f4339d31bc6a333b70b6c5f010e3b31c8882f063a29619f98d037f9c82082e` | `51328f28c947eef9f5d281985241353256fab282435ddf7d1109efee854c5f0f` |

The PNGs are 344 px wide and 500–656 px high, within both published image envelopes. The proposed primary arm uses the complete PNG; the paired semantic arm uses exactly the saved innerText, including line breaks, without an added final newline. Every request contains one card and nothing about another card. Provider-specific envelopes carry the same decoded payload. Images may be processed internally by each provider; the submitted bytes, not internal pixels, are verifiable. Image–text differences combine modality, recognition and presentation effects and cannot isolate typography, layout or a human visual experience.

## Instrument and conditions

`QUESTION-BANK.json` is the complete literal bank: 8 Choice questions per card, 40 distinct question/card items. It contains only questions, neutral option identifiers, options and the exact preregistered paraphrase. `EVALUATOR-KEY.json` is never sent to a provider. `QUESTIONS.md` is a readable rendering, not a second specification. All choices have 3 or 4 options. We use Choice throughout because a binary Noul “no” would conflate contradiction with lack of evidence. Score scales add no needed construct.

| Item | Purpose | Evaluator rule |
|---|---|---|
| q01 | Overall interpretation | Observed pattern or insufficiency, versus listed misreadings |
| q02 | Explicit factual positive control | Supported; exact displayed numbers |
| q03 | Plain factual negative control | Contradicted; reversed or incompatible displayed numbers |
| q04 | Motive attribution | Not determined; no observed reason is supplied |
| q05 | Future reply / D's 70% extrapolation | Not determined; history is not a forecast |
| q06 | Plausible ambiguity / overextended scope | Not determined; missing volume, exact equality, effort, currentness or full-history coverage |
| q07 | Second factual control | Supported; simple comparison or D's 10−7 arithmetic |
| q08 | Card-specific scope | Measurement, mixed counts, historical restarts or insufficient observations |

For q02–q07, “supports”, “contradicts” and “does not determine” mean evidential relations to the card. An unsupported claim can be true in the world; it is not thereby contradicted. An explicit statement that reasons are not measured does not establish the opposite motive. “Balanced band” does not mean exactly equal message totals. A mixed set of measures does not identify overall relationship effort. An export cutoff does not establish what happened after export. Sparse export history does not prove sparse full history. “Strong/Useful/Light read” labels are visible stimuli, but their semantics are not separately scored because the cards alone do not fully define them.

These are prompted, evidence-grounded classification tasks. They are deliberately not neutral measurements of spontaneous human first impressions: the question itself asks for a reading of the card, and the options expose possible interpretations. We avoid telling the model the expected answer, teaching a past-versus-future rule, supplying a persona, or placing “unsupported” in a model-facing question or option key. The synthetic nature is disclosed in the study report, not inserted as a behavioral instruction.

`CALL-PLAN.json` fixes 16 pairs of requests (one/provider), at most 32 requests and 256 decision distributions. Every provider receives identical semantic questions and options. All first readings are unconditioned; **no persona/context arm is included**.

| Condition | Cards, in order | Requests/provider | Change from U |
|---|---|---:|---|
| U | A B C D E | 5 | Primary complete PNG; standard question wording |
| T | E D C B A | 5 | Exact innerText in place of PNG only |
| R | D E | 2 | Byte-identical repeat of the corresponding U body |
| W | D E | 2 | Only the instruction string changes to the exact bank paraphrase |
| O | E D | 2 | Only option insertion order reverses; key-description associations, questions and question order unchanged |

D and E are prespecified stress cases because historical-to-future extrapolation and insufficient-to-zero confusion are primary product risks. Repeat/wording/order robustness is **not measured for A–C**. No extra repeat, replacement, selected “interesting” item or pilot expansion may be added after results. The proposed 32 requests are not the old 224-call harness. We will not import or run that harness.

The model sees opaque keys `k1`…`k4` and `q01`…`q08`, not roles or expected answers. With zero-based card index c and question index j, canonical option dN maps to `k(1+(N+c+j) mod option_count)`. Baseline insertion rotates the canonical option list left by (c+2j) modulo option count; O reverses that baseline insertion only. This counterbalances labels and positions cyclically across questions/cards while preserving provider pairing. With five cards it is not a complete Latin square, and labels or positions may still influence outputs. O directly tests position susceptibility on D/E. No general label-invariance claim is made. The exact per-item mappings and request hashes are in the offline wire manifest.

Both providers document independent evaluation of questions within a request. Bundling holds the eight-item bank fixed; independence and absence of cross-question influence are not empirically established. Per-question outputs are not independent replicates. No singleton ablation is included. The providers alternate which goes first in successive pairs; pairs are serialized. Condition order is fixed, not randomized: time/order and provider drift remain possible confounds. A run must finish within 60 minutes of first dispatch and stop rather than resume across sessions. T always follows U, which is a declared limitation of the modality contrast, not a learned human carryover effect.

## Output validation and denominators

Preserve the raw response, safe non-secret response headers, request/body hash, decoded stimulus hash, UTC times, requested and reported model, canonical served-model header, transport status, usage and provisional cost. Store response SHA-256, never authorization headers. Apply checks before normalizing to canonical option identifiers.

Require exactly eight expected answers; matching `type:choice`; exactly the option keys sent; finite real probabilities in [0,1]; sum within 1e-6 of 1; selected choice is an argmax within 1e-9. Booleans, strings, NaN/Infinity, omitted/extra options and invented keys fail. Do not clip or renormalize. A tie is reported as a tie, never resolved in favor of the key. Required usage fields must be nonnegative integers (not booleans). Unknown/missing model, usage, cost, retention or provenance fails the technical gate. Native confidence is archived if returned but neither compared nor used for stopping.

Plan denominators: 16 requests/provider, 128 decisions/provider, 32 requests/256 decisions total. U has 5 requests and 40 decisions/provider; T the same. Each R/W/O has 2 requests and 16 decisions/provider. U motive/reply support has **10 item probabilities/provider** (2 questions × 5 cards), not ten people. Primary factual controls are 15 items/provider (3 × 5). U+T control gate has 60 items total. Report attempted, valid, invalid, not-attempted separately against these fixed denominators, including scientifically stopped cells. Missing is never zero risk, a correct answer, or removed to improve a percentage. A paired difference exists only when both members validate; give available/planned pair counts. Never replace missing provider data with the deterministic baseline.

## Metrics, comparison and decision rules

Report every canonical option probability by card/provider/condition. Do not average away a risky card. The following are descriptive instrument scores, with engineering triage thresholds fixed before dispatch, not calibrated psychological thresholds:

* **Motive and reply support:** separately report P(supported) for q04 and q05 and their two-item mean for each card. P(contradicted) is separately reported: wrong denial is not correct uncertainty. P(not determined) is the intended evidence category.
* **Ambiguity/scope:** q06 probability on each category; q01/q08 mass on each preregistered class (including underreading, error and unsupported motive/prediction). These are not collapsed into one “accuracy” score.
* **Factual controls:** P(correct) for q02, q03 and q07; each must be ≥0.80 for the U+T scientific viability gate. Reporting only successful controls is prohibited.
* **Distance:** TV(p,q)=0.5×sum over the same canonical options of |p−q|. Compute image–text for all five cards, technical U–R and wording U–W and option-order U–O for D/E, per item. Also list signed changes in unsupported support. Cross-provider distances are descriptive disagreements between services, not calibrated effect sizes or evidence one service is more human-like.
* **Stability:** Any D/E item U–R TV >0.10 is a repeat-instability flag. It prevents a global GO, even if other findings appear useful. It does not establish an underlying model version change.

`controls/offline_contract.py` includes a **hand-authored deterministic card-reading/control rule** for this fixed panel: require the hash-bound text and specific number/headline/limitation anchors, then return the preregistered factual/scope categories; future and causal claims unsupported by those observations receive “not determined”. It produces point masses, not simulated people or a competitive general-purpose reader. Its rule table was authored with the cards; it is not a blinded accuracy baseline. Also test an always-undetermined rule. Their purpose is to show that explicit limitation detection or blanket abstention alone is not incremental evidence for a model study. Archive the rule outputs alongside model data, never as model responses. No generator earns a positive conclusion merely for repeating explicit cautions.

After authorized execution, classify in this priority order:

1. **INCONCLUSIVE FOR SYNTHETIC REVIEW** if any technical stop, missing planned distribution, failed U/T factual control, D/E repeat TV >0.10, or attribution/billing/retention problem occurs. State the failed card/item and distinguish semantic failure from possible image recognition failure. Partial outputs remain descriptive; no false PASS from a reduced denominator. A failed control is itself a diagnostic limitation of this instrument/service, not proof that ChatSense users misunderstand.
2. Otherwise **GO FOR SYNTHETIC REVIEW** if at least one qualifying item yields a specific hypothesis beyond the deterministic rule: (a) the same q04/q05/q06 item has P(supported) ≥0.25 in U for both providers; or (b) for D/E, one provider has P(supported) ≥0.25 on that item in both U and R; or (c) the same item has image–text TV ≥0.20 in both providers; or (d) the same D/E item has U–W or U–O TV ≥0.20 in both providers. All four triggers concern a reproducible, limited model/instrument observation. For (c)/(d), name the contrast, its direction and competing recognition/instrument explanations; do not call it a proven copy flaw. q01/q08 misreading masses are secondary diagnostics only and cannot independently trigger GO.
3. Otherwise **NO-GO FOR SYNTHETIC REVIEW**: this small panel did not demonstrate incremental actionable evidence beyond the rule. Do not change copy or spend more simply to obtain a signal. This is not a declaration that humans comprehend the product.

Scientific stopping after pair 10: once all U and T pairs validate, if any of the 60 factual-control probabilities is <0.80, stop before R/W/O (at most 20 calls), report INCONCLUSIVE. Do not choose replacements. Otherwise finish the six remaining prespecified pairs. A technical failure stops immediately at any pair, even before this checkpoint. A failed first image request never silently switches the campaign to text. Actual results do not change the frozen question bank or thresholds.

## Product consequences

| Signal location | Hypothesis to investigate in a separately approved next copy experiment |
|---|---|
| A motive/future or volume confusion | Put the measured reply-time comparison and its scope together; test whether the headline overextends beyond timing |
| B equal care / exact equality | Test an explicit count-focused heading to distinguish shared recorded initiation from equal feelings or exact message totals |
| C overall effort / fault | Test whether per-measure disagreement needs more prominence than a global “keeping-in-touch” label |
| D 7/10 → 70% / next reply | Test stronger adjacency of historical-count labeling to the restart statistic; never turn the count into a forecast |
| E insufficiency → zero contact/error | Test whether the observed one start/day and the missing evidence requirement should be paired more visibly |
| Image–text difference | Check recognition and presentation separately before attributing a language problem; no accessibility verdict |
| Wording/order effect | Repair the measurement instrument before drawing a product conclusion; model failure may be induced by the question |

These are candidate experiments, not findings. No card edits or additional provider calls are authorized by S3 results. A report must include a concrete item, quoted supplied option, probabilities, control status, replication scope, deterministic comparator and a falsifiable proposed copy comparison. No fabricated respondent quotations are permitted.

## Providers, budget and launch gates

`PROVIDER-CONTRACT.md` is part of this protocol, including unresolved public-document conflicts, retention and exact one-shot budget math. Native Opus's report is consultation evidence; Astra's adjudication in that contract controls the method. Authenticated current account availability and balances remain **unverified**, and no actual hosted version has been inferred from public docs or old smoke tests.

Proposal: 16 requests maximum/provider; Jev `jev-1.14.0`, **$0.05 maximum**; GLiDE `fastino/GLiDE`, **$0.40 maximum**; **$0.45 combined**, existing credits only. Jev has a documented versioned request ID. GLiDE has no published immutable weight version; report the service label, canonical served-model header and timestamps without claiming an exact weight pin. The owner must explicitly accept that limitation. No hidden probe calls: if authorized, the first A image pair is the capability check and remains in all attempt/data denominators. It is not discarded as warm-up. Both must accept the image contract before the next pair.

Authorization alone does not bypass unresolved gates. Before any paid request: resolve the GLiDE bill-basis conflict using current non-inference provider/account evidence; establish finite one-pass input/error bounds; document Jev's experimental-image support/opt-in and the residual stale-document conflict; verify account catalogs, balances, no auto-refill and any spend-limit conditions; accept Jev's unspecified retention duration; implement a new minimal one-shot dispatcher only after scope/spend authorization; have Sol verify provenance, crash/unknown-cost, no-retry and unsafe-resume attacks on that implementation. If a finite bound cannot be established, no inference may launch under this protocol. Multiplying an unknown cost by a safety factor does not establish a bound.

Any request/model/modality/cost/retention/question change requires a new version and explicit authorization of the changed scope; do not overwrite this frozen v1. If compatible image access cannot be established, return a newly frozen paired exact-text semantic-only protocol for approval, rather than claiming the present image experiment ran. The offline wire test is not a certified live dispatcher.

## Governance and completion

Freeze the protocol, 10 input files, bank, evaluator key, call plan, provider snapshots, offline controls and consultant receipts in one hashed inventory. Record the immutable Git commit in the publication report; the self-excluding freeze file contains the inventory hash. Frozen P0 v1/v2 and scientific strings remain unchanged. #29 P1 remains NOT_RUN/deferred, #32 remains historical G2r-2 FAIL, #33 remains separate. No human recruitment, private exports, Stage 8B changes, merges or production release.

Offline completion means a reviewable protocol with independent Sol falsification and all necessary revisions addressed, not API availability or empirical comprehension established. The next owner decision is explicit authorization of this exact conditional call plan and its limits. Until then: **S3 NOT EXECUTED**.
