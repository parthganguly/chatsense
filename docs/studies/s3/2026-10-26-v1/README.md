# S3 — Jev/GLiDE synthetic-reader protocol

**Status: OFFLINE PROPOSAL. No provider inference or human data.**

Start with [PROTOCOL.md](PROTOCOL.md), then [PROVIDER-CONTRACT.md](PROVIDER-CONTRACT.md). Literal stimuli are under `stimuli/`; full question text is in [QUESTIONS.md](QUESTIONS.md), generated from [QUESTION-BANK.json](QUESTION-BANK.json). The answer key is separate and forbidden from provider input. [CALL-PLAN.json](CALL-PLAN.json) specifies at most 32 one-shot requests, conditional on explicit owner authorization and unresolved launch gates.

The native Opus consultation and public-source receipts are under `consultations/` and `evidence/`. Independent Sol review and Astra's disposition will accompany the final freeze. The source P0 v2 commit is `56034b7dbff14b4fde3920cd14e80e7635ce8357`; the accepted app code is `72eeb00d436d3a85a117fb8fced3cf7597b12d31`.

Run the safe offline contract check from any directory:

```
python3 /absolute/path/to/this/packet/controls/offline_contract.py
```

It reads local files, renders provider request bytes in memory, verifies payload hashes, validates explicitly FAKE responses, and rewrites deterministic offline outputs. It contains no network, credential, subprocess or dispatcher code. Unknown-cost and restart entries in its output are specification examples, not tested live safety mechanisms. A separately reviewed new dispatcher is required after authorization; the old failed harness is not used.

The final `FREEZE.json` names a SHA-256 inventory that covers all packet files except itself and the inventory. The freeze-file hash and immutable commit appear in the issue publication, avoiding a circular self-hash. No run results belong inside the frozen protocol; any authorized execution gets a new, separate evidence directory.

The human study remains NOT_RUN/deferred. Synthetic evidence can prioritize a copy experiment; it cannot certify human comprehension, accessibility or a product release.
