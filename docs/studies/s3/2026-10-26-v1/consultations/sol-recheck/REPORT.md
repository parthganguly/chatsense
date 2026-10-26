# Final independent Sol recheck

What this change does: The revised packet fixes the offline decision scorer, removes absent names from D/E motive questions and distinguishes contradicted error claims in secondary reporting. It remains a proposed offline protocol with no provider inference or live dispatcher.

**Scientific-protocol decision: PASS for immutable substantive candidate `7b6cb033100126e1b9a0874b22e1f683a315211b`. PAID LAUNCH: BLOCKED.** This accepts the bounded scientific design and its safe offline contract. It does not approve a future implementation, authenticated access or inference.

Reviewer selected model: `gpt-6.1-sol`, as designated by the parent task; no independent backend attestation. Task ID: `/root/sol_s3_falsification`. The final receipt names the commit and SHA-256/size of all 66 tracked candidate files. The original review and the intermediate ef435ace recheck are preserved unchanged.

## Repairs verified

1. q01/q08 cannot independently trigger GO through modality, wording or option-order distance. I independently tested all six secondary-only contrasts and confirmed NO-GO. The secondary-item repeat-instability veto remains active. The protocol explicitly limits distance-trigger eligibility to q02–q07, including factual controls that still satisfy the 0.80 gate.
2. The scorer revalidates exact outer cells, all eight items, exact option sets, finite nonboolean numeric values, [0,1] bounds and normalization before any threshold. All original malformed cases now return INCONCLUSIVE, including missing items/options, extra items, negative values, booleans, invalid sums and NaN combined with an otherwise valid GO signal. The technical flag defaults to false; only literal bool True permits scoring. Integers 1 and 0, strings, None and containers do not qualify as technical evidence.
3. D/q04 and E/q04 use the agreed anonymous participant wording in both instruction variants and the readable bank. Unknown remains the correct motive category. All 40 correct-option keys remain unchanged.
4. C/q01 d3 and E/q01/q08 d3 now use contradicted_error, while C/q08 corruption/discard remains unsupported_error. The protocol explains the distinction. No primary truth category changed.
5. The additional extreme-integer defect found in ef435ace is fixed. Positive and negative `10**1000` canonical values return INCONCLUSIVE even alongside a valid signal. Raw extreme-integer probabilities are rejected with the normal invalid-probability assertion; no float-conversion overflow occurs.

## Independent verification

`final_independent_recheck.py` records 169 independent checks/probes: 118 asserted integrity/manipulation/gate checks and 51 observational validator/scorer probes. `final-decision-checks.json` adds 39 asserted repair, threshold and delta checks. All asserted checks passed. The observations were checked against the intended outcomes; the original false-GO cases are repaired. I did not execute the author's main(), rewrite canonical controls or install dependencies. The saved author fixture contains 72 passing check records; that archival check is distinct from my independent tests.

The final revision after ef435ace changes exactly two offline-control files. No protocol, question, key, threshold, wire, stimulus, provider-contract, budget or launch-gate change is hidden in that final delta. The original a15fd9c-to-ef435ace delta is documented in the preserved intermediate evidence.

- All 10 stimuli still match their manifest hashes, byte sizes and exact P0v2 Git objects at `56034b7dbff14b4fde3920cd14e80e7635ce8357`.
- All 31 archived provider-document SHA receipts still match. Their content is unchanged from the initial review; this does not establish live provider/account behavior.
- All 32 independently rendered body hashes match the frozen wire manifest. R remains byte-identical to U; W changes only instructions; O changes only option insertion order. The 16-request/128-decision per-provider and 32/256 total denominators remain fixed.
- The original support, TV, repeat and factual-control threshold boundaries retain their specified outcomes. Technical uncertainty, invalid data and repeat instability take precedence over an attractive primary signal.
- Initial review artifact hashes match the recorded originals. Intermediate ef435ace files were retained and final outputs use separate names.

The hash-bound scientific objects are:

| File | SHA-256 |
|---|---|
| PROTOCOL.md | `3814388c94e515005da2f1ba38c400ab2494c3054740b9cdd0c148287e7c40ca` |
| PROVIDER-CONTRACT.md | `1f46a5ed5a3f294342f641682940bb5750902c76fd35365f32b91eaafac2c0c8` |
| QUESTION-BANK.json | `05faf910399e3f1362a4756d71c702dffe6f37175fefa5f01707d0ba809d7b2f` |
| EVALUATOR-KEY.json | `0338b8145e0574f53544a05625d9ba103db9766f23fe4f8504653fa2851f53f0` |
| CALL-PLAN.json | `1bf684eca1c78d823650152801a7f1275745c3c0b9eb7618d03efd32b17e0bc9` |
| controls/offline_contract.py | `5a2f2b2d11b5193e2757d2e714a5d0f5ccdbdd1179021f299184e3b949a4aa88` |
| controls/wire-manifest.json | `48bc5e490e93ad398012364ca45c5fd1b002e36b3ca9fd1161687fb5662c9a31` |

## Acceptance boundary

The initial scientific limitations remain operative: fixed selected cards, prompted closed choices, technical repeats rather than people, possible common provider biases, unverified question independence, fixed condition order, D/E-only robustness, and recognition/presentation confounding. GO is permission to investigate a bounded synthetic signal, not proof of human misunderstanding, a copy flaw, accessibility or product readiness. The deterministic point masses remain an openly hand-authored fixed-panel comparator.

The $0.05 Jev and $0.40 GLiDE proposal remains conditional on finite current billing and error bounds. GLiDE's input+output token_usage wording versus output-free pricing is unresolved. Actual hosted identities/account availability, experimental Jev image support, applicable retention, balances/holds/no-auto-refill, owner authorization and a separately implemented and independently tested dispatcher are still required. Canonical model labels do not attest immutable GLiDE weights. Unknown-cost/restart fixture entries remain specification examples, not crash or ledger tests.

No network request, provider inference, credential/environment/Keychain access, paid call, old-harness execution, app edit, merge, external publication or new user-owned task occurred in either recheck. The candidate remains confined to the study packet and safe offline tooling.

**Verdict: PASS scientific protocol at the exact commit and hashes above. PAID LAUNCH stays BLOCKED until its separate authorization, account/contract and new-dispatcher gates are satisfied.**
