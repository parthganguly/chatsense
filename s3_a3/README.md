# S3 A3: offline dispatcher work

**Readiness: BLOCKED before native Opus implementation.** This branch starts at the exact scientific freeze `7ed874b7a3963e560d399b7c0046f5625a2e0757`. The owner authorized changing the order of A2 and A3 in [issue #38](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6574467140), not the paid launch conditions.

The [native invocation receipt](evidence/opus-invocation.json) records a five-hour Claude Code subscription quota rejection before any Opus-generated source or tool call. It is not proof of a successful Opus generation. No implementation candidate exists in this revision; Sol verification, dispatcher crash tests and any A3 PASS are outstanding.

## Preparatory acceptance code

Astra's [handoff observer](acceptance/handoff_oracle.py) is a test helper for the future fake transport. It compares each actual handoff against the frozen wire manifest and a normalized on-disk reservation provided by the test from an independent file read. The observer distinguishes legitimate protocol repeats from unauthorized duplicate attempts and detects reordered providers, changed bytes, missing/underfunded reservations and incorrect terminal counts. It neither sends nor reserves anything. Disk visibility alone is not fsync or power-loss proof.

Run from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s s3_a3/acceptance -v
```

[Five observer self-tests](evidence/oracle-self-tests.txt) exercise the helper, **not** the dispatcher. Native Opus must write failing-first implementation tests and an independently reviewable dispatcher. Then freeze the candidate before fresh Sol's adversarial review. Real provider transports, credential access, retries, unsafe resume and redirects are outside this offline implementation. No local reserve guarantees a provider debit.
