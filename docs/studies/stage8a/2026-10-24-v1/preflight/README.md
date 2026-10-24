# FAKE instrument controls — never participant evidence

Run locally with Python standard library:
`python3 -m unittest discover -s docs/studies/stage8a/2026-10-24-v1/preflight -p 'test_*.py' -v`

Blank schema controls: `node docs/studies/stage8a/2026-10-24-v1/preflight/validate-schema.mjs` (uses the existing repository Ajv dependency). Artificial outcome table: `python3 docs/studies/stage8a/2026-10-24-v1/preflight/run-report.py`. After freeze, verify without rewriting evidence: `python3 docs/studies/stage8a/2026-10-24-v1/preflight/verify-freeze.py`. To regenerate evidence after publication, copy to a new version first; never overwrite the frozen snapshot.

`gate.py` accepts only FAKE_INSTRUMENT_TEST and refuses real participant input. It checks manually supplied codes and arithmetic; it is not a natural-language scorer. The repeated artificial code vectors in test_gate.py are deliberately constructed algebra fixtures, not generated people or invented transcripts. Semantic clauses in the rubric are labeled FAKE. No response collection endpoint exists. Any instrument PASS is wrapped with human_study_decision=NOT_RUN and stage8b_authorized=false.

A single ambiguous motive response need not fail the entire study: the authority allows two incorrect participants out of ten. It must reduce the correct count. A single ambiguous **history** response does prevent a zero-promises PASS. The negative controls test both distinctions, rather than improperly tightening every mistake into zero-tolerance.

Later human analysis needs separate P1/P2 authorization and private infrastructure. Do not remove the FAKE-only guard to process study records in this public checkout. The formulas are transparent for independent private recomputation.

The raw response schema has richer evidence/reviewer fields than this minimal artificial aggregation interface. A mapping is never assumed to be a validated human-data pipeline. At P2, a second reviewer must verify each aggregated code against the privately locked raw record and rubric; booleans in these unit tests are not proof of real consent, independence or correct semantic coding.
