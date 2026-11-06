# S3 THIRD CAMPAIGN — STOPPED

**Executed on the study Mac on 7 November 2026. Frozen scientific verdict: INCONCLUSIVE.** The dispatcher stopped on the second counted request with `TECHNICAL_FAILURE / USAGE_INVALID`. No third request, retry, replacement or fallback inference was sent.

| Provider | Counted attempts | Valid responses | Unattempted |
|---|---:|---:|---:|
| Jev `jev-1.14.0` | 1/16 | 1 | 15 |
| GLiDE `fastino/GLiDE` | 1/16 | 0 | 15 |
| Total | 2/32 | 1 | 30 |

Both HTTP POST writes were observed. The first counted pair was Card A in the frozen image condition. The ledger ran from **00:45:46 to 00:46:42 IST** (6 November 19:15:46–19:16:42 UTC), within the one-hour window. The one-use state is consumed.

## Execution and stop evidence

Authorization: [owner decision #6693083007](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6693083007). Campaign: `s3-6693083007`; distinct local namespace: `ChatSense-S3-6693083007`. Accepted runtime source: `91f7bd485803e9b540076fc2137c6349f086f8cb`, including the approved validator at `df8ba8f8a806fb6f2cbe02f8f64b63a25de9a8ce`. Operator namespace/evidence commit: [`34e8409fe9b0245a734358e243100d655a0860de`](https://github.com/parthganguly/chatsense/commit/34e8409fe9b0245a734358e243100d655a0860de). Scientific freeze: `7ed874b7a3963e560d399b7c0046f5625a2e0757`.

The only preparatory check was focused offline namespace isolation and consumed-state replay refusal; no broad review or new provider probe was performed. Accepted dispatcher, transport, financial controls and scientific packet were unchanged. The operator wrapper selected the separately authorized state directory.

- **Jev:** HTTP 200; body model `jev-1.14.0`; all eight typed answers and usage accepted; original receipt retained.
- **GLiDE:** HTTP 200; retained body-label diagnostic **`glide_v2`**; canonical served header **`fastino/GLiDE`**; retention header **`not-stored`**. The approved two-label check worked on this response. Execution reached usage validation after identity, retention and answer/probability checks, then returned **`USAGE_INVALID`**.
- This code means a required usage object/count or GLiDE `token_usage` type/total consistency check failed. The rejected body was not retained, so the exact malformed/missing/inconsistent usage field cannot be determined from the available evidence. No GLiDE answer vectors or usage totals are accepted or scored. Retained body SHA-256: `37aa6fb70310ff013389b0a5e7e3965840f2d0768e80c22fff27f684a5dc609b`; 1,594 bytes.
- The first-pair financial checkpoint was not reached because the pair was invalid. The frozen factual-control checkpoint after 20 valid requests was also not reached. No validator was relaxed after the failure.

[Ledger](ledger.jsonl) · [Execution receipt](execution-receipt.json) · [Canonical results](results.json) · [Jev raw receipt](01-01-jev-U-A.json)

## Actual synthetic-reader observation

Only **Jev, Card A, image condition** is available. Its canonical answer distributions were:

| Question / statement | Supported | Contradicted | Not determined |
|---|---:|---:|---:|
| q02: Ravi’s typical reply time increased from 5 minutes to 1.5 hours — true factual control | 0.02 | **0.98** | 0.00 |
| q03: Ravi’s reply time decreased from 1.5 hours to 5 minutes — false control | 0.00 | **1.00** | 0.00 |
| q04: Ravi slowed down because he lost interest | 0.00 | 0.02 | **0.98** |
| q05: Ravi will take longer than Asha to answer the next message | 0.48 | 0.02 | **0.50** |
| q06: The later period contained fewer messages | 0.03 | **0.68** | 0.29 |
| q07: Asha’s typical reply time decreased — derived factual control | **1.00** | 0.00 | 0.00 |

For q01 and q08, Jev assigned **1.00** to the general interpretation that recorded reply timing differed between periods. It nevertheless rejected the true numerical timing increase in q02, with correct-answer probability **0.02**, below the frozen 0.80 factual threshold. This is the same kind of factual-control failure observed separately in earlier campaigns; those records were not pooled or recalculated.

Jev largely withheld the unsupported motive claim (q04). It placed substantial support on an unsupported future-timing claim (q05), although “not determined” remained its selected option. It selected “contradicted” for the message-volume claim (q06), whereas the frozen key says the card does not determine it. These observations describe this synthetic response, not an empirical rate of human misunderstanding.

**Unavailable:** valid GLiDE comprehension, Cards B–E, image-versus-text differences, repeat consistency, wording/option-order sensitivity and Jev-versus-GLiDE comparisons. There is no complete paired dataset, so unchanged canonical scoring returns **INCONCLUSIVE**; neither GO nor NO-GO is earned. Human Stage 8A remains deferred and Stage 8B remains gated.

## Accounting

| Evidence | Jev | GLiDE |
|---|---|---|
| Accepted usage | 1,666 input + 347 output tokens | Unavailable: usage validation failed |
| Provisional input-cost estimate | **$0.000069972** | Unknown |
| Verified attributable settled debit | **Unverified** | **Unverified** |

Fastino’s read-only aggregate wallet observations changed from **$5.98087200** before dispatch to **$5.98077700** after the stop: an observed decrease of **$0.00009500**. Both observations reported overdraft unavailable. This is an aggregate account movement without a correlated request-level billing receipt; it is **not** claimed as a verified settled debit attributable to this campaign. Jev’s estimate is likewise not an actual debit. The complete combined cost remains unknown; the zero GLiDE sum over *valid responses* in the machine-readable results is not a claim of zero usage or charge.

The dispatcher retained $0.028 of internal reservations ($0.003 Jev + $0.025 GLiDE); reservations are not provider debits. The authorization’s intended budgets remain $0.05 + $0.40 = $0.45. No purchase, refill, enabled overdraft, intentional card charge, billing-setting change or support inquiry was made. No fresh TypeSafe login was attempted.

Both earlier campaigns remain separate, consumed and inconclusive. Their original ledgers still match their archived evidence byte-for-byte; their receipts/results and the scientific freeze are unchanged. PR #41 remains draft and unmerged. The third campaign is terminal and has not been reset.
