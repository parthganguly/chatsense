# Offline v2 operator notes

No live launcher, credential lookup, existing campaign namespace, or execution authorization is provided. Only fake-provider tests have run. A future approved operator must use a fresh explicitly authorized root and current approved financial preflight; never call the historical v1 run_counted entry.

The v2 runtime loads a private instance of the unchanged A3 module. The 16-row plan never reaches the disabled scientific checkpoint at index 17. Durability, receiver-entry deadlines, response checks and reservations are reused, not monkey-patched in the shared v1 module. The local transport is an isolated copy of the accepted TLS/IPv4-first transport with its send interlock moved from 2 to 3; historical financial state/launcher removed.

Use runtime.run(state, transport, reader) with the v2 transport primitive only after future execution authorization. Reader is called once, synchronously after the third durable VALID result and before reserve 4. Time waiting counts toward the existing deadline. EOF/invalid observations/positive accounting anomalies terminate before any fourth reserve or send. A crash leaves the namespace consumed. A successful checkpoint produces a hash-bound accounting file referenced from reserve 4.

Prepare this exact structured estimate-only format for a trusted operator reader when attributable settlements are unavailable (never claim it is settled zero):

```json
{"01-jev-U-A":{"state":"unverified"},"02-jev-T-A":{"state":"unverified"},"03-glide-U-A":{"state":"unverified"}}
```

For a manual reader, use json.loads(input()) once; no reprompt/retry on EOF or malformed JSON. Settled records must instead supply exact integer nano-USD before/after/debit, matched request body hash and account-evidence SHA256; equality with the input-only provisional estimate and reservation bound is retained. Aggregate wallet movement does not establish an attributable settled debit.

report.report(state) is read-only and may inspect a clean interrupted ledger prefix. Corrupt hashes/receipts are refused, not repaired. An open reserve is UNKNOWN_POTENTIALLY_BILLED; it retains its reserve and is never retried. No fake data is stored as real observations.

Offline verification:

```sh
PYTHONDONTWRITEBYTECODE=1 sandbox-exec -p '(version 1)(allow default)(deny network*)' python3 -B -m unittest s3_v2.test_v2 -v
```

build.py is an offline deterministic generator, not an execution command. Do not regenerate a published freeze or reuse a consumed state to change the study; a future approved scientific revision requires a separate freeze.
