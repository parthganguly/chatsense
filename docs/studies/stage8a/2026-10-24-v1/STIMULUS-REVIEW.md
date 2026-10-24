# Astra review of the actual rendered stimulus set

Inspected 24 October 2026: all five **desktop card PNGs** and their captured DOM innerText, plus the D mobile first-screen capture. These are element screenshots of the real production app after importing synthetic files through the file input. They are not reconstructed cards or hypothetical copy. The technical capture compares every core-generated text piece and quantity with the DOM, and verifies identical mobile/desktop text. See stimuli/manifest.json and stimuli/verification/ for the full evidence.

## Frozen study presentation

Use only `stimuli/captures/s8a-v1-c[1–5]-*.desktop-1280x1000.card.png`, in the A–E mapping below. Captured at device pixel ratio 1, light scheme, en-US locale and UTC timezone; each image is 344 pixels wide. Heights are A 520, B 490, C 514, D 634, E 522 pixels. Display at native 100% image scale without resampling or cropping on a laptop/desktop with at least 800 usable CSS pixels of height. Center the image on a plain white background; no adjacent app text, captions or visible reviewer notes. Verify the whole image including its final link fits before beginning the timed read. No screenshot overlays, highlighted caveats, added disclaimers or new UI copy.

The capture viewport (1280×1000) is provenance, not a requirement that the participant view the entire application screenshot. The complete hero-card PNG is the fixed study stimulus. The mobile DPR-3 PNGs and full-page/first-screen captures are **audit context only**, not interchangeable study variants. The mobile cards also fit the captured first screen; using the DPR-1 files avoids image-viewer scaling ambiguity. Native Android/device usability is not being validated.

| ID | Actual headline | Evidence and limit inspected |
|---|---|---|
| A / c1-pattern-change | The pattern in this chat measurably changed. | Ravi's typical reply: 5 minutes to 1.5 hours, 20/20 observed events; Asha's 1.9 hours to 30 minutes, 19/20. Periods and May 7 export-end caveat are visible. Limitation says it does not say why the pattern moved. |
| B / c2-carried-balanced | Keeping this chat going has been shared. | 76/76 conversation starts, 4/4 restarts; zero follow-up rates. Counts do not measure anyone's reasons or contact elsewhere. This is the fixed friendship-context example. |
| C / c3-carried-mixed | The keeping-in-touch picture is mixed. | 112/40 starts but 4/4 restarts, zero follow-up rates; summary explicitly says the measures disagree. Same reasons/outside-contact caveat. |
| D / c4-unusual-silence | The current quiet is long for this chat. | At least 15 days so far, longer than 10/10 earlier day-plus stretches; 7/10 first messages from Ravi. Earlier typical 2.1 days, longest 2.6. The historical paragraph says “a count of the past, not a promise about this quiet.” Export end Mar 29 and outside-contact/motive limits are visible. |
| E / c5-insufficient | Not enough here to read a pattern yet. | 1 day, 0 eligible comparison windows (needs 4); 1 start (needs 3); 0 completed day-plus stretches (needs 5). It explicitly says this is an answer, not an error or guess, and that nothing here means something is wrong. |

Filenames include the longer exact IDs in stimuli/manifest.json. A–E always refer to the rows above; the five scenario cards arise from four underlying engine states because B and C are different carried-contact labels.

## Clock and content integrity

The first three and E use each export end plus one hour; D uses export end plus fifteen days. Playwright installs each fixed clock before navigation/import. This is necessary: using the present date would change ongoing-quiet calculations and potentially select a different hero state. The synthetic dates are scenario dates, not the study date. No source logic or text was modified to get a preferred screenshot. The generator records its source in existing committed fixtures/test generators; build ID, lockfile hash, fixture bytes and built-output inventory are frozen by the technical manifest.

Only the DOM text from the selected screenshot version may ground coding. Asha/Ravi are synthetic fixture labels, not participants. The artifact includes real-sounding invented names solely because they are in the synthetic test data. Do not infer relationship type or motives from those names.

## Observed risks and the scientific response

- The limitations are small and pale (11 px text); they are nevertheless present in each captured card. Preserve this actual typography and ask the frozen evidence-visibility question. This preparation does not claim a readability or accessibility pass from researcher inspection. Someone unable to read the native-scale display should not be coached or shown an enlarged variant as if it were the same stimulus; record the display limitation and follow the preregistered missingness rule.
- Computed limitation contrast is 2.56:1 against white; evidence/staleness text measures 4.76:1. The limitation is below the 4.5:1 minimum for ordinary text described in [W3C's WCAG 2.2 contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), checked 24 October 2026. The build's competing border classes also cause A/D to render grey borders and B/C full violet outlines. These are known presentation differences, not image edits; no inference about participant perception is made from them alone. P0 readiness is readiness to test this version, not an accessibility or product-safety approval.
- A/B say “Strong read”; C/D say “Useful read”; E says “Light read”. These actual tags may encourage confidence or prime a usefulness rating. The rubric checks unsupported motives/replies even when a person likes the screen. Do not tell participants what the tags mean before scoring.
- D repeats the 10/10 historical restarts. It also carries an explicit history-not-promise sentence. A disclaimer is not evidence that a human understood it: the zero-promise gate still requires all ten assessable responses.
- B/C include percentages for observed follow-up rates. These are descriptive frequencies, not predicted reply probabilities. Their presence is recorded rather than silently rewritten into alternative copy.
- B/C summarize four measures but show only three evidence bullets; turn share is not in those bullets. The study must not penalize a person for being unable to retrieve an omitted turn-share count from the screenshot. Their ability to find underlying interactive detail is outside this card-only protocol. C's repeated “and” phrasing and A's ISO period ranges are preserved as rendered.
- E asks for more history in its rendered limitation; the facilitator must not turn that into a request for a participant's private export. No such import is part of this study.
- Card-only screenshots retain the entire claim/caveat but omit onboarding, lower analytics and interactive tab navigation. Results therefore concern these fixed hero-card presentations, not the whole app's accessibility, discoverability or daily use.

No factual contradiction or new motive/forecast claim was found in the five rendered cards requiring a copy repair before this study. Existing typography, label and evidence-salience risks remain targets of the comprehension pilot. No copy repair is silently mixed into this preregistration; a future necessary repair would get a separate draft PR, a new stimulus version and fresh testing.
