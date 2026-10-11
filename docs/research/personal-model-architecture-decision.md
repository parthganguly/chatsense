# Decision: preserve the relationship reader; test behavioral transfer before psychometrics

Proposed research decision, 2026-10-10, [issue #24](https://github.com/parthganguly/chatsense/issues/24). **Documentation only; no implementation, merge, deployment or collection authorization.** Evidence and uncertainty: [review](psychometrics-evidence-review.md); feature boundaries: [construct map](construct-map.md); empirical gates: [protocol](validation-protocol.md).

2026-10-11 review: the [bounded evidence addendum](behavioural-transfer-evidence-addendum.md) supplies direct WhatsApp/Instagram dyadic-timing evidence, but no validated unseen-dyad or paired-person cross-medium transfer. It strengthens partner/sampling controls in the proposed study and leaves this decision table unchanged. Public-code discrepancies limit reuse of the preprint's exact thresholds; no new engineering follows.

## Recommendation

Keep ChatSense a complete, first-class relationship-pattern reader. The research supports investigating a separate optional self-observation layer; it does not justify shipping a psychological model from the currently available data. Selected WhatsApp metadata contains observable behavior but lacks independent criteria, representative context sampling and validated transfer. Personality inference is **plausible as a research hypothesis and unproven as a ChatSense capability**.

The strongest next experiment is narrow: does a person's timing history in other selected relationships improve prediction in an unseen relationship beyond context? This can fail cleanly without weakening the existing product. Even success would establish behavioral transfer, not a trait label or a psychological explanation.

## What continues unchanged

Preserve single-export import, Overview/Changes/People/Rhythm, Relationship Read, group participation limits and first-class insufficiency. Keep deterministic, content-independent computation in `@chatsense/core`; UI renders its outputs; Python remains research/reference. Preserve the existing behavioral/forecasting contracts, censoring and inline limitations. Forecasting remains blocked. No account, telemetry, remote model, content semantics, background observation or persistent profile is introduced.

Repository state verified on 2026-10-10: #21 is merged at `2415a51385f60ff9e43ca2e26b66c8c9a7fd6267`; #27 remains draft/unmerged, base `main`, head `008dc2d292f5203b461db578a7163f51953cf8c3`. This research neither changes nor re-verifies its engineering acceptance. #28 remains deferred. The master plan's July status and first-slice document's earlier PR status are historical; live issues/PRs establish the current sequencing. No existing roadmap file is rewritten by this proposal.

The human-comprehension study #29 remains a distinct prerequisite for Stage 8B. The [protocol appendix](validation-protocol.md#appendix-a--stage-8a-human-comprehension-packet-29) supplies consent, prompts, coding and proposed registration details; rendered-stimulus capture and actual sessions remain outstanding. Research documents do not satisfy that gate.

## Which engineering has scientific justification?

The existing descriptive measures have reproducible meanings independent of personality inference. A future **per-export evidence table** could also have a defensible factual meaning: selected self identity, one row per explicitly declared conversation, exact denominators, coverage and unavailable/insufficient states. It would reuse existing typed measurements and the internal projection reviewed under #27. That is sufficient scientific justification for descriptive computation, **not authority to start #28 or merge #27**. It still needs owner-reviewed selection, duplicates, lifecycle/privacy and comprehension design.

No new psychological feature in this review is ready for production engineering. A new platform adapter has no validated cross-medium semantics merely because both sources contain timestamps. Full BFI-2 is a possible independently measured research criterion; adding it to a commercial product requires permission and a separate consent/interpretation design. It must never masquerade as a score inferred from chat behavior.

## Conditional architecture if evidence eventually warrants an extension

Keep three conceptual layers distinct; this is a boundary proposal, not an implementation plan:

| Layer | Inputs and outputs | Gate |
|---|---|---|
| Existing relationship analysis | One export → deterministic counts, timing, changes and bounded narrative | Existing contracts, fixtures, parity and human-comprehension gates |
| Optional selected-export observation | Explicit self/conversation selection + existing typed per-export analysis → separate rows with provenance and exclusions | #27 owner merge decision and separately approved #28 design; no pooled score or increased confidence from row count |
| Research-only inference | Consented cohort metadata + independent instruments/context → versioned research estimates, uncertainty and abstentions | Preregistration, privacy/ethics, reliable measurement, external incremental validation and replication; any product interpretation needs a new approval |

Production output must not silently load research models. Any later model must specify its target construct, population, training provenance, validated source capabilities, units, uncertainty, missingness and abstention rules. When context differs, preserve contradictory observations rather than forcing them into a stable persona. Persistence would require a separate encryption/key/deletion/backups/shared-device design and revision of the current no-persistence promise. This review introduces no storage schema, service, adapter or model API.

## How would we know a personal model is useful?

It must answer a question better than counted history or an optional questionnaire, with a benefit large enough to justify the inference and privacy burden. An explanatory story that feels accurate is insufficient.

Require independent construct criteria, convergent and discriminant validity, reliable features across time, held-out people/dyads and relevant media, raw prediction errors and calibration, and external replication. Compare context-only, descriptive-history and questionnaire-only baselines. Assess selective coverage: a model that succeeds only after excluding most users is not a generally useful feature. A model predicting a later behavior well can still be useful **without** calling it personality; correlation with a questionnaire does not establish causal explanation.

After scientific validation, run a separately registered human comparison of descriptive evidence versus the proposed interpretation, preferably randomized with equal evidence availability. Primary benefits should be correct understanding and actionable self-observation chosen by the user, not engagement or perceived flattery; measure overtrust, distress and compulsive rechecking alongside usefulness. Freeze a meaningful benefit threshold before outcomes. This future experiment is not part of #29 and cannot be replaced by ratings from the development team.

## Smallest defensible next experiments and unresolved questions

1. Complete #29 using the existing five synthetic rendered scenarios and 8–10 actual adults. It needs no private exports and immediately tests whether the current product is understood. Freeze stimuli/coding before sessions.
2. Subject to independent privacy/ethics review, run F1: a target of 60 completed focal adults from up to 80 recruits, three consenting dyads sought per person, eight weeks, explicit coverage and held-out-dyad/time evaluation. The main outcome is feasibility and behavioral transfer, not a Big Five score. The protocol gives arithmetic, stopping and non-success states.
3. Only if feasible, plan a substantially larger independently held-out criterion study. The 400-development/400-external-test envelope is provisional pending simulations for incremental effects and dependency. A cross-platform cohort comes later, after real source definitions and consent boundaries are known.

Questions that could change this recommendation: How much actor information survives partner and schedule controls? How often can adults supply enough distinct mutually consented dyads without severe selection? Do candidate features add anything beyond asking the user? Does independent score calibration survive a new country/language/device/cohort? Are reliable behavior differences stable across medium changes or specific to the medium? Can users understand uncertainty without overreading it?

## Decision table

| Decision | Candidate | Evidence and condition |
|---|---|---|
| **PROCEED** | Preserve and evaluate the existing relationship reader | Direct counting is supportable; run #29 before Stage 8B. No new personality claim is needed. |
| **PROCEED** | Source audit, preregistration preparation and synthetic measurement checks | Necessary research work, authorized by #24; no human results or private data implied. |
| **EXPERIMENT** | Context-conditioned cross-dyad behavioral stability | S5–S8 provide a rationale, not ChatSense validation; F1 can falsify useful transfer. |
| **EXPERIMENT** | Optional independent questionnaire criteria and incremental Extraversion research | S1–S4/S14 provide limited convergent evidence; rights, consent, powered design and external evaluation first. |
| **DEFER** | User-facing selected-export evidence table | Descriptive semantics are defensible, but #28 remains deferred and its privacy/duplicate/comprehension design is not accepted by this research. #27 stays draft/unmerged. |
| **DEFER** | Agency/communion, closeness and state interpretations | Construct-specific independent criteria and stronger designs needed; counts alone do not measure these constructs. |
| **DEFER** | Instagram/email adapters, cross-medium trait model, persistent profile | No direct validation for these inputs; inspect actual formats and resolve privacy/measurement equivalence before engineering. |
| **REJECT** | Current metadata-only personality types, compatibility/health scores, attachment/clinical labels, motives and third-party psychological profiles | No defensible product-level evidence; many claims additionally violate permanent scientific/privacy boundaries. |
| **REJECT** | Confidence from export count, pooled correlated signals, or completed-pause history treated as future probability | Pseudoreplication, selection and censoring are structural errors, not problems that a larger model fixes. |

This recommendation is a proposal for owner review. No option above authorizes implementation outside the research assignment, and no null finding makes the existing relationship analyser obsolete.
