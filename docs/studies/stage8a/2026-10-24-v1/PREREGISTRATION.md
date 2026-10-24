# ChatSense Stage 8A preregistration — P0 v1, 24 October 2026

Status: preparation only; ZERO human observations. Freeze occurs at the immutable Git commit linked from the single "ASTRA 8A PRE-REG + READINESS" issue comment. This is a timestamped repository preregistration, not a registered-report review or an external registry endorsement. Amendments require a new version, reason, date and hash; never overwrite this snapshot. Human sessions require the owner's separate P1 authorization.

## Authority, purpose and estimand

Issue #29 and comment 6364672064 (archived in authority/) govern; audit §29 supplies the existing five gates. The older master plan says 5–10, but the later issue fixes 8–10 and the preparation mandate prefers ten. We commit to **ten**. This is a small formative comprehension/usability pilot of the exact five rendered hero cards, not construct validation, a clinical study, a forecast benchmark or an estimate of population prevalence. No inferential hypothesis tests, significance claims or 50-independent-observation analyses are planned.

Primary question: after reading these cards in a fixed protocol, do adults understand that the app describes this export's patterns without establishing motives or predicting a reply? Secondary questions concern usefulness, creepiness, own-chat interest and evidence visibility. The five outcomes below are conjunctive; attractiveness cannot compensate for misunderstanding.

The frozen browser production build comes from main commit 2415a51385f60ff9e43ca2e26b66c8c9a7fd6267 (PR #21). Exact screenshots, DOM, synthetic inputs, per-card frozen clocks and build provenance are in stimuli/manifest.json. No source copy is substituted for observed rendering. The rendered build is a web/Capacitor app surface; no claim of physical Android validation. See STIMULUS-REVIEW.md for the selected presentation and any deviations.

## Sample and stopping

Target N=10 eligible consenting adults aged 18+, acquaintances-of-acquaintances rather than the developer's inner circle. No direct reports, students under the recruiter's authority or anyone whose access/payment depends on favorable answers. At least 3 self-report currently navigating an uncertain romantic/friendship conversation and at least 2 are considering a non-romantic chat. These categories may overlap; record only booleans and broad romantic/friendship/family/work/other/prefer-not-to-say context, never names or messages. Someone declining the screening questions may participate if otherwise eligible, but does not count toward the unverified quota.

No recruitment now. After authorization, assign sequential slots P01–P10 when the first study card is exposed. Pre-exposure declines and ineligible adults do not occupy exposure slots; counts/reasons are logged without identities. A started slot is never replaced because its answers are incomplete, unfavorable or withdrawn. Stop after ten starts; no optional extension based on outcomes. On withdrawal, delete response content and the contact/code link; retain no linkable participant row. Base consent discloses retention of nonidentifying aggregate counts of sessions started, completed, withdrawn and excluded for denominator accounting. The planned denominator remains ten; unavailable slots can be represented by anonymous arithmetic placeholders, never reconstructed participant records. Someone who does not agree to that disclosed aggregate-count policy can decline participation before exposure.

**N<10 rule:** no reduced-N PASS. With 8 or 9 usable people, report exact C/N_usable and C/10 planned slots, known promise numerator/N_silence_assessable, and all missingness; decision is INCONCLUSIVE unless a fully adjudicated criterion already establishes FAIL. Fewer than 8 cannot satisfy the allowed study range. No lower denominator, rounding 7/9 to "8/10", post-hoc replacements, or 80% reinterpretation. This conservative fixed-ten choice is made before responses.

Eligibility errors discovered later, duplicate participation, withdrawals, corrupted or wrong-stimulus sessions are excluded from usable analyses with reasons and their slots retained as unavailable. Do not exclude ordinary uncertainty, low ratings, non-romantic use, dislike or a prediction/motive error. No real response content is ever stored in this repository.

## Stimuli, assignment and exposure

A=pattern change; B=steady/balanced; C=carried contact (mixed); D=unusual silence with historical restart note; E=not enough data. Assigned order:
P01/P06 ABCDE; P02/P07 BCDEA; P03/P08 CDEAB; P04/P09 DEABC; P05/P10 EABCD.
This rotates the starting card twice and preserves the remaining cyclic order. It is not a randomized between-group experiment. Report descriptive first-card and sequence patterns; no causal order-effect claim.

Introduce B with the fixed neutral context, "For this example, imagine a chat between two friends." For A/C/D/E, "This is another fictional chat." No participant-specific rewriting or inferred relationship types. B supplies a non-romantic scenario for everyone in addition to the recruitment quota.

Use only the selected, complete native-scale card screenshot identified in STIMULUS-REVIEW.md. A study card contains its entire evidence, history, staleness and limitation, without added highlighting, redaction, explanatory caption or other app onboarding. Show it at native 100% scale on a screen that fits the entire image; ten seconds starts only when all pixels are visible and legible. Use a separate timer; record actual exposure seconds and any visibility failure. Keep the card visible for all questions, allowing rereading. Do not quiz recall after hiding it. No preceding onboarding/tutorial that teaches the answers. Approximately four minutes per card, not a forced cutoff; duration is recorded. Do not answer interpretation questions or correct misunderstandings until every card and end question are recorded.

If the display cannot fit the selected screenshot without unreadable scaling or cropping, postpone; do not improvise a new stimulus. An exposure failure is documented; responses after coaching or wrong/cropped stimuli are not quietly repaired by repeating the same card. Those core fields are unavailable for confirmatory gating; retain original text privately for deviation analysis where consent permits. Fix conditions before a new, separately registered cohort.

## Questions and ratings

Use materials/INTERVIEW.md verbatim: ten-second silent reading; open "What does this tell you?"; open "What does it not tell you?"; "Will they reply, according to this?"; usefulness 1–5; creepiness 1–5; "Would you want this about a chat of yours?"; D only, "What do you expect to happen next in that chat?" End questions are the four required by #29. We disambiguate "creepiness/trust" as **creepiness per card**, and **trust overall**, without reversing or combining them.

Usefulness: 1 not at all useful, 2 slightly useful, 3 moderately useful, 4 very useful, 5 extremely useful.
Creepiness: 1 not at all creepy/intrusive, 2 slightly, 3 moderately, 4 very, 5 extremely.
Overall trust: 1 none, 2 low, 3 moderate, 4 high, 5 very high.
All permit "prefer not to answer"; it is missing, not the scale midpoint or zero. Half-point averages occur only in medians, never input ratings. Want: yes / no / unsure / prefer not to answer; retain exact words. Conditional yes is unsure unless the person unambiguously says yes for this displayed card. Never ask for details about their own chat.

## Locked coding and participant-level comprehension

Full operational rubric is in materials/CODING-RUBRIC.md. Two reviewers independently code verbatim responses before viewing each other's codes, ratings, context quotas or gate results. The two first-pass reviewers and any adjudicator are human; at least one must be independent of facilitation. Human-coded quotes/offsets support each domain; tooling never infers codes from keywords. Private raw notes, quotations and evidence snippets are not sent to Astra, Sol or another AI service under this protocol. Astra owns the scientific rules and gate interpretation using nonidentifying aggregate/code-only summaries; any proposed AI processing of response text requires separate owner authorization and an amended participant consent before that processing. First-pass files are locked and hashed privately before adjudication. Disagreements and changes are retained. An unresolved disagreement is ambiguous and cannot become a correct response by averaging or majority vote. Reviewer identities remain private; public summaries use reviewer roles/codes.

Open answers on all five cards are coded separately for motive limit and reply-prediction limit: CLEAR_LIMIT, ERROR, AMBIGUOUS, NOT_MENTIONED or MISSING. A direct-check response is CLEAR_LIMIT, ERROR, AMBIGUOUS or MISSING. A participant is correct only if:
1. At least one unprompted open answer explicitly recognizes the motive limit and at least one explicitly recognizes the reply-prediction limit; they may occur on different cards.
2. Every card's direct reply check explicitly states the app does not establish whether/when a reply will occur.
3. There is no attributed motive or predictive ERROR or AMBIGUOUS code in either open-answer domain on any card, and no PROMISE or AMBIGUOUS history code.
4. All required raw core fields, two independent reviews, evidence citations and adjudication are available.

NOT_MENTIONED is neutral at individual-card level but cannot supply positive domain evidence; a generic "it cannot tell everything" is AMBIGUOUS, not a clear limit. The direct question cannot rescue absent spontaneous domain understanding. An explicit error followed by a disclaimer is still an error. No facilitator-taught answer or later corrected answer erases an earlier response. A neutral clarification may distinguish an app-attributed prediction from a personal expectation; preserve both verbatim and flag the probe. It cannot teach the correct answer or convert error to correct.

This is a demanding operational definition of the existing comprehension criterion. Report spontaneous, prompted and combined counts separately so the strict rule is inspectable. No minimum count of cards per positive spontaneous domain is imposed beyond one; no all-five double-negation test is invented.

## Historical-note/promise coding

For D, jointly inspect both open responses, direct check and the final next-event question; also record explicit references to D/history anywhere later. PROMISE means treating the app/history as establishing a future reply/restart or non-reply: categorical, guaranteed, timing-specific or probabilistic ("likely because all the previous pauses restarted") counts. Certainty words are not required. Merely stating "twelve pauses ended" is historical and not an error. An explicitly personal hope/guess with an explicit statement that the card does not predict is NO_PROMISE. An unqualified future statement, "I don't know" without explaining the card's scope, or a hedge whose attribution is unresolved is AMBIGUOUS. Missing D exposure/answers is MISSING. Neither AMBIGUOUS nor MISSING can be silently counted as NO_PROMISE.
A definite promise interpretation anywhere in a valid independently reviewed exposed session is a zero-tolerance failure. Report PROMISE/assessable D participants, NO_PROMISE/N and ambiguity/missing separately. **Zero observed promises with incomplete ascertainment is not a zero-promises PASS.**

## Aggregation, missingness and decision table

Let N_target=10, N_started=number exposed, N_usable=eligible retained sessions. Always disclose these separately, with withdrawn/excluded/noncomplete slots. Unit = participant.

| Criterion | PASS | FAIL when ascertainment sufficient | Otherwise |
|---|---|---|---|
| Comprehension | C>=8 of 10; all ten adjudicated/assessable | Fully assessed C<8, or even all unavailable slots becoming correct could not reach 8 | INCONCLUSIVE |
| History/promise | All ten classified NO_PROMISE; P=0/10 | Any confirmed PROMISE | INCONCLUSIVE for ambiguous/missing |
| Usefulness | Compute median of ten participant scores on each card; at least two medians>=4 | All required ratings available and fewer than two qualifying cards | INCONCLUSIVE if any core rating missing |
| Creepiness | First median of each participant's five scores, then median of the ten participant medians <=2 | Complete two-stage median>2 | INCONCLUSIVE if any core rating missing |
| Own-chat interest | Each person counts once if >=1 unambiguous yes across five cards; >=5/10 | Complete five-card wants for all ten and fewer than five people qualify | INCONCLUSIVE if any want missing |

Ordinary median: sort; odd n central value; even n arithmetic mean of the two central values (e.g. 3 and 4 ->3.5, not rounded to 4). Creepiness is explicitly median-of-participant-medians, not a pooled 50-rating median; publish per-card medians and each participant median as sensitivity/descriptive summaries. Own-chat union across cards is fixed before data and reflects "would want this" for at least one shown use; also report each card's yes/N and total number of yes cards per person. No double counting frequent yes responders. Unsure/no are observed non-yes; prefer-not-to-answer is missing.

No numerical imputation, complete-case silent deletion, or favorable denominator. A missing core datum prevents overall PASS even where a particular criterion can be determined (e.g. an already observed yes); this is a preregistered completeness safeguard. Missing end-session qualitative answers/trust are reported but do not veto the five gates. Missing consent, wrong stimulus/version, unexplained order or material coaching invalidate usable core assessment. A timed-reading deviation is flagged and reviewed before coding; any interruption or extra exposure that teaches/changes interpretation makes that core unavailable. Non-substantive timer deviations are disclosed, never used to discard unfavorable answers.

**Final P2 decision:** FAIL if any gate has an established failure; otherwise INCONCLUSIVE if any gate, sample/quota, exposure or review integrity remains incomplete; PASS only when every gate and integrity condition passes. Failure or inconclusiveness keeps Stage 8B blocked. A PASS permits owner consideration, never automatically starts 8B. With zero real data P2 is NOT_RUN, not FAIL or PASS.

## Reporting, repair and limitations

Publish the five gate calculations with exact numerators/denominators, per-card rating counts/medians, participant-level aggregation, exclusions/missingness table, quotas, order and deviations, reviewer agreement counts before adjudication and disagreements. No inferential "80% of users" extrapolation or synthetic reliability claims. Quote only safely paraphrased, nonidentifying material with separate optional quote consent; omit public small-cell context cross-tabs. Public reporting contains aggregates and protocol/version hashes, never raw participant rows or contact data.

Primary limitations are convenience sampling, tiny N, repeated explicit prediction checks that can sensitize later answers, ceiling/floor effects, screenshot rather than full interaction, and coding judgment. First-card spontaneous understanding is a descriptive diagnostic, not a replacement success threshold. "Strong/Useful/Light read" are part of the rendered stimulus and are not endorsements of validity.

A failed comprehension gate requires separate copy repair and a fresh preregistered retest; do not combine old and new versions, tune thresholds, add prediction features, or reuse learned participants as naive evidence. If preparation finds an actual copy contradiction, create a separate draft repair PR and recapture affected stimuli before READY. Perceived usability risks alone belong in the study, not an unobserved claim of human failure.

No recruitment, private exports, third-party excerpts, S2 implementation, Stage 8B changes, production merge, paid external batch, or monitoring/reminders is authorized by this packet.
