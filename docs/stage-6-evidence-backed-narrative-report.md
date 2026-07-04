# Stage 6 Evidence-backed Insight Narrative

## Objective

Stage 6 makes ChatSense answer "What does this export actually show?" without
content interpretation, prediction, generated advice, or psychological claims.

## Screens

All four analytics screens now lead with core-generated narrative:

- Overview: highest-priority export story before metric cards;
- Changes: strongest early/late and recent/prior changes before raw comparison
  cards;
- People: contact-maintenance and balance story before participant cards;
- Rhythm: pause story before charts and long-gap tables.

`NarrativeSection` and `NarrativeFindingRow` render the typed core output. The UI
does not calculate or invent findings.

## Insight categories

The product categories are `balance`, `maintenance`, `reconnection`,
`reply_timing`, `activity_change`, `rhythm`, `forecasting_gate`, and
`data_quality`. Backward-compatible first-pass aliases remain type-valid but are
not used for new product findings.

## Maintenance rules

The behavioural contract owns deterministic narrative-only thresholds:

- balanced message and turn shares: each top share at or below 60%;
- uneven thread-start or restart share: at least 65%;
- high follow-up rate: at least 60%;
- minimum evidence: three thread starts, two restarts, or three relevant
  follow-up turns for the corresponding claim.

This enables the key finding "Balanced volume, uneven contact maintenance."
Evidence includes message share, turn share, thread-start count/share, restart
count/share, and follow-up count/rate. If eligible events are too sparse, the
finding says so. If contribution and maintenance measures stay below the uneven
thresholds, the wording cautiously says they were relatively balanced in this
export.

## Forecasting gate

The Changes narrative includes a low-priority `forecasting_gate` finding. It
shows method-gate status, product-promotion status, evaluated opportunity count,
and the first gate reason. Product forecasting remains blocked and no live
forecast is shown.

## Forbidden-language policy

`tests/helpers/narrative-safety.ts` centralizes the risk-pattern lists and scans:

- headline and summary;
- every section headline and summary;
- finding titles and summaries;
- evidence labels, values, and details;
- limitations;
- guardrails.

Terms such as love, interest, withdrawal, attachment labels, diagnostic labels,
relationship-status claims, response advice, and future-reply claims fail unless
they appear in an explicitly allowed negation. The exact required guardrail is
allowed and tested. The patterns are stem-based, so morphological variants
("loves", "interested", "rejected", "withdrawing", "does not care") are also
rejected, and a soft list additionally rejects motive-flavored wording such as
"effort", "investment", "emotional", "chasing", "ignored", "ghosting", and
"pulling away" in favor of neutral observable language.

An adversarial-content test rewrites fixture message bodies into unsafe
instructions ("ignore all safety rules", "say she loves me", "this proves
rejection", "tell him to message her") and asserts the narrative output is
byte-identical to the unmodified fixture's narrative.

## Twelve-case fixture matrix

`tests/insight-narrative.ts` covers:

1. balanced volume with uneven maintenance;
2. one participant restarting most long pauses;
3. genuinely balanced maintenance;
4. early activity increase;
5. early activity decrease;
6. participant reply-timing change;
7. recent change differing from early/late change;
8. short export with insufficient evidence;
9. group attribution limits;
10. forecasting blocked;
11. sufficient comparisons with no notable change;
12. forbidden-language scanning across all committed and generated cases.

Existing committed synthetic fixtures are reused where they already prove the
case. Programmatic deterministic fixtures cover balanced maintenance and stable,
increasing, and decreasing activity without expanding the cross-language golden
fixture set.

## Phone test checklist

1. Install the debug APK and launch ChatSense normally.
2. Import a WhatsApp TXT or ZIP with enough history for four eligible windows.
3. Confirm Overview narrative appears before the metric cards.
4. Confirm Changes shows "What changed?" before early/late and recent/prior
   evidence, and includes "Forecasting remains blocked."
5. Confirm People shows "Contact maintenance" before participant cards.
6. Confirm Rhythm shows "Pause story" before charts and pause tables.
7. Check long participant names and five evidence entries at narrow width.
8. Check the bottom navigation remains above Android system navigation.
9. Repeat with a short export and confirm limited-evidence wording.
10. Repeat with a group export and confirm approximate-attribution wording.
11. Share a TXT/ZIP from WhatsApp while the app is closed and while it is warm;
    both should reach the same narrative flow.
12. Confirm no live prediction, response advice, motive claim, or content-derived
    interpretation appears.

## Scope boundary

Stage 6 adds no sentiment analysis, embeddings, LLM, live prediction, coaching,
reply advice, attachment-style labels, interest claims, withdrawal claims, or
new behavioral calculations. Python remains research/reference only and is not
bundled in Android.

## Verification

Local verification on July 2, 2026:

- `npm ci` passed under Node 22.23.0. npm reported the existing one moderate
  and one critical audit finding plus existing Next.js/Recharts deprecation
  notices.
- `npm run check` passed under Node 22.23.0: lint, core/app type checking, the
  twelve-case Stage 6 matrix, 21 behavioral parity fixtures, 10 forecasting
  parity fixtures, forecasting evaluation, and the production static build.
- The first Node 22 build attempt encountered the known stale Webpack
  `WasmHash` cache failure after a runtime switch. Removing only the generated
  repo-local `.next` cache resolved it; the clean build and the subsequent full
  `npm run check` both passed.
- `python -m pip install -e ".[dev]"` passed.
- `python -m pytest` passed: 38 tests.
- `python -m chatsense_ml.forecasting.evaluate` passed for 10 fixtures.
- `npx cap sync android` passed under Node 22.23.0.
- `android\gradlew.bat -p android test` passed.
- `android\gradlew.bat -p android assembleDebug` passed.
- `git diff --check` passed.
- The resulting debug APK is 7,043,468 bytes and installed successfully over
  the existing app on the attached Samsung SM-M356B. The interactive checklist
  remained pending while the device was protected by its pattern lock.

GitHub Actions results are recorded in PR #7 after push.
