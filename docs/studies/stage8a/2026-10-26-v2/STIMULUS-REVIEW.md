# Astra review of the P0 v2 rendered cards

Inspected 26 October 2026: every newly captured selected PNG and its exact DOM text/HTML. These are actual element screenshots after synthetic import into the production export built from independently accepted code `72eeb00d436d3a85a117fb8fced3cf7597b12d31`. They are not reconstructed cards. Sol's independent UX PASS on that exact revision preceded Astra's successful capture. The manifest records the acceptance/capture timestamps, source/tree/lockfile/component hashes, build ID, browser, fonts/styles, original fixed clocks and every image hash.

## Selected presentation — binding before P1

Only `stimuli/captures/s8a-v2-c[1–5]-*.selected.card.png` is a study stimulus. DPR1, light scheme, en-US locale, UTC; every selected image is 344 pixels wide. Display at native 100% (one image pixel per CSS pixel), centered on plain white, on a display with at least 384 usable CSSpx width and 800 usable CSSpx height. The largest image is 656px high. Verify the entire image, including the final link, is visible before starting the ten-second silent read. Keep it visible for all questions and rereading. Never crop, scale-to-fit, reconstruct, highlight, add a caption/disclaimer, or show adjacent app onboarding or reviewer notes. If this cannot be met, postpone and use the preregistered exposure/missingness rule; do not substitute a variant.

The capture viewport was an actual 384×1200 CSSpx browser at DPR1. The entire card was inside its actual main scroll container before element capture; no card/style/DOM injection was used. This avoids shell clipping without modifying the rendered component. The viewport size is capture provenance, not a requirement to show the whole app in the study. The original v1 selected cards were also complete; their longest 634px image fit the old 638px desktop main after element scrolling. V2's larger 656px D card needs the explicit taller capture viewport. We do not retroactively label v1 selected images clipped.

Desktop 1280×1000 and mobile 390×844 first-screen files are audit context only. They are never alternative participant stimuli. All three capture contexts have identical card text. First-screen audit images may omit a below-fold link; the selected whole-card images omit nothing. No physical Android validation or participant readability result is claimed.

| Card | Actual unchanged headline | Native v1 → v2 dimensions |
| --- | --- | --- |
| A | The pattern in this chat measurably changed. | 344×520 → 344×546 |
| B | Keeping this chat going has been shared. | 344×490 → 344×500 |
| C | The keeping-in-touch picture is mixed. | 344×514 → 344×520 |
| D | The current quiet is long for this chat. | 344×634 → 344×656 |
| E | Not enough here to read a pattern yet. | 344×522 → 344×508 |

The full IDs and original v1 mapping are in stimuli/manifest.json. These five scenarios arise from four engine states: B and C are distinct carried-contact labels. Asha and Ravi are synthetic fixture labels, not participants; relationship type/motive cannot be inferred from names.

## Scientific content inspected

A retains Ravi's 5min→1.5h and Asha's 1.9h→30min comparisons, 20/20 and 19/20 observed counts, exact date windows and May 7 export-staleness note. Its limitation does not say why the pattern moved. B retains 76/76 starts,4/4 restarts and zero follow-up frequencies; the fixed interview supplies the neutral friendship context. C retains 112/40 starts with 4/4 restarts and zero follow-ups; disagreement remains the finding. B/C do not measure reasons or contact elsewhere.

D retains at least 15 days so far, comparison with 10/10 earlier completed quiet stretches,7/10 restarts from Ravi, typical 2.1 days/longest 2.6 days, Mar 29 export end, and the explicit “count of the past, not a promise about this quiet” sentence. No current-quiet endpoint, future probability or reply time is inferred. E retains 1 day, 0 eligible windows (needs 4),1 start (needs 3),0 completed day-plus stretches (needs 5), substantive abstention, and “Nothing here means something is wrong.” Its re-export wording is not permission to ask for participants' messages.

Exact fixture bytes, expected reads, frozen timestamps, counts, dates, all scientific strings, Strong/Useful/Light labels, DOM order and details href remain identical to frozen v1. A/B/C/E use export end +1 hour; D uses +15 days. Each clock is installed before navigation. Selected innerText is byte-identical to v1 and independently checked in each audit context. Source core/contracts/inference are unchanged. The manifest contains the full text and hashes rather than relying on these descriptive notes.

## Deliberate presentation amendment

The old limitation was 11px, rgb(148,163,184) on white,2.56:1. It is now 14px with 20px leading, rgb(51,65,85) on white,10.35475:1. Evidence and staleness grow 12→14px; their contrast rises 4.76→7.58. Historical text grows 12→14px, retaining 7.58 contrast. “Counted in this export” grows 11→12px with 7.58 contrast. Confidence pills grow 11→12px and use slate-700 on slate-100 at 9.45:1; details links grow 12→14px and retain 7.68:1. Headline 20px/28px, summary 14px/20px and eyebrow 12px remain legible. The manifest records each measured row, including unchanged rows; no unmeasured v1 line-height is invented.

The frame is now uniform slate-200, including the left accent, instead of the old state-dependent grey/violet emphasis. Read-strength labels and wording are unchanged. Header wrapping, compact vertical gaps and padding preserve readable body size while fitting D's entire limitation above desktop navigation. These are real stimulus changes that may affect comprehension; software contrast checks are not proof of improved human understanding. No causal v1/v2 comparison is planned.

Every claim-bearing text pair in the settled captured card exceeds 4.5:1; minimum 7.57766:1. All ancestors have opacity 1 before capture. Sol independently tested light/OS-dark preference, 320px reflow, genuine 200% text doubling at 320/390px, individual line reachability, badge bounds, keyboard focus/activation and fresh long/unbroken-text counterexamples. D's unscrolled desktop limitation ends at 814, main ends 823, clearance 9px. Its details link 827–847 needs a scroll; the complete selected image includes it. All five ordinary 390×844 cards include their final links above navigation. This is scoped hero-card acceptance, not whole-app WCAG conformance; see consultations/sol-ux/UX-REVIEW.md for evidence and limits. Reference standards: [W3C contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [resize text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

## Retained scientific and product cautions

Strong/Useful/Light read tags can prime confidence or usefulness. D's repeated historical count can still be misunderstood; a visible disclaimer never substitutes for the zero-promise human gate. B/C name four measures but list three evidence bullets; do not penalize inability to retrieve an omitted turn-share count. C's awkward conjunctions and A's date formats remain. All counts/percentages are descriptive, not predictions. The interview and strict rubric remain necessary.

The global shell title/refresh overlap at 320px+200% and details labels pointing to Overview rather than the named tabs remain unchanged and are documented separate product issues. Neither obscures a selected card-only study image. The study concerns fixed hero-card interpretation, not navigation, whole-app accessibility or daily use. Actual browser UI zoom, screen-reader, forced-colors, physical-device and other browser-engine conformance were not tested. A different presentation or copy would require another preregistered version before exposure.

## Capture integrity and review

The first Astra capture attempt timed out waiting for a hero during D's desktop import. Its 22 partial files, exact original script and failure log remain under stimuli/verification/failed-capture-attempt-1, labeled unused. The uninstrumented cause is not asserted. The final harness waits for network/font readiness, activates the visible import button and uses its real file chooser/input; it logs each context and records diagnostics on failure. A fresh full 15-context run completed with no page errors. No partial image was reused. These harness changes alter neither product code nor the post-import scientific stimulus.

Astra viewed all five final selected images and verified every line/link present. All five final PNG byte hashes independently match Sol's separately built/captured native card images. This is rendering reproducibility, not human evidence. The final stimulus manifest SHA-256 is `ebae573647051612c7eaa7b553d53aa267c6263a14d7dbf5599b0585ab706f1c`.

| Selected image | SHA-256 |
| --- | --- |
| A | `eea78a25698389ab31dc52a232b7384b6165444157680f34219e171065c0b51f` |
| B | `c8498e524874adf000a693c46a7e1a2154d6392e24759494f1de0bd3713f5adf` |
| C | `70470d8b2a3ba4c7c738dd09088a1f05cd786ee2b07dcf375a607e23685ed602` |
| D | `56b2ac46dcaa48cfd11e229b462d6bd2ac1f8b6630ec965723dfecbdc7106816` |
| E | `77f4339d31bc6a333b70b6c5f010e3b31c8882f063a29619f98d037f9c82082e` |
