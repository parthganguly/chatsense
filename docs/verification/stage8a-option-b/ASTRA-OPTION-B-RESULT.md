# STAGE 8A OPTION B — P0 v2 BLOCKED

**Decision: BLOCKED. UX candidate: FAIL / REVISE. Human study: NOT_RUN.**

Authority: owner-approved [issue #35](https://github.com/parthganguly/chatsense/issues/35), 26 October 2026. This is an offline checkpoint report, not a claim that the requested UX-and-freeze workflow is complete. A focused [draft PR #36](https://github.com/parthganguly/chatsense/pull/36) exists, but two independently reproduced UI defects must be repaired. Both required native consultation routes have reached usage limits. No P0 v2 packet is frozen, no independent UX PASS exists, and no participants were contacted.

## Exact revisions and gate status

| Item | Evidence/status |
| --- | --- |
| App baseline | `2415a51385f60ff9e43ca2e26b66c8c9a7fd6267` |
| Audited candidate source | `8ee579420d56038800d0a4f453deb7e989d7325c` |
| U1 draft engineering handoff | Candidate delivered in draft PR #36 with before/after captures and tests; source change confined to `RelationshipReadCard.tsx` |
| U2 independent UX acceptance | **FAIL on recorded D1/D2 evidence; final Sol report interrupted. No PASS.** |
| U3 new P0 v2 freeze and independent packet review | **BLOCKED / NOT DONE**; no accepted source revision, selected v2 captures, freeze or packet sign-off |
| Original P0 v1 | `64efc6d0018106d0644dc620ffca8939ac50c088`, draft PR #34, unchanged |
| P1 / production / Stage 8B | Human sessions unauthorized; no merge/release; Stage 8B blocked |

Any later commit containing this report changes evidence/documentation only. The source and images assessed here remain pinned to the candidate above. A new repaired code revision requires a new independent review.

## Why the candidate is rejected

1. **D1: desktop limitation clipping.** At 1280x1000, the unusual-silence card's limitation ends at y851 while the main visible region ends at y823. Its final lines are hidden by the fixed navigation. The owner explicitly prohibited pushing the essential limitation below the fixed viewport. Accepting a scroll waiver is not an authorized completion path. Opus already measured a local spacing alternative; repair remains possible without changing the global shell or shrinking caveat text.
2. **D2: actual 200% text overflows.** At 320px+200%, the A/B confidence badge ends at x352.53 and its text at 332.53; C/D text reaches 327.52. The header must wrap or stack within the card. All five badges also leave their content bounds. The existing green viewport suite does not catch these actual element/text bounds.

The contrast repair itself is substantial and verified: limitation 11px/16px at 2.56:1 became 14px/20px at 10.35:1. The minimum measured text contrast is 7.58:1. Scientific strings, counts, dates, clocks, fixture bytes and hrefs are preserved. Readability improvements do not override the two acceptance failures and do not establish human comprehension.

See [Astra's readout of Sol's raw evidence](astra/ASTRA-READOUT-OF-SOL-EVIDENCE.md), [independent measurements](sol-partial/measurements.json), [desktop D failure](sol-partial/s8a-v1-c4-unusual-silence.desktop.partial-first-screen.png) and [320px+200% A failure](sol-partial/s8a-v1-c1-pattern-change.combined.partial-first-screen.png). The earlier implementer report's “UX engineering PASS” and “no clipping” language is superseded by this rejection; the original report is retained as historical evidence.

## Test and consultation receipts

- **Opus 5.5, real Claude Code 2.1.310**, model `claude-opus-5-5`, session `e765d760-fc19-499d-9ec7-a73c7d466b3e`. Verified actual local React/verification/accessibility skills; native receipt and exact prompt retained. Produced the candidate, pushed it and opened draft PR #36. Recorded full `npm run check` exit 0, viewport 40 passed/8 skipped and all five safety scans passing. Failing-first baseline: 33 failed/1 passed/8 skipped. Native invocation then ended with `429 usage_limit_reached`, not a successful terminal receipt.
- **Repair returned to native Opus**, session `ba8485b0-8048-4d97-aa17-52c71c2f151e`, exact bounded D1/D2 prompt retained. Invocation rejected with `429 usage_limit_reached`; tool reports reset at **1:00pm Asia/Calcutta, 26 October**. No repair execution or new code commit resulted. The JSON subtype says `success` but `is_error:true`, `terminal_reason:api_error` and the 429 govern interpretation.
- **Fresh Sol 6.1 Codex**, canonical agent `/root/sol_stage8a_optionb`, explicitly selected `gpt-6.1-sol`, fresh conversation and clean detached candidate. Independently installed, built, captured 35 card/mode records and 22 screenshots, checked fixture identity, ran safety/regression tests and reported D1/D2 to Astra. It then errored on a Codex usage limit with reported retry **Nov 1, 2026, 12:30pm** (timezone not supplied by that message). No final Sol review was produced. `sol-partial/` preserves all 48 files exactly. Astra does not impersonate Sol's final sign-off.
- **Astra scientific preparation:** 30 synthetic gate tests pass. Methods from “Sample and stopping” onward and 8 instrument/material files remain byte-identical to v1; blank-form/schema changes only identify v2. V1's 106-file freeze reverified and worktree remains clean. The v2 working draft is explicitly unaccepted/unfrozen and has 0 captured stimuli.

Native prompts/JSON receipts are in `astra/consultations/`; independent copy/hash receipt is `astra/sol-preservation-receipt.json`; test logs remain under `opus/logs/`, `sol-partial/` and `astra/`. Existing subscription/native tools were used; no model API key, paid external API, substitute model or external billing workaround was used. Listed model cost metadata is not evidence of an external API purchase.

## Screenshot hashes — failed candidate audit only

These complete images were independently captured by Sol through the actual synthetic file-input path in a 384x1800 viewport at DPR 1. They are 344px wide and retain the final link. **They are not the newly frozen P0 v2 stimulus set.** Astra visually inspected all five and the two failure images.

| Card | Native size | SHA-256 |
| --- | --- | --- |
| A pattern change |344x582|`175a97afae81de586c174b12906e4325d6205a91001d24a8a43724d6ecfeab06`|
| B carried balanced |344x536|`9ea6852193a568cd4efb4f23a515c1c55f4f68f433048d4f863bc336e3a189cc`|
| C carried mixed |344x560|`4c5758d73fba9f548866d0e4e86610d0517cf2582c2c8ff9f385275ab6950c28`|
| D unusual silence |344x696|`5577f1748ec6a18223599139c8dca462b42077c6123260ca3d65f25adfa785db`|
| E insufficient |344x544|`6ecba7a7a257524107630036d924bb595dc64afcd581128486c1404ddca317b9`|

[All 22 PNG hashes and dimensions](astra/sol-screenshot-hashes.json). `CHECKPOINT.json` inventories this failed-candidate evidence; it is not a study freeze. Its own hash and publication revision are recorded in the issue report.

## Science and v1 preservation

The original five binding gates remain: **N=10**, comprehension **>=8/10**; **zero** history-promise interpretations with all 10 assessable `NO_PROMISE`; usefulness per-card median **>=4 on >=2 cards**; median of ten participant creepiness medians **<=2**; own-chat interest from **>=5 distinct people**. No reduced-N PASS, favorable case deletion, imputation, replacement after exposure or relaxed ambiguity/missingness rule. Neutral consent, interview and coding rules are unchanged. Synthetic positive controls are only calculator controls and never human evidence.

V1 FREEZE.json SHA-256: `3356fcad8b3011237e4ed57b9eb0409d62458827ab5536fd226dcc86c8d9538f`.
V1 inventory SHA-256: `b279d2884a5e13768179b5b9b3c425e27070be668a654185eac2835c67950ad8`.
See `astra/v1-reverification.log`, `astra/SCIENCE-INVARIANTS.json` and synthetic preflight logs. PR #34 and its files were not overwritten or relabeled.

## Resume sequence and remaining owner decisions

1. When the required native model capacity becomes available, execute the prepared bounded Opus repair prompt. Keep 14px/20px caveats, correct D1/D2, preserve all strings/behavior and add actual geometry assertions. Run complete regressions/safety/captures and push a new immutable revision to the same draft PR.
2. Obtain a completed independent Sol UX PASS on that exact revision. If a defect remains, repeat the bounded Opus/Sol loop; never reuse this failed review as acceptance.
3. Only then Astra recaptures all five real cards with original fixtures/clocks, documents exact visual/source deltas and native-scale presentation, and creates a new versioned P0 v2 packet and hash inventory. Sol independently audits fixed packet/scoring consistency before P0 v2 READY. The proposed 384x1200 capture method remains a draft, not an executed freeze.
4. After readiness, P1 still needs a separate owner authorization naming the exact version, facilitator/two human coders/adjudicator, private withdrawal contact, encrypted-record custodian/access, compensation/voluntary recruitment choices and validated native-scale display. No owner waiver of D1/D2 is requested; the bounded repairs are already authorized. The pre-existing link-label/destination mismatch remains unchanged and outside this wording/behavior-preservation task.

There were 0 participants and 0 real responses. No private export, new predictive claim, S2 implementation, Stage 8B change, merge or production release occurred. The full requested workflow remains incomplete at U2/U3; this BLOCKED report records the genuine external capacity constraint and a reproducible handoff rather than declaring the first CSS repair ready.
