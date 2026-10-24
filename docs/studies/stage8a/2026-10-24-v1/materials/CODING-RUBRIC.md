# Coding rubric v1 — reviewer only

Two independent first-pass reviewers; no automatic language model coding of real participant notes under this P0 authorization. Use privacy-safe verbatim notes later only within the approved private study workflow. Each coder receives all response text needed for an individual (randomized study IDs; order retained) but no ratings, demographics/context quotas, other coder's labels or running gate totals. Codes are locked privately before comparison. The human reviewers or a designated human adjudicator reconcile codes from the private text; record exact disagreement, resolution and reason. Astra can interpret the frozen rules from nonidentifying aggregate/code-only questions but does not receive raw notes, quotations or evidence snippets. Any proposed AI text review requires separate authorization and amended consent first. Do not infer a correct answer from confidence, usefulness, friendliness or technical vocabulary.

## Unit definitions

A record is one person with five card blocks, not five people. Each block has two open answers (tell/not-tell) jointly coded for motive and reply limits; retain which answer/quote supplies the code. Direct prediction check coded independently. D/history is coded across D's four relevant answers and any later explicit history reference. Missing/skipped blank fields are MISSING with a reason, never NOT_MENTIONED. Each nonmissing code cites exact text/field and a rationale.

For open domains:
- CLEAR_LIMIT: explicit, unqualified recognition of the relevant limit of **the displayed app/export**. Motives: no why/intent/feelings/caring conclusion. Reply: no inference whether, when, how likely or which person replies next.
- ERROR: attributes an unsupported motive/emotion/status or future action/probability to the card. Hedged "probably", negated predictions ("they won't reply"), or disclaimer-plus-contradiction still ERROR.
- AMBIGUOUS: relevant but underdetermined; vague limits, uncertain scope, unqualified future expectation with unclear source, or unresolved reviewer disagreement. Do not upgrade by benefit of doubt.
- NOT_MENTIONED: domain simply not addressed, with no claim or uncertainty about it. Counts neither for nor against the positive spontaneous evidence requirement.
- MISSING: required open answer was omitted, lost, contaminated by material coaching or not exposed to the frozen stimulus.

Combine the two open answers for each domain with precedence ERROR > AMBIGUOUS > MISSING > CLEAR_LIMIT > NOT_MENTIONED. MISSING applies when either open field is missing, even if the other contains a clear limit (a known error remains error). If an exact contradiction occurs anywhere, it dominates later disclaimers. A neutral probe can resolve attribution only when the original did not already assert an app-based error.

For direct "Will they reply, according to this?":
- CLEAR_LIMIT: "It does not tell us whether they will reply" or a semantically equivalent explicit limit.
- ERROR: yes/no/when/probability based on the app, including "probably yes".
- AMBIGUOUS: bare "no" (no prediction or no reply?), "maybe", "I don't know" without stating the card doesn't say, or a generic limitation.
- MISSING: blank/skipped/lost/contaminated.

## Promise safety domain

PROMISE: future restart/reply/non-reply attributed to the historical sentence or app. Do not require the literal word "promise". "All ten restarted, so this one probably will" qualifies. Across D-relevant answers use PROMISE > AMBIGUOUS > MISSING > NO_PROMISE; unresolved attribution is AMBIGUOUS. Only classify NO_PROMISE when the required D fields are present and the participant explicitly treats the history as history and denies a forecast, or describes a clearly personal expectation while denying an app prediction. A motive error alone need not be PROMISE, but still harms comprehension.

The protocol makes ambiguity fail the positive comprehension count; an ambiguous history interpretation prevents zero-promises PASS but is not mislabeled a confirmed PROMISE. Report both.

## Stimulus-specific descriptive understanding (diagnostic, no sixth success gate)

A: pattern/timing changed in this export; does not explain motive. "They are losing interest" is an attributed-motive error.
B: observed sharing of initiation/contact measures; not proof of reciprocal feelings or a healthy relationship. Applies to friends as well.
C: measures point in different directions; "disagreement is the finding". Do not infer one person cares more from starts/turn shares or treat a Useful read tag as probabilistic accuracy.
D: unusual quiet compared with completed prior quiet stretches; earlier restarts are counted history, current quiet is censored "at least ... so far", and may be stale. They are not a promise, likelihood or time-to-next-message estimate.
E: insufficient evidence is a substantive abstention. It is not zero contact, proof of rejection, an app error or a weak prediction. A person may find it unhelpful and still understand it.

Only observed text may support coding; these descriptions are checked against the frozen rendered words in STIMULUS-REVIEW.md before READY.

## Short FAKE semantic controls — not participant records

The artificial clauses below are unit tests of labels, not modeled people or observed behavior. They must never be entered into a human results table.

| ID | Artificial clause | Required label / reason |
|---|---|---|
| F01 | "The earlier pauses restarted, so they will reply tomorrow." | D PROMISE; reply ERROR |
| F02 | "It shows some things, but not everything." | AMBIGUOUS limits; no positive spontaneous domain evidence |
| F03 | [rating skipped] | missing, never 0, 1, 3 or deletion of the person |
| F04 | "Very useful. Now I know they still care and will answer." | motive ERROR, reply ERROR; usefulness cannot rescue |
| F05 | "In this friendship chat the starts were shared. It doesn't tell why or whether my friend will reply." | both CLEAR_LIMIT, no romance required |
| F06 | "The card says they probably will reply; of course nothing is certain." | reply ERROR and PROMISE; hedge is not safety |
| F07 | "I hope for a reply myself, but the card only counts previous restarts and doesn't tell what happens next." | reply CLEAR_LIMIT; NO_PROMISE if other D fields complete |
| F08 | "No." [direct question] | AMBIGUOUS, not assumed correct |
| F09 | "They won't reply, according to this." | reply ERROR (negative prediction) |
| F10 | "Ten earlier pauses ended with a new message." | historical fact; reply NOT_MENTIONED, not by itself sufficient for NO_PROMISE |
| F11 | "It doesn't predict, but I think the app shows they'll come back." | reply ERROR/PROMISE; contradiction wins |
| F12 | "Not enough data means nothing happened." | insufficient-evidence diagnostic error; not a numeric zero |
| F13 | "I don't know if they will reply." | AMBIGUOUS direct check without explicit app limitation |
| F14 | "The app cannot show why; it cannot say whether they reply." | both CLEAR_LIMIT |
| F15 | "Probably because they are upset." [what card tells] | motive ERROR even with hedge |
| F16 | [reviewers disagree: CLEAR_LIMIT vs ERROR] | unresolved AMBIGUOUS; no PASS pending adjudication |

No string matching is a validated semantic classifier. Aggregate software verifies already-coded labels, provenance and arithmetic only. A correct artificial fixture verifies a code path, not human comprehension.
