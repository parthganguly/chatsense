# Stage 8A implementation report — Relationship Read MVP

**Branch:** `product/human-relationship-read-stage-8a` · **Base:** `e56b196` (merged master plan + audit) · **Date:** 2026-07-13

Stage 8A makes the first screen answer a normal person's question directly, without removing the inspectable statistics underneath: one **Relationship Read hero card** at the top of Overview, computed entirely in `@chatsense/core`, over metrics the engine already shipped. Local-only, deterministic, content-independent, non-LLM, non-diagnostic, non-advisory.

## 1. Removed dead systems (audit §24.2)

Confirmed unused by grep over the entire UI, then deleted:

- `ChatAnalysis.insights` and `buildInsights` in `chat-analyzer.ts` (carried an off-contract 65% threshold);
- `relationshipDynamics.changeInsights` and `buildChangeInsights` in `relationship-dynamics.ts`;
- the shared `ObservableInsight` type (both copies) and `components/analytics/InsightRow.tsx`.

The one test that read `analysis.insights` (`testOverviewUsesPauseSummaryInsteadOfRawUnusualSilenceCount`) now asserts the live rhythm narrative instead. Parity was unaffected (the deleted fields were outside the shared scope); grep for `insights|changeInsights|InsightRow|ObservableInsight` over source is clean.

## 2. Silence semantics (audit §24.1)

Two concepts, both truthful, implemented in `relationship-read.ts`:

- **Latest completed quiet stretch.** `pauseSummary.latestGapMinutes` keeps its shipped meaning (last *completed* inter-message gap) and is only ever described as completed history ("It has already ended; this is history, not the current state"). For the hero card, completed **day-plus** stretches are derived from existing conversation turns (`completedQuietStretches`) — any inter-message gap ≥ the 24h reconnection floor is also a turn boundary, so this is a pure re-reading of shipped data, proven equal to `pauseSummary.longPauseCount` and `reconnectingParticipants` by test on every fixture.
- **"Quiet so far."** Derived from the export's last message to a caller-supplied clock (`nowMs`); the import hook passes `Date.now()` once at import. It is **right-censored**: worded as "quiet for at least … so far", ranked against completed day-plus stretches, and **never included in its own reference distribution** (`OngoingQuiet.comparableCount` equals the completed-stretch count, asserted by test). If no clock is supplied, or the clock precedes the export end, no ongoing-quiet figure is invented.

Every state that leans on the export's end carries the staleness line: *"Measured from the export's last message on DATE. If you have spoken since then, re-export for a current read."*

`ChatAnalysis` itself remains clock-free, so `analyzeChat` determinism and the existing byte-identity tests are untouched. The Rhythm tab's Layer-3 percentile row is unchanged (its demotion is Stage 8B scope per the audit); the hero card and Rhythm cannot contradict because the hero derives its pause history from the same turns that feed `pauseSummary` (tested).

## 3. The four hero states

`buildRelationshipRead(analysis, { nowMs })` returns one `RelationshipRead`:

1. **Pattern change** — qualifies when any contract-owned notable change with sufficient evidence exists in `earlyLate`/`recentPrior`. Shows what changed, earlier and later values, period dates, and both sample sizes. Never explains why (tested). Confidence: strong when the same change appears in both comparisons or ≥2 distinct signals crossed thresholds; else moderate.
2. **Carried contact** — the scenario-research §12 five-label hierarchy over four constructs (conversation starts, restarts after day-plus pauses, follow-ups before a reply, turn share), each gated by existing contract minimums:
   - *balanced*: ≥2 evaluable constructs, all within the balanced band (top share ≤60%);
   - *mixed*: constructs disagree (one lean with others even, or leans toward different people), and also the weaker-claim fallback when a lean exists but the export is too short to compare periods;
   - *consistently asymmetric*: ≥2 constructs ≥65% toward the same person **and** the early/late comparison shows the earlier period already leaned (≥65%);
   - *recently becoming asymmetric*: same agreement, with the earlier period inside the balanced band (≤60%) and the later period ≥65%;
   - *insufficient*: <2 constructs evaluable → the state does not qualify and the read falls through to honest insufficiency.
   Message or turn volume alone can never produce an asymmetric label (structural: volume is not a construct; tested with a volume-skewed fixture). Group chats (>2 participants) never receive this state — participation facts stay on the People tab, never a pairwise read.
3. **Unusual silence** — the ongoing quiet (preferred when qualified) or the latest completed day-plus stretch, ranked against completed day-plus stretches as **natural counts** ("longer than 8 of the 10 earlier day-plus quiet stretches"), never percentiles (tested). Qualification: ≥5 comparable completed stretches and a rank at or above 80% of them (contract-owned). Evidence: the current/latest quiet with dates, restart composition ("all N earlier stretches ended with a new message — k first messages from X"), and duration spread (typical and longest). Confidence from reference size: ≥20 strong, ≥10 useful, else light.
4. **Honest insufficiency** — a designed answer, never an error: "Not enough here to read a pattern yet… That is the answer, not an error — nothing is filled in with a guess," followed by up to three concrete missing-evidence facts with the exact counts and floors (days/eligible windows, conversation starts, day-plus stretches, reply samples). Insufficient data is never converted to zero or a weak guess.

## 4. Selection priority

Each state qualifies on its own evidence bar; among qualified states the priority is **unusual silence → pattern change → carried contact**, with insufficiency when nothing substantive qualifies. A confidence-ranked selection was considered and rejected: it would let a long balanced history ("Strong read") outrank an acute 200-day unusual silence whose reference history is thin ("Light read") — the acute question the user opened the app with would lose to the chronic one. Each card's own confidence label carries the strength information instead. No composite relationship score exists anywhere.

## 5. Evidence and confidence rules

- Up to three visible evidence facts per card; every fact carries a count and, where applicable, dates (tested across all fixtures and generators).
- Confidence uses the existing `TakeawayConfidence` machinery and the three shipped product labels via `takeawayConfidenceLabel` (tested).
- Presentation thresholds are contract-owned in a new `relationship_read` section of `contracts/behavioral_contract.json`, mirrored in `contract.ts` and proven equal by `tests/parity.ts`. The section is explicitly TypeScript-only (a presentation mapping layer); Python mirrors no new math because there is none — shared behavioral math is unchanged and all 21 parity fixtures pass byte-identical.

## 6. Estrangement suppression

Implemented as logic, not copy: `isEstrangementShaped` — at least half (contract: `estrangement_dominance_min_share_pct`) of completed day-plus stretches ran ≥60 days (`estrangement_pause_min_days`). When true, no historical-next-pattern sentence is generated (`historicalNote: null`, `historicalNoteSuppressed: true`), even though enough completed pauses exist. Otherwise the note appears only with ≥3 comparable completed pauses, its subject is always the chat ("this chat picked back up all N times inside this export"), and it self-labels as history: "That is a count of the past, not a promise about this quiet."

## 7. Copy boundary

Relationship-neutral defaults throughout: "this chat", "this export", "quiet stretch", "started most conversations", "keeping this chat moving". No motive, emotion, attachment, love, rejection, or relationship-status language; no "cares more", "trying harder", "losing interest", "chasing", "withdrawal"; no romance-coded "warming/cooling/pulling away"; no percentile or probability jargon in hero copy; no person-subject forward statements. Every claim-bearing card carries its scenario-specific limitation **inside** the card so screenshots cannot detach claim from caveat.

## 8. Tests

`tests/relationship-read.ts` (22 tests) over existing fixtures (`stage4_reply_slowdown`, `stage4_insufficient_export`, `stage4_balanced_then_one_sided`, `group_chat`, `stage4_group_reply_edges`, all 21 fixture files for the sweep tests) plus deterministic in-test generators for the states no committed fixture covered (balanced, volume-skewed balanced, mixed, consistently asymmetric, recently-becoming-asymmetric, unusual completed gap, unusual/ordinary ongoing quiet, estrangement-shaped bursts):

pattern change · balanced · volume-never-decides · mixed · consistently asymmetric · recently becoming asymmetric (with fixture preconditions asserted: full-export lean without any notable change) · unusual completed gap · unusual ongoing quiet · ordinary ongoing quiet · estrangement suppression · honest insufficiency · export-end censoring (ongoing quiet excluded from its own reference; no clock → no figure; clock skew → no figure) · stale-export wording · tie-breaking priority (silence + notable change → silence) · group-chat exclusion · deterministic output · adversarial message content byte-identical (`JSON.stringify` equality, with and without a clock) · evidence bullets counted and capped at three · confidence labels from existing machinery · no forbidden claims (scanner over every read for every fixture × three clock offsets) · hero/Rhythm consistency (derived stretch history equals `pauseSummary`) · Overview renders the hero card above the takeaway and the card component computes nothing.

`tests/helpers/narrative-safety.ts` gained `assertRelationshipReadLanguageSafe`, scanning headline, summary, every evidence sentence, historical note, limitation, staleness line, and confidence label with the same high/soft-risk pattern lists. All existing fixtures and tests remain green.

## 9. Verification (all run 2026-07-13, this machine)

| Check | Result |
|---|---|
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run test` | pass (7 suites incl. new relationship-read) |
| `npm run test:parity` | pass (21 fixtures, byte-identical) |
| `npm run test:forecast-parity` | pass (10 fixtures) |
| `npm run forecast:eval` | pass (10 fixtures written) |
| `npm run build` | **first run failed** with the known stale-cache error (`WasmHash._updateWithBuffer: Cannot read properties of undefined`); deleted only `.next`, **second run passed** |
| `npm run test:viewport` | pass (6/6 across 360×800, 390×844, 412×915; hero above takeaway, no overflow, nav intact) |
| `python -m pip install -e ".[dev]"` | pass |
| `python -m pytest` | pass (38 tests) |
| `python -m chatsense_ml.forecasting.evaluate` | pass (10 fixtures) |
| `npx cap sync android` | pass |
| `android gradlew test` | pass |
| `android gradlew assembleDebug` | pass (`android/app/build/outputs/apk/debug/app-debug.apk`, ~7.1 MB) |
| `git diff --check` | clean |
| Maestro / physical device | **not run — no device connected** (`adb devices` empty). No device verification is claimed. |

## 10. Remaining limitations

- The comparable-pause class is the 24h contract floor; sub-day silences never trigger the silence state even in minutes-cadence chats (scenario research §11 accepts this for MVP; tercile-based comparability is Stage 9).
- The carried-contact *mixed* label can fire at contract minimums (3 starts, 2 restarts), which is thin evidence for a "Useful read" tag — the raw counts are always visible in the card, but the comprehension check should watch whether readers over-weight it.
- "Quiet so far" is computed once at import; re-opening the app without re-importing does not advance it (consistent with "nothing new can change until you re-export").
- The details affordance is an in-page anchor plus a named tab ("See the evidence in the Rhythm tab"); it does not switch tabs programmatically.
- Rhythm's "Latest gap percentile" Layer-3 row still exists; demoting it is Stage 8B.
- Real-export parser gaps (LRM, dot dates, encoding) are untouched — Stage 8B scope.

## 11. Required before Stage 8B

The audit §29 human comprehension check: 8–10 participants, the five rendered scenario cards from synthetic fixtures, two core questions ("What does this tell you?" / "What does it *not* tell you?"), ≥1 non-romantic scenario, pre-registered thresholds — notably **zero** participants reading the historical-next-pattern sentence as a promise, and ≥8/10 correctly stating the app doesn't claim motives or predict replies. Failing comprehension blocks 8B and triggers a copy revision, not a feature change.
