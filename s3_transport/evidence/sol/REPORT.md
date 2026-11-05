What this change does: Uses verified HTTPS POSTs for the frozen requests and requires matching settled first-pair debit evidence before the counted entry can reserve row three. The accepted A3 dispatcher is unchanged.

Verdict: focused PASS for immutable 2eb8e2f95b3950488891c794c160e0aef3d63ade. The prior escaped-credential blocker is fixed. This is adapter verification, not financial clearance or permission to send live requests.

Actual checks: 13 focused tests passed in probe.log, including nine inherited local TLS tests and four independent challenges. Every socket connection was guarded to reject non-loopback addresses. All credentials were synthetic.

- Quote-escaped credential reflection now refuses with no receipt. Direct raw reflection also refuses. An independent Unicode-escaped alphanumeric credential challenge is rejected; unicode-reflection.json records its synthetic bytes.
- The TLS fixture advertises seven more Content-Length bytes than it actually sends while its transmitted body is complete valid JSON. Adapter rejects it after one POST instead of archiving it as valid.
- An independent deadline challenge completes real local TLS and delays return from connect beyond the call deadline. Timeout occurs with zero POSTs, zero adapter sends and a permanently closed instance. tls-deadline.json records the result. The server-side reset traceback in probe.log is expected when the client closes before sending request bytes; it is not a test failure.
- Local fixtures verify exact frozen body/path/Host, correct provider-specific auth, and durable reserve before each POST. Redirect causes one terminal POST; lost response causes one terminal POST with reserve held. Source uses http.client directly with default certificate/hostname verification and no proxy, redirect, or retry mechanism.
- Unknown debit and balance mismatch stop at two requests with total reserve 28000 micro-USD; no row-three reserve. A matching settled pair permits row three. Settlement-reader provenance is explicitly trusted, rather than established by these synthetic tests.
- Independent BaseException crash in the settlement reader leaves authorization consumed, two valid attempts, and an incomplete ledger; a second run refuses. checkpoint-crash.json records inspection. This tests unwinding at the checkpoint, not an OS kill during arbitrary filesystem writes.
- Independent bypass of run_with_checkpoint still cannot send a third POST because the adapter interlock rejects it. secondary-interlock.json records that failure. The generic A3 dispatcher can reserve row three when deliberately used without the counted wrapper; the counted wrapper's tests establish no third reserve on unknown settlement.
- Missing financial pin refuses before state or network. The pin remains None.

Identity checks: HEAD equals the reviewed SHA; worktree clean. git diff --exit-code confirms dispatcher.py byte-identical to accepted 188fff410e35dfaaf9961b6f7cbe12bf6d20fba3 and frozen packet unchanged against 7ed874b7a3963e560d399b7c0046f5625a2e0757.

Not checked: live providers, actual credentials, account settlement provenance, financial clearance, adversarial native DNS stalls, or the broader accepted A3/A2 implementation. No reviewed-checkout changes, publishing, credential-store access, or paid endpoint calls.

Reproduce from the pinned checkout:
python3 -B /Users/parth/Projects/chatsense-s3-transport-coordination/sol-final/probe.py
