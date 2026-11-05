# Counted S3 SystemOne transport

The [owner decision](https://github.com/parthganguly/chatsense/issues/38#issuecomment-6656790937) authorizes a single frozen campaign on existing prepaid credit. The dispatcher and scientific packet match their accepted revisions. [Original transport review](evidence/sol/REPORT.md) · [Dated account evidence](evidence/account-preflight.json)

The adapter sends the exact frozen bytes to the two fixed HTTPS SystemOne hosts. It opens a fresh certificate-verified connection, disallows automatic reopening, checks the remaining deadline after TLS, sends one POST and rejects malformed or incomplete framing. No redirects or retries. A3 validates identity, usage, choices and retention. Sol found one credential-echo case on the first revision. The fix rejects both raw and JSON-escaped reflections before A3 archives a response.

On this Mac, the native Fastino connection stalled while trying IPv6 addresses ahead of a reachable IPv4 address. The Fastino connector now tries IPv4 first, retains IPv6 fallback, and verifies TLS against the original host. The diagnostic script at `4c6c718` measures the original stdlib connection path. The corrected adapter completed a separate TLS-only check. [Mac diagnostic results](evidence/connectivity-20261105.json)

The fixed-state entry checks the SHA-256 of the 5 November 2026 account receipt accepted by the owner. After the first two durable valid results and before the next reservation, a trusted operator supplies any available settled statements, flags observed anomalies, or explicitly marks each unavailable statement as unverified. Estimates use the accepted dispatcher's token counts and input rates. Unverified entries go into `first-pair-estimates.json`. Only verified settled entries go into `first-pair-settlement.json`. A conflicting statement, reader failure or missing provider entry stops the campaign. The one-use authorization prevents replay after a crash.

Run from the repository root:

```sh
python3 -B -m unittest s3_transport.test_systemone -v
python3 -B s3_transport/evidence/sol/probe.py
```

The issue records live counts, results and charge evidence. [S3 study record](https://github.com/parthganguly/chatsense/issues/38)
