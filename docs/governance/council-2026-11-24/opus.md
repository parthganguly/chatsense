**CHATSENSE-OPUS-24 — CTO position (first pass, independent, based only on the supplied text)**

**What the 16 requests can establish.** For two services, three cards and 24 prompted three-option items, the run yields item-level answer distributions. It also yields image/text TV, and only for card A, a two-draw repeat signal. It says nothing about human comprehension, prevalence or release readiness. GLiDE is unpinned and its time is confounded with provider, so even service-level claims are dated snapshots. The most it can produce is a **quoted, specific misreading hypothesis**, for example "historical 7/10 read as a forecast." That hypothesis would warrant copy review or a human study. It would not warrant a ship or no-ship decision. Product action is justified only when the same item-level misreading appears in both modalities, appears across providers, and for A holds across both rounds. Even then the action is "test with people," not "change the product." Card defects that are visible on inspection, such as what "20 and 20 observed events" labels, can go to copy review now, with no inference.

**Is the operational complexity justified?** Yes, narrowly, and only because the complexity is already sunk. The spend is roughly $0.0013 against a $0.45 ceiling, so the real cost is governance and failure surface, not money. The marginal information is small: 128 distributions and at most 12 contrasts, of which only A has any repeat-noise anchor. I would not accept new machinery, new probes or extensions. I accept reusing the frozen controls because removing them would cost more review than keeping them.

**Essential controls (everything else is secondary):**
1. A fixed 16/128 denominator with four request states. No partial scoring of malformed responses. Missing never counts as correct.
2. Serial execution with stop-before-next reservation, no retry/resume, and UNKNOWN_POTENTIALLY_BILLED retained.
3. Served model identity recorded per response. This matters especially for unpinned GLiDE, because "unexpected identity" is the only drift guard.
4. Request/stimulus hashes bound to the immutable 7ed874b PNG/text bytes and a frozen literal option→key→position manifest.
5. No answer-dependent scheduling and no scientific stop.

The position-3 checkpoint is a *technical* gate. With an estimate-only `"unverified"` reader, it establishes no billing, and it must not be described as if it did.

**What a partial or failed prefix means.** It means a technical limitation, never a comprehension result. Examples:
- A stop at request 1 or 2 yields zero contrasts.
- A clean stop after 3 yields one planned contrast (Jev A image/text) out of 8 modality contrasts and 0 of 4 repeat contrasts. It can support no statement about D, E or GLiDE text.

Validated responses remain reportable as individual observations with their limits stated. The namespace is consumed. Any continuation is a new freeze and a new authorization, not a resume, and results from different runs are never merged.

**Concrete counterexample to a likely product inference.** The tempting inference is: "Both services chose the reference on D q04–q06/q08 and E q05/q06/q08, so the cards communicate uncertainty and scope well." Now consider an always-hedge selector that picks whichever option says "not established/no reason/neither." Ignoring rotation, which only moves positions, it matches the reference on all ten "c-type" scope items: A q04–q06, D q04–q06/q08 and E q05/q06/q08. It does this while understanding nothing on the card. It fails only where hedging is wrong: A q01/q08, D q01–q03/q07, and E q01–q04/q07. In addition, D q04's word "calibrated" may cue the intended answer.

So high scope scores are uninformative unless the same response also gets the numeric extraction items right. The proposal's always-uncertain comparator must be reported next to every scope result. The reverse inference also fails: an A image failure with text recovery could reflect PNG resolution or layout ingestion, and does not justify rewriting copy.

**Smallest exact offline checkpoint before the owner decides.** At pinned 2f629ecf304a418657c50c189d8e1af60255e0a3, the "historical PASS" must be reproduced at this exact source, not inherited from an earlier run:
1. Run the stated network-denied `sandbox-exec … unittest s3_v2.test_v2 -v` and record the full output.
2. Confirm the committed freeze reproduces byte-identically: the bank, references, wire mappings, 16 request hashes and stimulus links. Compare against the published freeze; do not regenerate over it.
3. Use fake fixtures to show that `report.report` on prefixes of 0, 3 and 15 validated requests prints the correct available/planned counts (contrasts at 0/8 and 0/4, then 1/8 and 0/4). It must also refuse a corrupted receipt.
4. Use fake fixtures to show that EOF or malformed reader input after request 3 blocks reserve 4, and that a deliberately "wrong" scientific answer does not stop the run.

If all four pass, the owner faces a bounded decision on cost and governance alone. If any fails, the decision should not be put to the owner yet.
