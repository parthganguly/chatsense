# ASTRA 8A PRE-REG + READINESS: READY

**Decision: READY for P0, 24 October 2026.** This is a study-ready scientific protocol and frozen stimulus packet for owner review. **P1 is not authorized; no recruitment, human sessions, human coding or real responses occurred. P2 is NOT_RUN and Stage 8B remains blocked.** The timestamped Git commit and FREEZE.json hash published in issue #29 identify the immutable preregistration. A future change requires a new version, not an overwrite.

## Evidence supporting readiness

- [Preregistration](PREREGISTRATION.md) fixes target N=10, cyclic starting-card rotation, participant-level coding, ambiguity/missingness/exclusions, independent human review, rating anchors, aggregation, withdrawal handling and PASS/FAIL/INCONCLUSIVE rules before any observations. It retains the five binding gates: at least 8/10 comprehend motive/reply limits; zero history-as-promise interpretations; median usefulness at least 4 on at least two cards; median creepiness at most 2; at least five distinct people want at least one shown card for their own chat. No reduced-N PASS or 50-card pseudo-sample is allowed.
- [Stimulus review](STIMULUS-REVIEW.md) and [technical manifest](stimuli/manifest.json) ground every card in the actual unmodified production app from main `2415a51385f60ff9e43ca2e26b66c8c9a7fd6267`. Five synthetic files were imported through the real file input; fixed clocks prevent date drift. Screenshots, exact DOM text/HTML, computed results, source fixture IDs, build identity and hashes are preserved. Astra, Opus and Sol inspected the selected card images. The study uses only the complete DPR-1 card PNGs; context/HiDPI captures are not substitute stimuli.
- [Consent/recruitment kit](materials/CONSENT-AND-RECRUITMENT.md), [verbatim interview](materials/INTERVIEW.md), [rubric](materials/CODING-RUBRIC.md), [private recording workflow](materials/RECORDING-AND-REVIEW.md), [blank form](materials/BLANK-RESPONSE.json) and [schema](materials/response.schema.json) are prepared. Consent is neutral and the open questions precede the reply check. Two humans review private raw notes; models receive only nonidentifying aggregate/code-only material under this protocol. Public reporting contains no identifiable responses.
- [Artificial outcomes](preflight/control-results.json): explicit future-reply promise → FAIL; three ambiguous understandings → FAIL (7/10); ambiguous history → INCONCLUSIVE; missing rating → INCONCLUSIVE; high usefulness with false confidence → FAIL; N=9 → INCONCLUSIVE. A clear non-romantic control passes only the instrument, never a human-study gate. All controls are labeled FAKE; no realistic participant transcripts or empirical rates were generated.
- [Sol's final audit](consultations/sol/review.md#repair-verification--final-verdict-24-october-2026) passes after two pre-freeze consistency repairs. Sol independently constructed 43 checks, verified 40 capture and five fixture hashes, and found no demonstrated arithmetic overall false-PASS. [Thirty local tests](preflight/astra-checks.log) and [schema controls](preflight/schema-verification.txt) pass. These are software/instrument checks, not evidence of human comprehension.

## Attributable consultations and iteration

Opus used **native Claude Code 2.1.309**, requested and confirmed model `claude-opus-5-5`, session `78cbfd7f-32d7-4b76-9074-92275b00f4f8`. [Native receipt](consultations/opus-native-receipt.json), [technical report](consultations/opus-technical-report.md), and [bounded prompt](consultations/opus-prompt.txt) are retained. No product source changed, no agent was silently substituted, and no paid research-provider batch was started. The CLI's list-price cost accounting is not a payment receipt.

Sol used **native Codex**, model override `gpt-6.1-sol`, canonical task `/root/sol_stage8a_audit`, with a fresh context after Opus finished. [Dispatch record](consultations/dispatch-receipt.json), [independent expectations](consultations/sol/independent-expectations.md), [executable checks](consultations/sol/check.py), [results](consultations/sol/check-results.json), report and inspected-file hash receipts are preserved. The subagent interface exposes no provider/session UUID; none is invented.

[Amendment log](AMENDMENT-LOG.md): before data, Astra tightened prediction attribution/contradictions and fixed schema lint. Sol then identified (1) conflicting optional withdrawal-count retention versus denominator preservation, and (2) contradictory human/model access to raw notes. Both were repaired and independently rechecked: consent now clearly discloses minimal anonymous aggregate disposition counts, and human-only raw-note review/adjudication is consistent throughout. Sol's initial REVISE remains visible as history; its final PASS supersedes it. Opus's historical CommonJS lint error is resolved by the current .mjs helper; the original receipt is retained with this explanation.

## Verification and reproducibility

Production build succeeded, Next build ID `5gkiF1dwfx9VnG1NwZcVc`; all seven existing test suites and 21-fixture TypeScript parity passed. Final typecheck and lint pass with **zero errors and three unused-generator warnings** (verbatim generator copy). The product source, contracts and lockfile match the source base; only this preparation folder is added. Browser and temporary server stopped. No physical Android test is claimed. No claims are made about tests not run.

The stimulus SHA256SUMS verifies all 68 listed stimulus files. FREEZE.json inventories the complete final packet, excluding itself and nonartifact caches. Verify with `python3 docs/studies/stage8a/2026-10-24-v1/preflight/verify-freeze.py`. The issue result publishes FREEZE.json's own SHA-256 plus the immutable Git commit. Never rerun capture into this frozen folder; regenerate into a new version.

| Artifact | SHA-256 |
|---|---|
| Preregistration | `360259a6d8ef4bed4bed2afa25ae402320e27bb8c2fb50cde01a649fa9f70197` |
| Stimulus manifest | `e498e0f10e8c32770f96628d076d9efdd193d16e6829fff54d8e46d08f4dde24` |
| Built out/ file inventory | `56726b31d7aec53f5b771add50160bae131d98367ba464b9f40ba59ebe7a3e72` |
| A study PNG | `0e58f7f92a2e6d0b884d8ec8890ddd71f7accaf12283d1cd405e64217b85bf2d` |
| B study PNG | `2978a0c7b241fdf0f48fa6f52992ed744f65fd538f9d255d8d6c7bf2781eefa4` |
| C study PNG | `c8eb5ec8d14f7d373d5eee0b639f1080713ac3f1221bbf84e2f7c66915972d68` |
| D study PNG | `b2f76b41a6c686c47e65ed70c629d61b2401db44fb768bc3ea4e80314cc20958` |
| E study PNG | `a5f95556e6bfcab55c6cc2292ef313ecd85d6db4e3b0981919e70724e50f8b9c` |

## Known limits and copy decision

The rendered cards retain 11 px pale limitations (computed contrast 2.56:1), different border emphasis, Strong/Useful/Light read tags, awkward C conjunctions, and B/C summaries naming four measures while showing three evidence bullets. These are documented targets of testing. P0 READY does not certify readability, accessibility, product safety or population validity. Rereading remains available after the ten-second initial exposure. Actual visibility failure cannot be hidden by dropping or replacing a participant.

No motive/forecast assertion or factual contradiction in these five cards required a pre-study copy repair. **No repair PR is necessary for this frozen current-version pilot.** If the owner chooses to repair presentation before sessions, use a separate draft PR and re-freeze the rendered stimuli before P1; do not silently substitute improved images. Any later comprehension failure requires wording revision and a fresh test, not added predictive features. No S2 implementation, Stage 8B changes or production merge is included here.

## Exact owner decisions still required before P1

1. Explicit dated authorization to recruit and run sessions on this frozen version; P0 approval is not P1 approval.
2. Name the facilitator, two human first-pass reviewers (at least one independent of facilitation), and human adjudication arrangement.
3. Supply the private contact/withdrawal channel, encrypted storage location, access list and accountable custodian; fill the consent placeholders before distribution.
4. Fix compensation before contact: none or a stated small thank-you/voucher, never tied to favorable answers or completion. No purchase is authorized here.
5. Confirm any applicable local/institutional requirements for this recruitment setting; do not imply ethics approval that has not occurred.
6. Approve a noncoercive acquaintances-of-acquaintances recruitment route, confirm adult/quota screening, and schedule sessions/review within the consent's 14-day withdrawal and 30-day per-session deletion windows.
7. Verify native-scale display of the complete 344×up-to-634-pixel study PNGs with at least 800 usable CSS pixels of height. If the owner chooses a different visual presentation, amend and freeze before exposure.

Issue #29 stays open. The human study's definition of done has not been met; this result completes only the authorized preparation mandate.
