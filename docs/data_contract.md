# ChatSense ML Data Contract

This contract defines the Phase 1 local analytics outputs. The analyzer must not claim hidden motives, diagnoses, or mental-health conclusions.

The stable machine-readable report schema is committed at `contracts/report.schema.json`.

## `report.json`

Top-level required fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schema_version` | string | yes | Contract version, currently `2.0`. |
| `conversation` | object | yes | Conversation metadata and counts. |
| `participants` | array | yes | Per-sender summary objects. |
| `metrics` | object | yes | User-readable behavioral metrics. |
| `graph` | object | yes | Interaction graph summary. |
| `warnings` | array[string] | yes | Privacy and safety warnings. |

### `conversation`

| Field | Type | Nullable | Description |
| --- | --- | --- | --- |
| `conversation_id` | string | no | Stable hash derived from message content. |
| `source_name` | string | yes | Input file name when available. |
| `message_count` | integer | no | Count of cleaned message rows. |
| `participant_count` | integer | no | Count of unique senders. |
| `started_at` | ISO datetime string | yes | First message timestamp. |
| `ended_at` | ISO datetime string | yes | Last message timestamp. |

### `participants[]`

| Field | Type | Nullable | Description |
| --- | --- | --- | --- |
| `sender` | string | no | Display name from export. |
| `message_count` | integer | no | Sender message count. |
| `word_count` | integer | no | Sender word count. |
| `message_share` | number | no | Fraction of all messages. |
| `word_share` | number | no | Fraction of all words. |
| `median_reply_delay_min` | number | yes | Median delay before this sender replied. |

### `metrics`

Required groups:

- `reply_dynamics`: average/median reply delay, quick-reply rate, late-reply rate, per-sender medians.
- `silence_gaps`: longest silence, median gap, count of gaps over 24 hours.
- `sender_balance`: message and word balance scores, one-sidedness.
- `initiation`: conversation/thread initiation counts and ratios.
- `activity`: daily counts, peak hour, peak weekday, active day ratio.
- `relationship_dynamics`: adaptive windows, turns, reconnections, follow-ups, and evidence-safe comparisons.

### `metrics.relationship_dynamics`

This object mirrors the descriptive Stage 4 relationship-dynamics model. It is
not part of the future-label research pipeline.

Required groups:

- `window_size_days`: selected adaptive calendar window size.
- `turns`: ordered conversational turns with sender, start/end, message count,
  word count, duration, thread-start flag, and final-open-turn flag.
- `adaptive_windows`: calendar windows with message count, active days, turns,
  thread starts, reconnections, participant summaries, eligibility, and partial
  state.
- `participant_summaries`: full-export sender summaries for turn share, reply
  timing, thread starts, reconnections, and follow-ups.
- `pause_summary`: pauses at or above 24 hours, latest-gap percentile compared
  only with earlier gaps, median inter-message gap, five longest observed
  pauses with start/end/duration/reconnecting sender, and reconnecting
  participants.
- `early_late` and `recent_prior`: comparison objects with availability,
  periods, metric changes, sample sizes, evidence state, and notable state.
- `notable_changes`: sufficient changes that cross canonical thresholds.
- `change_insights`: guardrailed observable insight text.

### `warnings`

Every report must include warnings equivalent to:

- Analysis is based only on exported messages, not full relationship context.
- Reply delays and message patterns are behavioral observations, not proof of hidden intent.
- Do not use this report to diagnose mental health, personality, or relationship status.

`report.json` is generated from the Python core pipeline only. It must not include research-only future labels such as `next_reply_delay_bucket`, `next_window_activity_level`, or `next_window_imbalance_change`.

## `features.parquet`

Each row represents one cleaned message. Timestamps are UTC-naive pandas timestamps preserving exported local clock time.

| Column | Dtype | Nullable | Description |
| --- | --- | --- | --- |
| `conversation_id` | string | no | Stable conversation hash. |
| `message_id` | string | no | Stable per-message id. |
| `message_index` | int64 | no | Zero-based message order. |
| `timestamp` | timestamp[ns] | no | Parsed local timestamp. |
| `sender` | string | no | Sender display name. |
| `text` | string | no | Cleaned message content. |
| `message_type` | string | no | `text`, `media`, `deleted`, or `system`. |
| `contains_media` | bool | no | Whether message indicates omitted media. |
| `is_deleted` | bool | no | Whether message indicates deletion. |
| `text_len` | int64 | no | Character count. |
| `word_count` | int64 | no | Whitespace-token word count. |
| `hour` | int64 | no | Timestamp hour. |
| `weekday` | int64 | no | Monday=0. |
| `date` | string | no | ISO date. |
| `prev_sender` | string | yes | Sender of previous message. |
| `is_reply` | bool | no | Sender differs from previous sender. |
| `gap_min` | float64 | yes | Minutes since previous message. |
| `reply_delay_min` | float64 | yes | `gap_min` only when `is_reply`. |
| `is_quick_reply` | bool | no | Reply under 5 minutes. |
| `is_late_reply` | bool | no | Reply over 24 hours. |
| `sender_message_count_so_far` | int64 | no | Sender cumulative count through current row. |
| `sender_message_share_so_far` | float64 | no | Sender share through current row. |
| `initiates_thread` | bool | no | First message or message after long silence. |
| `rolling_20_message_count` | int64 | no | Messages in current 20-message window. |
| `rolling_20_unique_senders` | int64 | no | Unique senders in current 20-message window. |
| `rolling_20_reply_rate` | float64 | no | Reply fraction in current 20-message window. |
| `rolling_20_avg_gap_min` | float64 | yes | Average gap in current 20-message window. |
| `rolling_7d_message_count` | int64 | no | Count in trailing 7 days. |
| `rolling_7d_sender_share` | float64 | no | Sender share in trailing 7 days. |
| `next_reply_delay_bucket` | string | yes | Delay class until the next future message from a different sender. |
| `next_window_activity_level` | string | yes | Future activity relative to baseline: `low`, `normal`, `high`. |
| `next_window_imbalance_change` | string | yes | Future balance change: `more_balanced`, `same`, `more_one_sided`. |

Label columns must only use messages after the current row/window. They must never use current-row future values as features. `next_reply_delay_bucket` specifically looks forward from the current message until the next message by a different sender, so consecutive messages from the same sender do not become artificial replies.

## Shared parity output

The cross-language parity contract is narrower than `report.json`. It contains only metrics the TypeScript Android runtime and Python reference implementation both promise to compute identically from non-system messages:

| Field | Type | Description |
| --- | --- | --- |
| `message_count` | integer | Non-system message count. |
| `participant_count` | integer | Unique non-system sender count. |
| `participants[]` | array | Sender, message count, word count, integer message-share percent. |
| `reply_count` | integer | Count of sender-switch reply events. |
| `thread_count` | integer | Count of messages that initiate a thread. |
| `peak_hour` | integer/null | Busiest hour. |
| `peak_weekday` | string/null | Busiest weekday name. |
| `quick_reply_rate_pct` | integer | Reply delays under the quick-reply threshold. |
| `within_one_hour_rate_pct` | integer | Reply delays at or below one hour. |
| `within_six_hours_rate_pct` | integer | Reply delays at or below six hours. |
| `within_one_day_rate_pct` | integer | Reply delays at or below one day. |
| `avg_reply_delay_min` | integer/null | Rounded average reply delay. |
| `median_reply_delay_min` | integer/null | Rounded median reply delay. |
| `longest_silence_min` | integer/null | Rounded longest inter-message gap. |
| `unusual_silence_count` | integer | Count of gaps above the canonical runtime silence threshold. |
| `reply_edges[]` | array | Directed `from` responder to `to` previous-sender edge counts. |
| `relationship_dynamics` | object | Turns, participant summaries, pauses, adaptive windows, and evidence-safe comparisons normalized for TypeScript/Python equality. |

Golden parity outputs live in `fixtures/expected/*.json`; tests must read those files and compare exact equality. Do not regenerate expected files during normal tests. To intentionally refresh the golden outputs, run:

```bash
python -m chatsense_ml.synthetic.fixtures --expected
```

## Classical analytics modules

Phase 2 research helpers remain non-LLM and local-only. They may consume `features.parquet`, but they must not change the Phase 1 file schema unless this contract is updated.

| Module | Purpose |
| --- | --- |
| `survival/reply_time.py` | Empirical probability of reply within horizons such as 1h, 6h, and 24h. |
| `anomaly/silence_anomaly.py` | Robust silence-gap anomaly scoring from observed gaps. |
| `anomaly/activity_change.py` | Daily activity spikes and drops relative to trailing baselines. |
| `models/baselines.py` | Majority and sender-relative baseline predictors. |
| `models/sklearn_models.py` | Classical sklearn label classifiers for parquet features. |
| `evaluation/backtest.py` | Chronological expanding-window evaluation. |
| `evaluation/calibration.py` | Probability calibration checks for future classifiers. |
