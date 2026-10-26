# A2 publication receipt

Final decision: **BLOCKED before inference**. Read the [Astra report](../2026-10-26-a2/ASTRA-A2-REPORT.md), [independent Sol report](REPORT.md), and [final phase/identity receipt](ASTRA-FINAL-RECEIPT.json).

Evidence was independently reviewed at `b664bc814eb5e37812b43e989cc4f9e98ba41789`. This directory only publishes the subsequent review; it does not change that evidence or frozen protocol `7ed874b7a3963e560d399b7c0046f5625a2e0757`.

Sol was dispatched through native Codex with explicit `gpt-6.1-sol` configuration, task `/root/sol_s3_a2_audit`. Its report preserves the limit of runtime model introspection. All 221 boolean assertions passed, with two additional inventory counts. Astra also reproduced the original audit successfully. The portable final audit was rerun by Sol on the same exact evidence revision. This acceptance applies to the BLOCKED report only.

To reproduce, provide an isolated repository checkout whose HEAD is exactly the evidence commit, then run this published `audit.py` with `--repo /absolute/path/to/evidence-checkout --output-dir /tmp/s3-a2-independent-reproduction`. It uses local Git objects and filesystem reads only. Do **not** rerun `catalog_check.py` as an offline test; that file performs the two credential-bearing catalog GETs and is not the independent audit.

`ARTIFACT-SHA256SUMS` is Sol's original manifest of its four artifacts. `EVIDENCE-SHA256SUMS` independently covers all 38 tracked A2 evidence files. The original A2 inventory covers 37 files and excludes itself. Publication metadata in this directory is anchored by the publication Git commit.

Native Opus dispatcher work, dispatcher falsification, paid inference and empirical scoring have not run. No launch PASS is implied.
