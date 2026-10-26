# Astra disposition of independent Sol findings

Initial candidate: `a15fd9c6f190725d4569c9786fa75068e013f8e6`. Sol selected `gpt-6.1-sol` and independently inspected the exact stimuli, bank, source receipts and request bodies. Its original REVISE report and reproductions remain unchanged under `sol-review/`; this disposition does not replace them.

| Finding | Decision and bounded correction |
|---|---|
| P1 secondary q01/q08 independently trigger GO | Accepted. Limit distance-trigger eligibility to q02–q07 in both prose and classifier. Keep all eight descriptive distances and all-item repeat-instability checks. Six secondary-only T/W/O attack cases now require NO-GO. |
| P1 malformed canonical rows reach scorer | Accepted. Validate exact planned cells, exactly all eight items, exact canonical option sets, finite non-boolean real values in [0,1] and sum tolerance at scorer entry. Invalid or missing data returns INCONCLUSIVE without a KeyError. The technical flag defaults to false and only literal true permits further scoring. Add direct malformed-table attacks with an otherwise qualifying risk signal. |
| D/E motive questions introduce absent identities | Accepted. D now asks about “the other person … avoiding Ravi”; E asks whether “one person does not want to talk to the other.” Both instruction variants change, with readable-bank and wire hashes regenerated. The unknown-motive category stays fixed. Stimulus bytes do not change. |
| Three secondary error labels blur contradiction and uncertainty | Accepted. C/q01 d3, E/q01 d3 and E/q08 d3 use `contradicted_error`; C/q08 corruption/discard remains `unsupported_error`. Correct-option keys and primary thresholds do not change. |

The scoring thresholds, 16 requests/provider maximum, $0.05/$0.40 proposal, provider gates and fixed-panel limitations remain unchanged. The prospective dispatcher is still absent and uncertified. Native Opus's consultation remains preserved; its budget multipliers and excluded probe were explicitly adjudicated in PROVIDER-CONTRACT.md before Sol's review.

Root separately verified all 10 stimulus files against Git objects at P0 v2 commit `56034b7dbff14b4fde3920cd14e80e7635ce8357`, all 31 archived provider-source hashes, and that the change is confined to `docs/studies/s3/`. No application or P0 v1/v2 content changed. No API/credential access occurred. No new dependencies were installed; offline tests are hand-audited wire/scoring contract tests, not claims of live OpenAPI acceptance.

The revised substantive commit is submitted to Sol for independent recheck. Its later `sol-recheck/` receipt, not this author disposition, determines independent acceptance.
