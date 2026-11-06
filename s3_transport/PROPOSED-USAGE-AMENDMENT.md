# Proposed GLiDE usage-counter amendment

**Owner approval pending; not activated.** `GLIDE_INDEPENDENT_TOKEN_USAGE = False` retains the current arithmetic-equality requirement. Only offline tests enable the proposal. A future paid campaign requires its own explicit authorization.

The retained October 16 successful SystemOne wire receipt reports `usage.input_tokens=137`, `usage.output_tokens=0`, and `token_usage=216`. It is a historical text-only availability smoke, not an S3 observation. Its file hash matches the previously published [A2 evidence](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6571321377); that prior investigation also corroborated the event in provider metadata. This task does not query that account again or rerun the historical request. [Evidence projection](evidence/usage-contract-20261107.json)

The current [OpenAPI](https://docs.fastino.ai/openapi.json) requires `usage`, `token_usage`, and both nested input/output fields. Each counter is an integer with minimum zero. Its prose describes `token_usage` as an input-plus-output billed total, but the schema supplies no cross-field equality constraint or numeric maximum. The [SystemOne guide](https://docs.fastino.ai/inference/systemone) has examples whose counters sum, and says input usage aggregates internal passes, including images. Neither those examples nor the total's description resolves the contradictory historical wire values. Exact equality of these three wire fields is empirically disproven as a universal invariant; the current underlying counter relationship remains uncertain.

## Exact owner-approvable change

Enable `GLIDE_INDEPENDENT_TOKEN_USAGE = True` to:

- Require the same `usage` object and both `input_tokens` / `output_tokens` fields, with exact integer types (no booleans, floats, strings, nulls or containers), nonnegative values and the existing `USAGE_MAX = 2**53 - 1` defensive bound.
- Still require exact-integer, nonnegative GLiDE `token_usage`; independently bound it by the same `USAGE_MAX`, without comparing it to either counter or their sum. This maximum is a local defensive limit, not a provider-documented maximum. Previously the sum rule could admit a total slightly above `USAGE_MAX`; the new independent bound is part of this pending amendment, not silently activated.
- Preserve GLiDE's `usage.input_tokens <= 524288` bound, Jev's `<= 65536` bound, and all other model, retention, eight-answer, probability, usage, transport, budget and scientific requirements.
- Keep provisional input cost as `usage.input_tokens * NANO_USD_PER_INPUT_TOKEN[provider]`. The historical GLiDE triple produces a **$0.00000548 estimate at the accepted current input rate**, not a historical settled charge. No estimate uses `token_usage` as a substitute input count or claims a settled debit.

Live and post-run checks already call the same `s3_a3.dispatcher._check_response`; no separate rule or label/count normalization is introduced. Canonical scoring, questions, cards and call order remain frozen at `7ed874b7a3963e560d399b7c0046f5625a2e0757`.

## Rejection diagnostics and historical limits

The draft adds one fixed `usage_failure` subtype to a rejected result while preserving `USAGE_INVALID` / `USAGE_BOUND` as the terminal codes. Subtypes identify missing/type/negative/excessive fields, the pending legacy sum mismatch, or the input bound. They come only from fixed internal field names and literals. No arbitrary provider strings, rejected counter values, response bodies or credentials are retained by this diagnostic. Validated counters and provisional cost are recorded only after every usage check passes.

November 7's discarded response could have failed any of the former generic usage subconditions. Its exact usage fields and rejection subtype remain **unknown**; this change does not prove equality caused that stop, recover the response, or retroactively accept it. All three campaigns remain separate, consumed and **INCONCLUSIVE**. Jev's repeated Card A factual-control failure remains a synthetic-model observation, not a human-comprehension finding.

Focused offline regression (fake providers only):

```sh
python3 -B -m unittest s3_transport.test_usage_compatibility s3_transport.test_model_compatibility s3_transport.test_postrun_compatibility -v
```
