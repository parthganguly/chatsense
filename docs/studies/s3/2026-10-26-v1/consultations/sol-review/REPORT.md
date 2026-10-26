# Independent Sol falsification — candidate a15fd9c

What this change does: This packet proposes a closed, fixed-panel comparison of Jev and GLiDE decision distributions on five fictional cards. It adds documentation, immutable stimuli and a safe offline wire/scoring test; it does not implement a live dispatcher.

**Verdict: REVISE the scientific freeze for findings 1 and 2. The bounded scientific design is acceptable once those scorer defects are repaired and the two wording corrections in finding 3 are frozen. PAID LAUNCH remains BLOCKED independently of this review.** No result here authorizes implementation, account access or inference.

Reviewed candidate: `a15fd9c6f190725d4569c9786fa75068e013f8e6`, in `/Users/parth/.codex/worktrees/s3-synthetic-protocol/whatsapp-analytics-ui`. Selected reviewer model: `gpt-6.1-sol`, as designated by the parent task; backend identity was not independently attested. Task ID: `/root/sol_s3_falsification`. `receipt.json` records all 61 candidate-file hashes and sizes. Every working-copy candidate file was verified byte-identical to its Git object before import. Audit artifacts are confined to this directory.

## Must fix

1. **Secondary items independently produce GO** — P1, `controls/offline_contract.py:160–166`, against `PROTOCOL.md:85`.
   - What this is: The protocol explicitly makes q01/q08 secondary diagnostics that cannot independently trigger GO.
   - Problem: Both distance loops iterate over every key item. Starting with a complete, correct, stable table and changing only A/q01 in T from d0=1 to d0=.7,d1=.3 for both providers returns GO. The same reproduction works for q08 and for D's W condition. All controls pass and there is no qualifying primary change.
   - Fix: Exclude q01/q08 from independent modality/wording/order GO triggers, retain their descriptive TV and all-item repeat checks, and add the four secondary-only negative cases. Explicitly state the eligible distance-item set in the protocol to remove ambiguity about factual controls.
   - If skipped: A final synthetic decision can contradict its preregistered priority rule.

2. **The offline scorer can return GO for malformed canonical rows** — P1, `controls/offline_contract.py:133–166`.
   - What this is: `classify()` checks outer cell membership but assumes valid inner decision vectors; `technical_ok` defaults to true. There is no enforced link from raw validation to these canonical rows.
   - Problem: Independent direct calls return GO for vectors summing to 1.3, boolean probabilities, negative d1, missing d2, an extra q09, and a NaN in A/T/q08 alongside a valid primary signal. Missing q04/q08 raises KeyError instead of returning INCONCLUSIVE. The raw-response validator does reject malformed raw responses; these are distinct entry points.
   - Fix: At scorer entry require exactly all planned cells, all eight expected item IDs, and exactly the bank's canonical option keys; require finite real values excluding booleans, range [0,1], and sum tolerance. Return INCONCLUSIVE on malformed/missing content before TV or thresholds. Add direct canonical-table attacks, rather than relying solely on raw-response tests.
   - If skipped: The safe offline control can issue a false positive decision from incomplete or invalid probabilities. This finding does not claim any live dispatcher exists or has failed.

## Should fix before the final bank is frozen

3. **D/E motive questions introduce identities absent from their card** — P2, `QUESTION-BANK.json:290–291,374–375` and generated `QUESTIONS.md`.
   - What this is: Each request contains just one card. D names Ravi but never Asha; E names neither person.
   - Problem: D/q04 names Asha; E/q04 names Asha and Ravi. Unknown remains the correct evidence answer, but this adds an avoidable irrelevant-entity reason to abstain and weakens the intended motive test.
   - Fix: The parent's proposed D wording, “The chat is quiet because the other person is avoiding Ravi,” and E wording, “The sparse export means one person does not want to talk to the other,” preserve unknown motive without hidden identity context. Change both instruction variants, regenerate the readable bank and wire hashes, and freeze the revision.
   - If skipped: A model can correctly abstain because identity is absent rather than because counts do not identify motives.

## Class-label clarification (bounded, secondary reporting)

4. **Some error distractors are more directly contradicted than their `unsupported_error` label suggests** — P2 clarification, `EVALUATOR-KEY.json:173,334,404`.
   C/q01 d3 says disagreement means calculations failed, while the card says the disagreement is the finding, “not a fault.” E/q01 d3 says the app failed to open the export, while a parsed export with counts and “not an error” is displayed. E/q08 d3 asserts otherwise sufficient history, directly contrary to all three displayed insufficiency thresholds. These options are not valid alternatives to d0. The correct-option keys do not need changing. To preserve the distinction between contradiction and lack of evidence in secondary reports, either use a contradicted-error class for these three or explicitly define `unsupported_error` as an error-theme bucket that includes contradicted claims and is not an evidential-uncertainty category. C/q08's claim of corruption/discard is genuinely unestablished by the card and need not change. This clarification does not alter the main q02–q07 truth keys or the GO criterion.

## Independent evidence and adversarial results

`independent_audit.py` reads frozen files with `git show`, constructs mappings and request bodies independently, compares them with all manifest hashes, authors its own ground-truth point masses and attacks the candidate functions. It does not call the author's `main()` or overwrite its control artifacts. `independent-results.json` records 146 checks/probes: 97 asserted integrity/manipulation checks and 49 observational scorer/validator probes. A returned GO in an attack is recorded as a finding, not labelled a passing safety test. No dependencies were installed.

- All 10 PNG/text inputs match manifest hashes, byte sizes and exact canonical files from P0v2 commit `56034b7dbff14b4fde3920cd14e80e7635ce8357`. All five complete PNGs were visually inspected. Their widths/heights are 344×546, 344×500, 344×520, 344×656 and 344×508; both published envelopes fit.
- All 31 public-source receipt SHA values and available byte sizes match their archived files. This verifies archived evidence integrity, not present-day account behavior or deployed weights.
- Independently rendered bytes match all 32 wire-manifest body hashes and all canonical-to-wire mappings. Question semantics pair exactly across providers. R preserves full U bytes including asset reference; W changes exactly eight instruction strings; O reverses criteria insertion while preserving key-description associations and question order. The cyclic mapping is correct, but does not establish label invariance or complete counterbalancing.
- Counts independently resolve to U=5, T=5, R/W/O=2 each per provider: 16 requests/128 decisions each, 32/256 total. U+T has 60 factual-control distributions. At the post-pair-10 stop, no more than 20 requests have been attempted. Provider-first order alternates as planned. Unattempted scientific-stop cells stay in planned denominators.
- Clean complete truth rows return NO-GO. Blanket abstention returns INCONCLUSIVE. A missing request returns INCONCLUSIVE. A fabricated future-support signal produces GO **for synthetic review**, which is the intended risk-detection behavior rather than a human comprehension PASS; a technical veto overrides it.
- Isolated support thresholds .249999/.25/.250001 give NO-GO/GO/GO; isolated modality TV .199999/.20/.200001 gives NO-GO/GO/GO; repeat TV .099999/.10/.100001 gives NO-GO/NO-GO/INCONCLUSIVE; factual correct mass .799999/.80/.800001 gives INCONCLUSIVE/NO-GO/NO-GO. Threshold isolation held U and T equal when probing support, to avoid accidentally activating the separate modality trigger.
- Raw validation rejects absent questions/options, NaN, Infinity, booleans, numeric strings, negative probabilities, invented selected choices, invalid usage, unknown models, retained GLiDE data, unallowlisted served identity and inconsistent token totals. A valid three-way tie is accepted without forcing the correct option. Reporting the tie remains a later reporting obligation; a raw `choice` alone must not be reported as a unique winner.
- `technical_ok=False` is a tested synthetic veto. The UNKNOWN/RESTARTED/COST_UNRESOLVED entries in the author's JSON are hand-written guard-spec examples, not tested reserve, persistence, crash, network, reconciliation or resume mechanisms. Neither this audit nor the author's test certifies any future dispatcher.

## Ground truth and construct audit

I read all 40 literal instructions, all options, both wording variants, the separated key, all five exact texts and all five PNGs. No supplied correct-option key needs changing. For every card, q01 and q08 have d0 as the uniquely best offered factual/scope interpretation. For every card, q02/q07 are supported (d0), q03 is contradicted (d1), and q04/q05/q06 are unknown (d2). This is a closed question bank, not neutral discovery of spontaneous impressions.

| Card | q01/q08 factual scope | q02 / q03 | q04 / q05 / q06 | q07 |
|---|---|---|---|---|
| A | Timing changed between recorded periods; no reason/future established | 5 min→1.5 h supports; reverse contradicts | Slower because lost interest / next relative reply time / fewer later messages all unknown | Asha 1.9 h→30 min supports a decrease |
| B | Sharing across recorded measures; balanced band | 76/76 supports; 112/40 contradicts | Equal caring / next-message equality / exact total-message equality all unknown | 4/4 restart counts supported |
| C | Unequal starts, other measures close to even | 112/40 supports; 76/76 contradicts | More caring / next sender / overall relationship effort all unknown | Unequal starts and equal restarts supported |
| D | Long recorded quiet; seven historical Ravi restarts | All ten ended supports; none ended contradicts | Avoidance / 70% next-sender forecast / still quiet at reading time all unknown | 10−7=3 non-Ravi restarts supported |
| E | Too few export observations, rather than zero contact or failed opening | One start supports; zero messages contradicts | Unwillingness / no future messages / full-history insufficiency all unknown | 0 eligible windows <4 required supported |

The important distinctions survive challenge: an explicit inability to identify reasons does not prove the opposite motive; past restart frequency does not establish a next-event probability; a balanced band does not mean exact message equality; an export does not establish complete or current history. A's response-event counts do not establish total-message volume. E's one start and one day of messages contradict zero-message claims. D's arithmetic only needs the explicit ten/seven counts, not a hidden Asha identity.

All q01/q08 distractors are weaker than d0; some are deliberately extreme and q01/q08 repeat close semantic content. q02–q07 share generic assessment wording and repeated categories. These features can make the task easy and encourage abstention; the packet already calls it prompted evidence classification and tests blanket abstention. It cannot support a spontaneous-human-reading estimate, psychometric measure or general comprehension accuracy claim. The explicit cautions are visible stimuli. Low-risk model outputs on them are not incremental evidence beyond the hand-authored, hash-bound key lookup. The deterministic rule is honestly disclosed as authored with this panel, not a blinded or general reader.

## Provider, budget and Opus adjudication

The two conditional arithmetic bounds are correct: Jev 65,536×$0.042/M=$0.002752512; reserve $.003×16=$.048 within $.05. GLiDE 8×65,536×$.04/M=$.02097152; reserve $.025×16=$.400. These calculations are **conditional reservations**, not demonstrated invoice caps. The archived OpenAPI explicitly calls `token_usage` input+output “billed”; pricing says outputs are free. `usage.input_tokens` sums internal passes, while the request schema says absent/false thinking is one pass. Current finite billing, error/abort/hold behavior and actual account balances remain unresolved. A multiplier does not solve that. The contract explicitly blocks launch until non-inference evidence resolves the premises, including an error-case finite bound; that is an honest and necessary limitation.

The saved Jev image guide explicitly names 1.13/1.14 and the opt-in header, while the saved model table lists Text and the concept page says text-only. It is reasonable to prepare the experimental proposed wire form while retaining this contradiction, provided actual acceptance is never claimed and authorization/account evidence remains required. The first counted A pair as a capability check is methodologically cleaner than Opus's excluded probe. If it fails, stopping with all attempts retained is coherent; T cannot rescue an image study.

GLiDE's request alias, response `glide` and canonical served-model header are provider assertions, not an immutable weight identity. The contract correctly requires an independently frozen prelaunch allowlist, a stable canonical label and explicit owner acceptance of absent weight pinning. No historical identifier, public doc or old smoke result verifies current served weights. Jev's versioned response is also an assertion rather than independent weight attestation.

Retention caveats are materially preserved: GLiDE default retention is indefinite and may train; explicit store:false plus retention-header verification is required and billing metadata persists. Jev has no fixed ordinary retention duration/per-call no-store flag documented; the archived privacy text prohibits input model training, while MCA §4.1 permits perpetual data use for telemetry/abuse/legal and §4.3 permits telemetry improvement use. It would be wrong to summarize this as ZDR or unconditional absence of all secondary processing. The final contract does not make that claim.

The native Opus receipt and result agree on session `c70d314a-8d97-4b52-abea-15aec7fb669b`, reported model `claude-opus-5-5` and completion. These are native-runtime receipt claims. Opus's larger reservations and proposed excluded capability probe are consultation recommendations, not binding safety proof; the contract explicitly replaces them. Opus's placeholder request bodies, alternate order suggestion and omit-thinking preflight also are not the frozen S3 implementation. The actual frozen contract's explicit thinking:false matches the archived request schema. No quoted example or source instruction was executed.

## Product consequences and implementation boundary

The useful attainable result is a bounded observation such as repeated D/q05 support for the supplied 70% forecast, followed by a separately approved historical-label-adjacency comparison. It is falsifiable: strengthen that adjacency, rerun an independently approved instrument, and test whether the prespecified support drops while factual controls remain viable. A/B/C/E have similarly specific scope hypotheses in the protocol. Image/text contrasts require recognition and presentation alternatives; wording/order contrasts call the instrument into question before the product. None establishes a human misunderstanding rate, a CSS effect, accessibility or release readiness. Shared provider outputs may reflect common training/design and are not independent human replications; the protocol avoids that inference.

The candidate commit changes 61 files exclusively under this study packet. Its only executable Python addition is `controls/offline_contract.py`: imports are base64/copy/hashlib/json/math/struct/pathlib; it renders bytes, reads local files, validates fake objects and writes offline JSON artifacts. There is no HTTP/socket, credential/environment/Keychain, subprocess, paid dispatcher, old-harness import, app edit or merge. The concrete claim that no live implementation beyond the permitted offline wire/scoring control was written is supported by this candidate diff and source inspection. This is not a forensic claim about unobserved activity elsewhere.

Not checked: current hosted acceptance, authenticated account/canonical identity, balances, billing reconciliation, finite invoice guarantees, or any future implementation. No network requests, provider inference, credential access, paid calls, external publication, app edits, merges or new user-owned tasks occurred in this audit.

**Final decision: REVISE 1 and 2, freeze the agreed motive wording, clarify the secondary error-theme labels, then request independent immutable-revision recheck. Scientific acceptance can be separated from PAID LAUNCH, which remains BLOCKED.**
