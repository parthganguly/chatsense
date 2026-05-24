# ChatSense ML Data Contract

This contract defines the Phase 1 local analytics outputs. The analyzer must not claim hidden motives, diagnoses, or mental-health conclusions.

## `report.json`

Top-level required fields:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `schema_version` | string | yes | Contract version, currently `1.0`. |
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

### `warnings`

Every report must include warnings equivalent to:

- Analysis is based only on exported messages, not full relationship context.
- Reply delays and message patterns are behavioral observations, not proof of hidden intent.
- Do not use this report to diagnose mental health, personality, or relationship status.

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
| `next_reply_delay_bucket` | string | yes | Future reply delay class. |
| `next_window_activity_level` | string | yes | Future activity relative to baseline: `low`, `normal`, `high`. |
| `next_window_imbalance_change` | string | yes | Future balance change: `more_balanced`, `same`, `more_one_sided`. |

Label columns must only use messages after the current row/window. They must never use current-row future values as features.
