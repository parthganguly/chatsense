# Independent delta attestation

**A3 OFFLINE PASS for exact `188fff410e35dfaaf9961b6f7cbe12bf6d20fba3`.** Signed: Sol independent reviewer, 2026-11-05.

I inspected `git diff e8a4efa9967f5832513298ff1f217170ae7abc82..188fff410e35dfaaf9961b6f7cbe12bf6d20fba3`. The sole changed path is `s3_a3/tests/mutation_check.py`; its sole hunk updates the source match and replacement for the existing “window anchored before receiver” mutation to match the current sampled-clock implementation. No production source, other test, fixture, frozen scientific input, or request manifest changed. The dispatcher blobs are byte-identical, with SHA-256 `b1a8b9797e831cf86ea330d3bbdaa54a19afe439a11e1762ebc7154c92357357`.

My earlier independent runtime PASS in REPORT.md therefore applies to both immutable revisions with identical runtime scope and limitations. The exact baseline receiver-entry anchoring regression passes in a disposable archive of 188fff410; running the corrected specific mutation in that same archive reports KILLED, meaning the deliberate early-anchor defect is detected. `delta.py` is portable reproduction code; `delta.log` records the exact diff, baseline test and mutation outputs. This is targeted independent verification, not a claim to have repeated Astra's full author/mutation suites.

Late final responses use the accurate unchanged outcome/stop pair `RESPONSE_LATE` / `TECHNICAL_FAILURE`, as asserted in window.py and reported in REPORT.md. Original candidate checkout remains unchanged; only external evidence and a disposable temporary archive were written. No provider traffic, credentials, network or real inference used.
