# S3 offline dispatcher

**S3 A3 OFFLINE — PASS.** Accepted revision [188fff4](https://github.com/parthganguly/chatsense/commit/188fff410e35dfaaf9961b6f7cbe12bf6d20fba3). Native Opus 5.5 repaired the final-window refusal. Fresh Sol 6.1 reviewed the dispatcher at [e8a4efa](https://github.com/parthganguly/chatsense/commit/e8a4efa9967f5832513298ff1f217170ae7abc82). The only subsequent code change adjusted a test that deliberately moves the start of the campaign clock. [Sol report](evidence/acceptance-188fff4/sol/REPORT.md) · [Final revision sign-off](evidence/acceptance-188fff4/sol/SIGNOFF-188fff4.md) · [Source and receipt hashes](evidence/acceptance-188fff4/INDEX.json)

The dispatcher checks the frozen 32-request order and bodies, records a durable reservation before each fake handoff, and consumes a one-use authorization independently of the ledger. A timeout, crash or missing reply keeps the reserve held. An attempt known to have stopped before handoff is recorded separately from an interrupted attempt that may have reached the provider. A second process or restarted run cannot continue the authorization.

The hour starts when the first supported fake receiver is entered. When time advances between two readings after reservation, the dispatcher allows up to 5 ms, capped at 1% of remaining time, for setup. It rechecks the actual numeric timeout and the deadline at receiver entry. Sol observed lawful handoffs with ten seconds left. A 20 ms pre-entry stall exhausted the allowance and suppressed the handoff. The original 3,600- and 3,601-second crossings also suppressed the second handoff and retained both reservations. A response arriving late on the last row is invalid.

From the repository root:

```sh
python3 -B -W error::ResourceWarning -m unittest discover -s s3_a3/tests -v
python3 -B -m unittest discover -s s3_a3/acceptance -v
python3 -B s3_a3/evidence/sol-031ccb5/normal-final-window.py
python3 -B s3_a3/evidence/first-review/astra-deadline.py
python3 -B s3_a3/tests/receiver_gap_check.py
python3 -B s3_a3/tests/mutation_check.py
```

The [dispatcher tests](evidence/acceptance-188fff4/dispatcher-tests.log), [observer tests](evidence/acceptance-188fff4/observer-tests.log), [mutation results](evidence/acceptance-188fff4/mutations.log), and [independent attack scripts and logs](evidence/acceptance-188fff4/sol) are archived. The CLI verifies all 32 requests and refuses live dispatch. Acceptance covers synchronous, trusted Python fakes on supported POSIX/CPython. A pause *after* receiver entry counts as time spent in an admitted call and may invalidate its reply. Process-kill tests do not establish physical power-loss or live network behavior.

**A2 PARTIALLY CLEARED · A4 NOT AUTHORIZED / 0 of 32 · A5 NOT RUN.** The existing limits are 16 Jev / $0.05 and 16 GLiDE / $0.40, $0.45 combined. The Jev key-to-funded-organization match and provider whole-attempt billing assurances still gate paid launch. [A2 disposition](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6574964389)
