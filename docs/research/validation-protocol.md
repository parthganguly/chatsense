# ChatSense validation programme and preregistration draft

Version 0.1, 2026-10-10. Research proposal for [#24](https://github.com/parthganguly/chatsense/issues/24), with a separate participant-materials appendix for [#29](https://github.com/parthganguly/chatsense/issues/29). **Not registered, recruited, run or passed. No private conversations were collected or uploaded.** Before recruitment, an independent investigator must timestamp the final protocol, instrument versions, analysis plan, privacy review and stimulus manifest. Amendments are dated and distinguished from confirmatory analyses.

The [construct map](construct-map.md) defines the targets; the [review](psychometrics-evidence-review.md) supplies the evidence and source IDs. Numerical margins below are **proposed research decisions**, not literature-derived validity thresholds or new product constants.

## 1. Questions, hypotheses and estimands

The target population for the first naturalistic study is consenting adults able to use the supported WhatsApp export format and a validated questionnaire language. It is not all WhatsApp users. Recruit beyond a developer's social circle; record age bands, language, country, work schedule and operating system voluntarily. Do not recruit minors, employees under a participant's supervision, or anyone pressured to share a relationship. Compensation is for time, independent of data completeness or findings.

| Hypothesis | Locked outcome and contrast | Result that counts against it |
|---|---|---|
| H1, primary feasibility question: behavior carries information across selected dyads | Using weeks 1–4 in other consented dyads, predict a focal person's log(1 + median observed reply minutes) in weeks 5–8 of a held-out dyad. Compare adding focal-person history with a context-only baseline. Report absolute error with equal weight per focal person, then equal weight per eligible dyad. Separate from a same-dyad historical baseline task. | Transfer improvement's 95% interval lies entirely below the proposed worthwhile margin of 10% relative MAE reduction, or reverses under coverage/role controls. Wide intervals mean inconclusive, not absent traits. |
| H2, later confirmatory question: metadata contains useful information about independently measured Extraversion | One score per focal person: week-8 full BFI-2 Extraversion. Compare context-only prediction against context + weeks 1–4 metadata. Primary statistic: incremental external-test R² = (SSE_context − SSE_candidate) / SST_test, with SST_test = sum((observed score − test-sample mean)²); recompute numerator and denominator in each bootstrap. Report each model’s external R² = 1 − SSE_model / SST_test. Report MAE and raw Pearson r as secondary metrics. | Upper 95% bound below proposed ΔR²=.02 rejects practical utility of this feature set under this design. Zero-only significance does not pass. Lower bound >.02, positive external R², and ≥5% MAE improvement are proposed advancement criteria, not individual-label authorization. |
| H3, later cross-medium question | Same-person, matched-period behavior across two separately consented media; compare platform/context models against a model adding person history. Evaluate unseen people and an entirely held-out platform separately. | No benefit over the platform-only/context model, sensitivity to platform availability, or inability to define comparable exposures. A person×platform interaction can refute a universal score while supporting context-specific description. |

H1 is the smallest scientific experiment and has no personality target. H2 is the only planned confirmatory trait endpoint; other four domains and facets are explicitly exploratory and reported in full. If all five become confirmatory, revise power/multiplicity **before** collection. H3 is deferred until actual export capabilities and privacy are reviewed. Agency, communion, closeness and state hypotheses require separate instrument-specific registrations; do not add endpoints after seeing correlations.

## 2. Phases, feasibility and sample size

| Phase | Proposed sample and duration | What it can establish |
|---|---|---|
| Stage 8A comprehension (independent) | 10 adults preferred; 8–10 allowed by #29; approximately 25–30 minutes each | Misinterpretation/usefulness of existing synthetic cards. No psychometric validity or population guarantee. |
| F1 naturalistic feasibility | Target 60 completed focal adults from up to 80 recruits (25% attrition assumption); invite three consenting distinct dyads per adult; eight prospective weeks. Completion is follow-up attendance, independent of usable chat counts | Coverage, burden, variance components, selection sensitivity and H1 estimates. This is a feasibility sample, not powered certification of a small trait effect. |
| F2 confirmatory study, only after F1 | Planning envelope: 400 development focal adults plus **400 untouched external-test focal adults** at a separate recruitment site/cohort; eight weeks | A narrow model of Extraversion with contextual baselines; subgroup and incremental-effect power must still be simulated. With 25% loss, approximately 1,067 recruits for 800 usable focal adults. |

At the 60-completer target, F1 may involve up to 180 dyads and 240 people if every partner is unique; enrolling 80 focal adults can require consent from up to 320 people across 240 dyads. Partners are not automatically additional labeled focal observations. F2’s 800 analyzed focal adults would involve up to 2,400 dyads and 3,200 distinct people if every partner is unique; 1,067 focal recruits could entail 3,201 dyads and 4,268 consented people. Shared partners reduce unique headcount and introduce dependence. Report focal participants, all unique consenting people, network components, dyads, platforms, exports, windows, turns and messages separately. **Three chats from one person are still one focal person.**

The rough correlation check below is a lower-bound planning aid for an independent validation sample, not power for a complex model or a claim that training on 194 people suffices. From Fisher's z approximation, two-sided α=.05:

| True correlation | Independent test people for 80% power | For 90% power |
|---|---:|---:|
| .10 | 783 | 1,047 |
| .20 | 194 | 259 |
| .30 | 85 | 113 |
| .40 | 47 | 62 |

For an observed r=.30, approximate 95% intervals are [.110,.469] at N=100, [.168,.421] at N=200 and [.208,.387] at N=400. The 400-person test is chosen for precision, not because moderate correlation certifies individuals. At α=.01 (five tests), r=.20 requires about 288 people for 80% power. Clustering, measurement error, missingness, subgroup estimation and incremental improvement can require substantially more.

Reproducible standard-library check, executed for this proposal; Sol independently checked the calculations:

```python
from math import atanh, tanh, sqrt, ceil
from statistics import NormalDist
z = NormalDist().inv_cdf
def required_n(r, alpha=.05, power=.8):
    return ceil(3 + ((z(1-alpha/2) + z(power))/atanh(r))**2)
assert [required_n(r) for r in [.1, .2, .3, .4]] == [783, 194, 85, 47]
assert required_n(.2, alpha=.01) == 288
for n in [100, 200, 400]:
    ci = [tanh(atanh(.3) + sign*z(.975)/sqrt(n-3)) for sign in [-1, 1]]
    print(n, [round(v, 3) for v in ci])
```

Before F2 registration, simulate the **actual** nested design from F1 nuisance estimates without using F1 to select attractive trait effects: 1,000 runs per setting, seed 1729, participant counts 400/800/1,200 total; actor ICC .1/.3/.5, dyad variance low/high, within-dyad AR(1) .2/.6, loss 10/25/40%, ΔR² .00/.01 null settings, .02 boundary, and .05 design alternative. Include shared-partner graphs and differential missingness. Simulate the full grouped training/testing pipeline, paired improvement interval, null rejection rate and abstention coverage. The null is ΔR²≤.02; check rejection at the .02 boundary and joint ≥80% power at a true .05 improvement (an illustrative design alternative, not an expected effect), including the ≥5% MAE and positive external R² requirements. It is impossible to demand 80% power to put the lower interval above .02 when the true effect equals .02. Choose the smallest design meeting these criteria and acceptable interval coverage; otherwise fund more participants or register an estimation-only study. **These simulations have not been run. F2 is a planning envelope until they are.**

Budget formula: recruits × (consent + setup + two questionnaire sessions + diary/re-export time) × locally fair hourly compensation, plus partner consent and secure data stewardship. A two-hour focal burden at an illustrative US$15/hour is US$2,400 for 80 F1 recruits or about US$32,010 for 1,067 F2 recruits, before partner payments/staffing. These are arithmetic scenarios, not vendor quotes or an assumed locally appropriate rate. With a 12-week recruitment window and eight-week follow-up for the final recruits, F1 can need about 20 weeks plus setup/analysis; F2 likely needs institutional recruitment and several months. A handful of personal exports cannot replace it.

## 3. Measurements and eligibility

Pin parser, contract and analysis revisions. Retain the current definitions from [construct map A](construct-map.md); no production thresholds change. Use eight fixed seven-day study windows instead of letting export length determine a participant's research window size. For naturalistic windows, require attested coverage, valid self identity and exactly two consenting participants. Never infer identity across files.

Primary H1 eligibility: a focal person has three distinct declared dyads; each training/test dyad contributes at least 20 observed sender-switch samples for that focal sender in each four-week block and coverage in both blocks. This **proposed feasibility floor** is intended to reduce sampling noise; median stability remains to be measured empirically; count excluded sparse dyads and repeat analyses at 10 and 40 samples without choosing the best result. Other metrics retain their event-specific floors and explicit missingness. All enrolled people remain in the recruitment/coverage report, even if ineligible for H1.

Prespecify: sender-switch latency, thread-start numerator/denominator, restart numerator/denominator, follow-up event count and stored rate with eligible-turn count, messages, active days, observed interval and parser warnings. Primary feature set is these measures' training-period summaries and across-dyad dispersion; at most these families, no content/embeddings, names, phone numbers, graph identity fingerprints or raw text. Do not use medians of medians as a pooled event median. Equal-dyad averages are separately named estimands. Do not infer missing call or Instagram activity.

Timestamp ambiguity: retain unknown source offset and host zone; exclude time-of-day features when provenance is inadequate. Sensitivity analyses: drop first observed thread start, remove final partial windows, vary thread boundaries to 3/6/12 hours and restart boundaries to 12/24/48 hours **in offline research only**, shift calendar alignment ±1 day, and remove one dyad at a time. Future eligibility is conditional on observing switches: report coverage and never interpret the H1 result as a reply probability or evidence about never-replied messages. A finding dependent on one heuristic cannot be promoted as a general construct. Artificially truncate only local research copies under consent; analyze omission of randomly selected versus most/least active dyads. None recovers unknown unobserved history.

Questionnaires: full BFI-2 at baseline and week 8, optional and skippable; no app insight shown before criterion collection. Use official scoring, reversed-item keys and a licensed validated language version (S9–S10). For this draft, score a domain only with ≥10/12 items, using the mean of available correctly keyed items; label this a researcher rule, test complete cases, and freeze it before registration. Do not impute labels from metadata. If rights or burden require another instrument, register that change before collecting responses. The BFI-2-S is a burden alternative, not interchangeable measurement; the XS is unsuitable for facets. No sample-derived personal percentiles or diagnostic interpretations. IPIP availability does not remove the obligation to validate the chosen scale.

## 4. Privacy, consent and data lifetime

The current product remains entirely local and ephemeral. The future study is separate research, requiring owner approval, independent ethics review and an explicit data-management agreement. No raw export, message, sender name, exact timestamp trace, screenshot, derived individual profile or questionnaire response goes to hosted coding agents, CI, GitHub, telemetry or a public repository.

For F1/F2 require affirmative consent from **both members of every included dyad**. A focal participant cannot consent for their partner. Exclude nonconsenting dyads and group chats; record refusal counts without identities and disclose the resulting selection bias. Partners' behavior may be used only as dyad context, never to output their psychological profiles. Peer questionnaires require their own consent and access rules.

Participants operate exports on their own device without screen sharing. A reviewed local extractor would reveal a field manifest before any donation; development of that extractor is a future authorization, not work in this PR. Research transfers, if approved, contain only the minimum pseudonymous aggregated features, coverage flags, coarse context and optional criteria, via an approved encrypted offline transfer to an access-controlled research workstation. No cloud export collection. Derived rows remain sensitive and potentially identifiable; pseudonymization is not anonymization. Consent identifiers and linkage keys are held separately by a steward, not the analyst.

Proposed retention: raw copies never retained by the study; identifiable consent/contact linkage deleted 90 days after final follow-up unless institutional requirements mandate a separately disclosed period; restricted pseudonymous research tables retained 12 months after report for verification, then securely deleted with backups included. Consent must specify the final retention policy and withdrawal deadline before enrollment. The withdrawal deadline is the earlier of aggregate publication or 90 days after final follow-up, and must precede linkage deletion. Before that deadline, withdrawal removes linked records and triggers analysis rerun. After linkage deletion or aggregate publication, person-specific removal may be impossible; explain this before consent. No persistent in-product profile or re-check notification is introduced.

Publish protocol, code, synthetic fixtures, seeds, version hashes and disclosure-reviewed aggregate outputs. Independent replication means another investigator can collect a newly consented cohort or access restricted data under review; it does not mean publishing identifiable traces. Small cells/unique network patterns must be withheld or combined under a prespecified disclosure review.

## 5. Models, baselines and leakage controls

Start with descriptive distributions and exact counts. For H1 compare: training-context median; other-dyad personal-history median; a small additive context model; and a hierarchical model adding focal-person history. In a **separate same-dyad task**, compare last-block dyad median and shrinkage-to-context baseline; do not give that baseline focal-dyad history in an “unseen dyad” experiment. H2 baselines: training mean; context-only ridge regression; context + fixed metadata families via ridge. The richer hierarchy must beat the best baseline chosen on development data; no neural model is justified initially.

A research decomposition is:

`g(y_ijpt) = intercept + actor_i + partner_j + dyad_ij + platform_p + actor×platform_ip + time_t + context_ijpt + error_ijpt`.

This separates possible sources of variation; random effects are not personality scores. With partners appearing only in one dyad, partner and dyad effects cannot be identified separately: combine them and state that limitation. With one medium, platform variance is unidentifiable. A connected crossed design or separately consented round-robin is needed to isolate partner effects; a larger number of nested messages cannot fix identifiability. Binomial counts need their denominators and overdispersion; latency distributions need robust/log-scale treatment; dependent residuals need time-block handling. Within-person context deviations and person means enter separately to avoid interpreting between-person correlations as within-person mechanisms.

For H1, rotate each eligible dyad as the held-out target, construct personal-history features only from the other dyads’ first block, and aggregate target errors within person. Fit/tune population model coefficients on other focal-person components; a test person’s permitted other-dyad history supplies features, never test-outcome fitting. Report this as prediction for a person with observed other relationships, not a zero-history new-person task. Split people **before** fitting any transformation. A consent steward identifies enrolled shared dyads/partners with opaque linkage, never analyst name matching. Put connected recruited-person components in a single fold/site split; if a giant component prevents independent testing, change recruitment or acknowledge network-held-out evaluation is infeasible. Unknown overlap is a remaining limitation, not proof of independence. Both sides of a dyad and repeated exports always stay together. External F2 cohort is untouched until models and margins are locked. Grouped nested CV in the 400-person development cohort handles tuning; external test has one final evaluation. New-person random effects are marginalized, not estimated from that person's test outcomes.

Chronological tasks use weeks 1–4 only to predict weeks 5–8; no full-history scaling, feature selection, future counts, questionnaire leakage, duplicate exports or overlapping target windows. Inner folds fit imputation, normalization and regularization. Do not call cross-validation folds independent replications. For H2, baseline BFI-2 is excluded from predictors of week-8 BFI-2: that would mostly predict test–retest stability. Compare BFI-2-alone versus BFI-2 + metadata **only for a separate future behavioral endpoint** to test whether passive inference adds anything beyond asking the user.

Controls have different purposes. For a no-association null, restrict the primary permutation check to independent focal-person components (no shared enrolled partners), shuffle whole person-level labels within prespecified recruitment/context strata, and repeat the entire selection pipeline; do not shuffle rows or exchange unequal connected components as though they were independent people. If this subset is too small, register a design-valid cluster null simulation before confirmatory analysis. Timestamp displacement within dyad is a sensitivity test of temporal alignment, not a null for stable count features. Role/context-only prediction and selected-dyad deletion are substantive competing explanations, not assumed-null controls. Synthetic duplicate exports must leave evidence unchanged. Stop for evidence inflation under duplicates or failed calibration of a valid permutation/null simulation; legitimate context prediction is not itself leakage.

## 6. Reliability, uncertainty, missingness and stopping

Report block-to-block reliability, variance components/ICC with uncertainty, and split-half reliability using non-overlapping time blocks rather than random messages. Reliability of the behavior and reliability of a trait criterion are distinct; neither establishes construct validity. Analyze convergent and discriminant associations; correction for attenuation is exploratory and never substituted for raw predictive performance.

Use paired error differences and 2,000 seeded bootstrap resamples of independent participant/network components, carrying all their dyads and periods together; time-block resampling is nested only for within-person questions. Report interval method and failure when too few independent components exist. Continuous-score calibration needs intercept, slope, residual plots and prediction-interval coverage/width on external data. A high r can coexist with poor calibration. Brier/ECE are relevant only for a preregistered probability target, not a generic personality “confidence.” No user probability appears from this study.

Report complete-case results plus training-only imputation of covariates where justified, explicit missingness flags and attrition by context/criterion. Do not zero-fill missing behavior or labels. Compare participants with/without usable exports and questionnaires, and conduct missing-not-at-random sensitivity analyses (e.g., excluded participants' criterion means shifted ±0.5 training SD). Weighting can address observed recruitment imbalances, not repair unknown missing relationships. Report estimates conditional on inclusion rather than calling the sample representative.

Generalization: report errors/coverage by language, country, age band, work schedule, operating system and relationship context with sample sizes. Predefine coarser groups before analysis. If a subgroup has too little information for a useful interval, abstain for it rather than hide it in the overall average. Evaluate instrument structure/invariance for the actual versions; failure of scalar comparability bars pooled mean/ranking claims, and unstable feature meanings bar a universal cross-platform latent score. Do not manufacture subgroup cutoffs after results.

Stopping rules: F1 recruitment closes at 80 focal recruits or 12 weeks, whichever comes first, then follows everyone for eight weeks. Analyze all completers, even if more than 60; do not replace people based on chat eligibility or effect size. Target 60 completed follow-ups; falling short is a feasibility finding. F2 fixed N follows the simulation and funding gate, with no optional significance-based stopping. Pause immediately for consent/privacy failure, unintended third-party profiling, or participant distress attributable to study procedures; independent review determines whether to resume. No trait feedback is returned in F1/F2. A feasibility or null result is published alongside exclusions and deviations.

F1 advances only if at least 60 focal adults complete follow-up and at least 75% of all completers (45/60 when exactly 60 complete) supply three eligible dyads across both blocks, privacy/consent procedures work, and sensitivity/uncertainty support designing an informative follow-up. Completion, consented dyad count and analysis eligibility are separate denominators. This proposed operational criterion concerns feasibility; H1 must separately meet its improvement criterion to justify a transfer claim. F2 success is evidence to review, not a permission to ship. Product use additionally needs external replication, useful individual prediction intervals, a separately tested explanation, incremental user benefit over descriptive rows/self-report, and preserved privacy. If those costs exceed demonstrated usefulness, keep the product descriptive.

## 7. Bounded evidence amendment, 2026-10-11

The [S25–S29 addendum](behavioural-transfer-evidence-addendum.md) adds direct messaging-metadata evidence and competing explanations. This draft amendment precedes registration and data collection; it does not alter H1's primary outcome, success margin, F1 sample cap, or the separate #29 gate.

- **Separate the prediction tasks.** Strict H1 continues to exclude all target-dyad history; neither contemporaneous target-partner response fractions nor future context belongs in its predictors. In the already separate same-dyad task, explicitly compare context + weeks 1–4 partner timing with that model + the focal person's other-dyad history, while retaining the focal-dyad historical baseline. Use the same held-out people/network components and weeks 5–8 outcomes. This secondary comparison tests added value when target history exists; it is not unseen-dyad performance. It has no separate success declaration until its estimand/margin are registered. Lack of added value limits usefulness when target-dyad history exists; it does not negate a positive strict-H1 transfer result when that history is unavailable.
- **Do not infer actor causes from a donor intercept.** Decompose partner-speed predictors into donor means and within-donor deviations in descriptive association models; retain the stated identifiability limits. Without crossed partners, stable schedules and relationship effects can still explain transfer. Do not fit a test person's random effect to their target outcomes. Same-dyad balance is not the actor reliability criterion.
- **Make selection falsifiable.** Do not introduce S25's 10% participation screen or require only important chats. Freeze the three dyad IDs at baseline using a preregistered baseline-only rule among mutually consenting candidates; assess later eligibility without substituting dyads selected using weeks 5–8 activity, record refusal/coverage counts without third-party identities, and retain unequal dyads meeting the existing sample floor. Report eligibility by context and any independently collected optional closeness criterion. Repeat the stated dyad-deletion sensitivity with the most active dyad and, if available, the closest consenting dyad. Do not reinterpret selection among consenting candidates as a representative network sample.
- **Validate our measurement.** S25's 70-response monthly distribution-calibration exercise does not validate H1's 20-switch median floor. Retain 10/20/40-switch sensitivity and assess uncertainty with appropriate time blocks. Before study code is approved, require synthetic cases for exact cutoff values, second-versus-minute resolution, nearest-versus-up rounding, bin edge inclusion, same-sender runs spanning thread gaps, and terminal censoring. These are future research checks; production constants remain unchanged.
- **Test a concrete alternative.** The planned simulations must include common schedules and partner-response dynamics with no stable actor parameter. Assess whether the pipeline's prediction, error calibration or interpretation can distinguish that case from an actor-information alternative. Include synchronized changes where both partners slow down while their distribution similarity stays constant. For any exploratory similarity analysis, compare actual partners with valid schedule/activity-matched reference pairings, keeping dependencies intact; high similarity alone can reflect a common fast-response distribution. No simulation or participant-data test was performed in this addendum.

## Appendix A — Stage 8A human-comprehension packet (#29)

This study tests understanding of Relationship Read, not H1–H3. Authority: [audit §29](../product/chatsense-full-project-audit.md#29-usability-validation-plan), [master plan §12](../product/chatsense-master-plan.md#12-validation-gates), and live #29. Stage 8B remains blocked until actual independently reviewed results satisfy those gates. Existing engineering CI cannot supply participant evidence.

### Participant invitation and consent text

“We are studying how understandable ChatSense's descriptions of chat patterns are. You will see five fictional examples and answer questions about them. This takes about 25–30 minutes. You must be at least 18. Please do not show or send us any personal messages, exports, screenshots, names or details identifying someone else. You may skip a question or stop at any time without losing the agreed thank-you payment. Some examples concern uncertain communication; please skip anything uncomfortable. We will record your answers under a study code and report anonymous summaries. This is a test of the app, not a test of you or your relationship. May we record written notes of your answers?”

Separate optional consent for audio and anonymous quotation; default no audio. Record consent date, study code, final retention/withdrawal terms and the researcher's contact privately. Do not begin before those contact/retention fields are completed. Do not prime participants with the correct motives/prediction answers before the task. Debrief afterward: the app describes selected exported timing; it cannot know motives or promise a reply.

### Recruitment and stimulus manifest

Recruit 8–10 consenting adults beyond the developer's inner circle; prefer fixed N=10, with at least three currently experiencing an uncertain romantic/friendship chat and at least two considering a non-romantic context. Quotas may overlap; no personal details are required.

| Order | Scenario | Existing synthetic source at baseline SHA | Manifest status |
|---:|---|---|---|
| 1 | Pattern changed | `fixtures/whatsapp/stage4_reply_slowdown.txt`; `testPatternChangeState` | Source inspected; capture of built rendering pending |
| 2 | Steady/balanced | `balancedWeeks()` in `tests/relationship-read.ts` | Source inspected; capture pending |
| 3 | Carried contact, mixed | `mixedWeeks()` in that test | Source inspected; capture pending |
| 4 | Unusual silence with restart history | `unusualCompletedGapWeeks()` in that test | Source inspected; capture pending; preserve completed-history wording |
| 5 | Not enough data | `fixtures/whatsapp/stage4_insufficient_export.txt`; `testHonestInsufficiency` | Source inspected; capture pending |

The current card component renders headline, summary, counted evidence, confidence label, historical/staleness notes where present, inline limitation and details affordance. These **must all remain visible in the actual stimulus**. The code/test assertions were inspected, but no built screenshots were captured in this research PR. Do not treat this candidate manifest as frozen stimuli or rewrite synthetic prose to stand in for the app.

Before registration: build the pinned revision, render these exact inputs with a recorded fixed clock and timezone, verify the intended state, and attach screenshot hashes plus exact rendered text, fixture/generator hash, viewport, revision and capture date to the study record. For generator inputs use the existing no-clock test configuration or a fixed recorded clock that preserves the intended state; never today's moving clock. Test expectations establish candidate selection, not visual verification. If any scenario fails to render, fix materials in a separate authorized study-preparation change and record its SHA before recruitment.

Participant k starts at scenario `1 + ((k-1) mod 5)` then cycles through the remaining order. Ten participants provide each starting position twice. Facilitator uses the same neutral script, with no explanations until answers are recorded.

### Facilitator form and prompts

For each card: timed 10-second silent read; ask, in order, “What does this tell you?”, “What does it not tell you?”, “Will they reply, according to this?”, usefulness 1–5, creepiness 1–5, trust 1–5, and “Would you want this about a chat of yours?” For card 4 also ask “What do you expect to happen next in that chat?” Use only “Could you say more?” as a clarification; log every additional prompt.

Anchors: usefulness 1=not at all useful, 5=very useful; creepiness 1=not at all creepy, 5=very creepy; trust 1=no trust in the displayed claim, 5=high trust. Keep creepiness and trust separate; reverse scoring one into the other is invalid. Preference options: yes/no/unsure. Record exact anonymous wording before coding.

End questions: “Which card would you screenshot for a friend, if any?”, “Would you check the same chat again in a few weeks?”, overall trust 1–5, and “Was the evidence visible enough or too buried?” The check-again question authorizes no reminders or engagement feature.

### Coding and frozen acceptance rule

Two human reviewers independently code anonymized answers before seeing each other's decisions; report raw agreement and every disagreement, then adjudicate with reasons. Do not send identifiable responses to agents. Synthetic responses may test a form, but can never enter the study data.

Per-card codes: **understands** = describes observed history/limits and explicitly denies that the card establishes motives or predicts replies; **misinterprets** = treats counts as emotion/intent, diagnosis or reply prediction; **ambiguous** = unclear/mixed; **missing** = absent. Participant-level comprehension pass requires the motives and reply limits to be explicit and no contradictory answer across cards. A participant's own hope/guess is not automatically an app promise; code their stated attribution and log uncertainty. Ambiguity is not silently converted to success.

Preserve issue #29 thresholds, operationalized before collection:

- Comprehension ≥80% of all enrolled participants (8/10, 8/9, or 7/8); publish the exact numerator/denominator. Prefer N=10 to avoid ambiguity in the original 8/10 rule.
- Zero participants interpret the historical-next-pattern sentence as a promise. Any confirmed promise interpretation fails the comprehension gate; unresolved ambiguity makes it inconclusive.
- Median usefulness ≥4 on at least two of five cards; report each card's denominator.
- Median creepiness ≤2, defined here as the median of each participant's median across five cards, with per-card medians also reported.
- At least half answer yes to wanting this for their own chat; add one overall yes/no/unsure item after the per-card items to make that denominator unambiguous.

These aggregation/coding choices resolve unspecified details in the old protocol; the study owner must freeze them before responses, not pick alternatives later. Missing comprehension counts as not demonstrating comprehension; missing silence answers make the promise gate inconclusive. More than one missing rating per person, missing overall preference, fewer than eight participants, unmet quotas, or unverified stimuli prevent an overall PASS. Do not drop participants who struggle to improve a numerator. Record withdrawals and deviations.

Results template: enrolled/completed/withdrawn counts; quotas; stimulus/version manifest; per-card coded responses and rating distributions; exact threshold numerators/denominators; disagreements, missingness and facilitator deviations; safe consented quotes; **PASS / FAIL / INCONCLUSIVE** with reasons and independent reviewer sign-off. No rows are populated in this proposal. Failure requires wording revision and new testing; results cannot be pooled across silently changed wording. Even 0/10 observed promise readings does not establish zero population risk.
