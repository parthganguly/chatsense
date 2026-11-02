# Independent S3 A3 correction review — FAIL

Reviewer: fresh independent Sol reviewer, 2026-11-02. Signed off on the findings below; **A3 offline FAIL; no readiness sign-off**.

Reviewed immutable HEAD `6d74855ec1230f046fc3b25ba01aa5bdba85825b` in the detached sol-v2 checkout. Dispatcher SHA256 `5f6037c78b811c7fd179e2f69873737e1afc9efa963e64e94af4b53c12e0c285`. Freeze and inventory hashes match dispatcher constants; `load_frozen` independently verifies all 78 inventoried files. Checkout was clean. Only external evidence files were written. No study network, credentials, provider calls or publication.

## Confirmed blocking defects

1. **Final check is not actual handoff.** `dispatcher.py:532` checks the clock, sets state sent at 536, then calls the callback at 538. `replay.py` uses a Python thread trace at line 538 to model ordinary scheduler preemption between those operations. The fake itself only observes the clock and returns a valid local response. In separate cases the first send is observed at time 0 and the second is actually observed at exactly 3600 and 3601. Both second sends occur; both later receive RESPONSE_LATE. The ledger retains 28,000 microdollars, records two attempts and stops. Accounting is conservative, but post-hoc rejection cannot undo the forbidden handoff. `results.json` contains observed callback times, outcomes and inspected ledgers. The simulated clock jump represents elapsed scheduling time; it does not pretend that hours were physically waited.

2. **Timeout does not terminate a pending actual callback invocation.** `cancel_gap.py` uses a real 120ms scheduler pause at the same boundary and an actual 30ms timeout. `_handoff` returns at 30.64ms with zero callback calls. The callback is then first invoked at 122.74ms, after the timeout and return. `cancel-gap.json` records this. Setting daemon status and ignoring results abandons the worker; it does not cancel execution. This is an ordinary well-behaved fake and does not move a fake's send later from inside its body. A trusted transport contract must address this boundary honestly. A user-space check can itself be preempted; another final check without an atomic/cancellable handoff does not establish the strict physical guarantee.

3. **Strict metadata value safety is not established.** Arbitrary unknown header names are discarded, and CRLF values are rejected. But allowed named headers persist arbitrary matching content: `x-ratelimit-scope: secret_canary`, `x-ratelimit-code: authorization`, `x-request-id: Bearer SECRET_CANARY`, and `content-type: application/json; secret=SECRET_CANARY` all enter ledger safe_headers even on HTTP 429. See `results.json`. These are synthetic public canaries, not secrets. Request IDs are naturally arbitrary, so a printable allowlist is a narrower guarantee than secret-free metadata; named rate fields also have no semantic vocabulary allowlist. Under the owner's strict arbitrary-values requirement this fails. The contract's permitted request-ID storage should be reconciled explicitly with that stronger requirement.

## Controls and successful coverage

`timing.py` independently crosses the deadline during the already-synced second reservation at 3600 and 3601. Both suppress the second callback, emit NOT_SENT_TIME_LIMIT, retain the full 28,000 reserve and inspect consistently. Hung and late responses with a shortened 30ms test timeout stop without retry; subsequent fake completion cannot change the ledger. Whole-run elapsed includes frozen reads and full-sync operations, so it is not expected to equal the worker timeout.

`replay.py` injects InterruptedError into file and directory sync: zero handoffs, STATE_DIR_FAILED. This establishes safe refusal for these injected sync boundaries, not power-loss durability. Candidate hard EIO full-sync handling is also exercised by its own suite.

`attack.py` and `edges.py` adapt prior independent review cases, explicitly repointed to this checkout via REVIEW_REPO with an import-path assertion. They pass: all 32 exact outbound request bodies and authorized repeats, durable reservation visible to the fake, six SIGKILL boundaries (marker, before/after reserve, callback, before/after receipt), unknown retained reserve after possible send, missing ledger with no second attempt, competing processes with only one sender, duplicated/mutated plans, hostile response/header/body, retention and identity drift, usage bound, factual gate and ledger corruption. See attack.log and edges.log. This is reused independent coverage, not represented as newly authored cases.

The first-send anchor is set at the pre-worker timestamp (`t0 = now`), rather than actual callback observation. The same scheduling gap can therefore consume part of the window before the first observed callback; no claim of exact first-send anchoring is signed off.

## Replay

Run `python3 -B replay.py REPO_ROOT`, `python3 -B timing.py REPO_ROOT`, and `python3 -B cancel_gap.py REPO_ROOT`. Run the reused cases with `REVIEW_REPO=REPO_ROOT python3 -B attack.py` and similarly edges.py. The cancellation reproduction asserts the observed defect; replay records invariant_pass=false for both forbidden deadline sends. All fakes remain local.

Residuals: no live HTTP adapter exists; CLI refuses dispatch. Daemon workers can keep running in an embedding process and cannot be forcibly stopped by this implementation. SIGKILL is not a power-cut simulation. Offline tests cannot establish provider pricing, billing caps, retention, network cancellation or account readiness. No broad A2 audit was performed.

Candidate author suite: 43 tests PASS in 146.794s (candidate-tests.log). Acceptance suite: 5 tests PASS (acceptance.log). These supporting tests did not expose the independently reproduced handoff gap.
