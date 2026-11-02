# S3 offline dispatcher

**A3 OFFLINE FAIL.** The dispatcher handed a request to the fake provider at 3,601 seconds when the preceding reservation crossed the frozen 60-minute deadline. A native Opus correction stopped at its five-hour subscription limit after writing regression tests. The default CLI refuses live dispatch. A2 billing assurances remain partially cleared and A4 has made zero provider calls.

The dispatcher validates 32 ordered request bodies and their decoded stimuli against the [scientific freeze](../docs/studies/s3/2026-10-26-v1/FREEZE.json). A separate one-use marker consumes the authorization. Each attempted handoff has an append-only ledger reservation of 3,000 microdollars for Jev or 25,000 for GLiDE. An interrupted attempt retains its reservation and cost remains unknown. Internal reservations do not establish an external billing bound. Read-only inspection assumes trusted local storage. The chain detects accidental corruption but cannot authenticate a fully rewritten history.

The evidence records three stages:

1. [Native Opus implementation receipt](evidence/opus-implementation.json) and [failing-first test](evidence/failing-first.txt). The first frozen candidate, `7ffae457b7b130867127b94f9df7e0903d3fd031`, passed [36 dispatcher tests](evidence/first-review/candidate1-author-tests.txt). Opus also recorded its [initial test and mutation results](evidence/dispatcher-tests.txt) with source hashes.
2. [Fresh Sol 6.1 review](evidence/first-review/REPORT.md) on that commit. It exercised process kills at reservation, transport and receipt boundaries, lost ledgers, concurrent senders, exact handoffs and authorized repeat rows. [Astra's failing deadline reproducer and disposition](evidence/first-review/DISPOSITION.md) supersede its PASS for the readiness decision. Subprocess kills test process crashes. They do not simulate a disk power failure.
3. [Native correction receipt](evidence/opus-correction.json) and [expanded failing suite](evidence/correction-red.txt). Opus wrote tests for expiration during reservation, late and hung replies, full-sync errors, concurrent directory creation and response header restrictions. The implementation needs correction before another independent review.

Run the current checks from the repository root:

```sh
python3 -B -W error::ResourceWarning -m unittest discover -s s3_a3/tests -v
python3 -B -m unittest discover -s s3_a3/acceptance -v
python3 -B s3_a3/evidence/first-review/astra-deadline.py
python3 -B s3_a3/dispatcher.py verify
```

The first and third commands are expected to fail on this revision. All transport in these tests is fake and local. The [owner's sequencing decision](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6574467140) authorizes offline work. Repair the reproduced failures with native Opus 5.5, freeze the corrected source and have fresh Sol 6.1 attack that SHA before assigning A3 PASS.
