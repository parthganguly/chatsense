# Stage 4 Relationship Dynamics Report

Stage 4 replaces whole-history averages and the earlier equal-message prototype
with deterministic longitudinal summaries of observable chat behavior.

## Scope

- Contract version: `2.0`.
- Runtime: TypeScript in `@chatsense/core`, consumed by the Capacitor app.
- Reference: Python in `python/chatsense_ml/features/relationship_dynamics.py`.
- Output: `ChatAnalysis.relationshipDynamics` in the app and
  `metrics.relationship_dynamics` in Python `report.json`.
- Not included: LLMs, sentiment, coaching, personality inference, attachment
  inference, mental-health inference, prediction models, or hidden-motive
  claims.

The Android app does not bundle Python. Python remains a local reference and
research implementation, with parity fixtures proving shared descriptive output.

## Algorithms

### Adaptive Calendar Windows

Windows are anchored to the first valid message date and include empty calendar
days. Window length comes from `contracts/behavioral_contract.json`:

| Export span | Window size |
| --- | --- |
| `<= 90` days | 7 days |
| `91-365` days | 14 days |
| `> 365` days | 30 days |

Each window exposes `start`, `end`, `partial`, `messageCount`, `activeDays`,
`turnCount`, `threadCount`, `reconnectionCount`, and participant summaries.
The final window is marked `partial` when it is shorter than the selected
calendar size.

### Conversational Turns

A new turn begins when one of these is true:

- the message is the first valid message;
- the sender changes;
- the gap reaches the canonical `thread_gap_min` threshold of 360 minutes.

Each turn exposes sender, start/end timestamps, start/end message indices,
message count, word count, duration, whether it starts a thread, and whether it
is the final open turn at export end.

### Threads, Reconnections, Follow-ups

- Thread start: first turn or any turn beginning after a gap of at least
  `thread_gap_min` minutes.
- Reconnection: first message after a gap of at least `reconnection_gap_min`
  minutes, currently 1440 minutes.
- Follow-up before reply: same sender sends again before anyone else responds,
  at least `follow_up_min` minutes passed, and the gap remains below
  `thread_gap_min`.

The app reports counts, shares, medians, and denominators only. It does not
infer why a person restarted, delayed, or followed up.

### Evidence-safe Comparisons

Window eligibility requires at least 20 messages and at least 2 active days.

| Comparison | Rule |
| --- | --- |
| Early versus late | Requires at least 4 eligible windows. Compares first 2 eligible windows with final 2 eligible windows. |
| Recent versus prior | Requires at least 2 eligible windows. Compares final eligible window with the immediately preceding eligible window. |

Metric-specific minima are enforced before directions are shown:

| Metric | Minimum |
| --- | --- |
| Reply latency | 5 replies per participant in each period |
| Thread-start share | 3 total starts in each period |
| Reconnection share | 2 total reconnections in each period |
| Follow-up rate | 3 relevant turns per participant in each period |

When samples are insufficient, the `MetricChange` is explicit:
`evidenceState = "insufficient"`, `direction = "unavailable"`, and
`notable = false`.

## Complexity

Let `n` be message count, `t` be turn count, `w` be adaptive-window count, and
`p` be participant count.

| Step | Complexity |
| --- | --- |
| Turn construction | `O(n)` |
| Reply/reconnection/follow-up event extraction | `O(n)` |
| Adaptive window summaries | `O(w * (n + t + p))` in the current small-export implementation |
| Comparison construction | `O(p)` per comparison after period filtering |
| Parity normalization | `O(n + w + p)` |

This is appropriate for local WhatsApp exports. If very large exports become a
problem, the window summarizer can be optimized with one pass plus bucketed
indices without changing the contract.

## Schema

`relationshipDynamics` exposes:

- `windowSizeDays`;
- `turns`;
- `adaptiveWindows`;
- `participantSummaries`;
- `pauseSummary`;
- `earlyLate`;
- `recentPrior`;
- `notableChanges`;
- `changeInsights`.

Each `MetricChange` includes metric, label, optional sender, earlier/later
values, absolute and relative difference, earlier/later period dates, sample
sizes, direction, evidence state, notable state, explanation, and guardrail.

The Python report schema was updated to require `metrics.relationship_dynamics`
for schema version `2.0`.

## Fixture Matrix

The Stage 4 fixture matrix is synthetic and committed under `fixtures/whatsapp`:

| Fixture | Purpose |
| --- | --- |
| `stage4_balanced_then_one_sided` | Eligible windows, early/late and recent/prior comparisons, late one-sided turns |
| `stage4_increasing_initiation` | Thread-start share changes by participant |
| `stage4_reply_slowdown` | Participant-specific reply slowdown and follow-up changes |
| `stage4_multi_reconnectors` | Multiple 24-hour pauses with different reconnectors |
| `stage4_same_sender_burst_turn` | Same-sender burst remains one turn |
| `stage4_followup_15_min_boundary` | Exact 15-minute follow-up boundary |
| `stage4_six_hour_thread_boundary` | Exact 6-hour thread boundary |
| `stage4_insufficient_export` | Explicit unavailable comparisons |
| `stage4_group_reply_edges` | Group-chat approximation remains visible |
| `stage4_final_open_turn` | Final open turn at export end |
| `stage4_partial_final_window` | Partial final adaptive window |
| `stage4_exact_boundaries` | Combined 15-minute, 6-hour, and 24-hour boundary checks |

Golden parity JSON lives under `fixtures/expected` and is regenerated only with:

```bash
python -m chatsense_ml.synthetic.fixtures --expected
```

## Verification Results

Final verification for this PR was run locally with Node 22. The completed
command results were:

| Command | Result |
| --- | --- |
| `npm ci` | Passed on Node `v22.21.1`; npm reported existing audit/deprecation warnings |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test` | Passed: import/boundary tests and relationship-dynamics tests |
| `npm run test:parity` | Passed for 21 fixtures |
| `npm run build` | Passed after deleting stale generated `.next` cache |
| `python -m pip install -e ".[dev]"` | Passed |
| `python -m pytest` | Passed: 20 tests |
| `npx cap sync android` | Passed |
| `android/gradlew test` | Passed |
| `android/gradlew assembleDebug` | Passed |
| `git diff --check` | Passed with Windows CRLF normalization warnings only |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk` |
| Device verification | Not run: ADB returned an empty device list after daemon restart |

## Product Changes

- The fourth tab is now `Changes`.
- Overview uses `Historical reply timing`, not reply probability.
- Rhythm uses `Messages by weekday` and `Pauses and restarts`.
- People uses `Who keeps contact moving` for exactly two participants and keeps
  sender-switch edges only for group chats with an approximation warning.
- Changes shows early/late, recent/prior, adaptive windows, participant turn
  share, reply timing, initiations, reconnections, and follow-up behavior.

## Limitations

- Group-chat reply edges are previous-sender approximations. Quoted replies,
  mentions, and side threads are not resolved.
- Word counts are behavioral volume features, not semantic interpretation.
- Time zones are not inferred from exports; parsed timestamps preserve exported
  local clock time.
- Comparisons depend on exported history only. Deleted history, omitted context,
  or missing chats can change conclusions.
- Insufficient samples intentionally suppress directional labels.
- This stage is descriptive only. Prediction, anomaly forecasting, survival
  modeling, and recommendation systems remain future research work.
