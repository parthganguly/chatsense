# Counted S3 SystemOne transport

**Focused offline PASS. Paid preflight STOP.** The reviewed transport commit is `2eb8e2f95b3950488891c794c160e0aef3d63ade`. Its core dispatcher and scientific packet are byte-identical to the accepted A3 and frozen protocol revisions. [Sol review](evidence/sol/REPORT.md) · [Account preflight](evidence/account-preflight.json)

The adapter sends the exact frozen bytes to the two fixed HTTPS SystemOne hosts. It opens a fresh certificate-verified connection, disallows automatic reopening, checks the remaining deadline after TLS, sends one POST and rejects malformed or incomplete framing. No redirects or retries. A3 validates identity, usage, choices and retention. Sol found one credential-echo case on the first revision. The fix rejects both raw and JSON-escaped reflections before A3 archives a response.

The fixed-state entry point requires a reviewed, current financial receipt. Its digest is unset because the TypeSafe external-liability check is unresolved. Only after clearance can the operator supply the existing scoped credentials, canonical served-model allowlist and a trusted read-only settlement reader. This integration includes the settlement validator; it does not claim to have collected real provider settlement statements. The reader must supply attributable settled line items and independent exact before/after balances. A dashboard amount rounded to cents or a provisional token estimate alone cannot satisfy it. Unsupported rounding or ambiguous account activity stops the run.

The accepted dispatcher's clock dependency supplies an interception point between the durable, validated results for pair one and the reservation for row three. It always returns actual monotonic time. If reconciliation fails the run records a terminal failure, both reservations remain held, and a third POST is independently locked out at the transport. On checkpoint crash, the one-use marker prevents resume. Only an exact validated settlement is written. The tests use throwaway TLS certificates, loopback routing and synthetic auth.

Run from the repository root:

```sh
python3 -B -m unittest s3_transport.test_systemone -v
python3 -B s3_transport/evidence/sol/probe.py
```

A4 study calls: 0 Jev and 0 GLiDE. Intended spend: $0.05 plus $0.40. No real settlement, experimental result, or human-study finding exists.
