# Forecasting Target Audit

Stage 5 is a research validation gate. Its question is not whether ChatSense can
display a prediction, but whether any future communication outcome can be
estimated from earlier observable behavior better than transparent naive
baselines.

This audit covers the pre-existing future-label code in
`python/chatsense_ml/labels`, `python/chatsense_ml/features`,
`python/chatsense_ml/evaluation`, and `python/chatsense_ml/models`.

## Decisions

| Existing label or helper | Decision | Reason |
| --- | --- | --- |
| `next_reply_delay_bucket` | Corrected concept, quarantined implementation | The label now looks forward to the next different sender, which is better than `shift(-1)`, but it is still row-based. Stage 5 uses turn-based reply opportunities instead. |
| `next_window_activity_level` | Quarantine | It defines `low/normal/high` using the whole export's `rolling_20_message_count` median, so future data can influence earlier labels. |
| `next_window_imbalance_change` | Quarantine | It compares current and future raw-message windows. It may be descriptive for notebooks, but it is not an independently validated forecasting target. |
| `rolling_20_*` features | Research-only | These include current-row values and are tied to raw messages, not turn-based prediction opportunities. They are not used by the Stage 5 gate. |
| `chronological_split` | Retain as low-level helper only | It avoids random splitting, but Stage 5 requires prequential/rolling-origin evaluation with one prediction at a time. |
| `expanding_window_backtest` | Quarantine for Stage 5 | It can evaluate label columns chronologically, but it is label-column oriented and does not model censoring or opportunity eligibility. |
| `majority_class_predictor` / `sender_majority_predictor` | Retain as legacy research helpers | They are transparent but operate on label columns. Stage 5 implements horizon-aware smoothed baselines over reply opportunities. |
| `sklearn_models.py` | Research-only | It uses sklearn pipelines and raw feature columns. It is not reproducible in the Android runtime and is not part of Stage 5 production eligibility. |

## Existing Label Details

### `next_reply_delay_bucket`

- Prediction unit: one raw message row.
- Target definition: delay until the next future message from a different
  sender, bucketed as `<5m`, `5-30m`, `30m-2h`, `2h-24h`,
  `>24h/no_reply`.
- Prediction timestamp: the current message timestamp.
- Features available at that timestamp: whatever columns are already present in
  `build_research_features_frame`.
- Horizon: implicit and unbounded until the next different sender, with a final
  `None` when no later different sender exists.
- Censoring behavior: none. Export-end rows are unlabeled, not right-censored.
- Class balance: fixture-dependent and not reported by the old helper.
- Leakage risks: lower than the earlier `shift(-1)` version, but the unit is a
  raw message. Same-sender bursts create repeated overlapping examples that all
  point at the same future response.
- Repeated/overlapping examples: yes. Consecutive same-sender messages can all
  receive the same future responder and delay bucket.
- Scientific interpretation: conditional timing after a message, not a reply
  probability.
- Decision: do not promote. Stage 5 replaces it with turn-based reply
  opportunities and separate horizon and conditional-delay tasks.

### `next_window_activity_level`

- Prediction unit: one raw message row.
- Target definition: count of the next 20 messages categorized against
  `rolling_20_message_count.median()`.
- Prediction timestamp: current message timestamp.
- Features available at that timestamp: not enforced.
- Horizon: next 20 raw messages, not a fixed time horizon.
- Censoring behavior: `None` only when there are no future rows; partial future
  windows can still be labeled.
- Class balance: fixture-dependent and not reported by the old helper.
- Leakage risks: high. The median baseline is calculated on the complete export,
  so future activity calibrates labels for earlier examples.
- Repeated/overlapping examples: yes, every row creates a heavily overlapping
  next-20-message target.
- Scientific interpretation: weak. A next-message-count class is not the same as
  future calendar activity.
- Decision: quarantine. Stage 5 evaluates completed adaptive windows using
  continuous `messages_per_active_day`.

### `next_window_imbalance_change`

- Prediction unit: one raw message row.
- Target definition: whether sender-share imbalance in the next 20 messages
  differs from the trailing/current 20-message window by more than 0.1.
- Prediction timestamp: current message timestamp.
- Features available at that timestamp: not enforced.
- Horizon: next 20 raw messages, not a fixed time horizon.
- Censoring behavior: `None` only when there are no future rows; partial future
  windows can still be labeled.
- Class balance: fixture-dependent and not reported by the old helper.
- Leakage risks: moderate to high. The target itself is future-only, but the
  row-based unit creates overlapping examples and does not expose censoring.
- Repeated/overlapping examples: yes.
- Scientific interpretation: descriptive at best. It does not define who is
  expected to participate or why balance changes.
- Decision: quarantine. Stage 5 does not promote imbalance forecasting.

## Leakage Checks

| Risk | Existing state |
| --- | --- |
| Whole-export aggregates used as features | `sender_message_share_so_far` is safe, but `next_window_activity_level` uses a whole-export median to define labels. |
| Future windows included in current features | Research rolling features use current and past rows. Stage 5 does not reuse them for promotion. |
| Random train/test splits | No random split exists, but `sklearn_models.py` leaves split policy to callers. |
| Target-derived columns | Existing label columns can sit beside features in `features.parquet`; reports intentionally exclude them. |
| Participant statistics calculated using later messages | `sender_message_count_so_far` and `sender_message_share_so_far` are prefix-based. Stage 5 rolling statistics are recomputed per opportunity from prior opportunities only. |
| Feature normalization fitted on the complete export | Possible in `sklearn_models.py` if a caller fits outside chronological evaluation. Stage 5 does not use sklearn for production eligibility. |
| Export-end rows treated as negatives | Existing labels mostly use `None`, but they do not represent right-censoring. Stage 5 models censoring explicitly. |
| Reply samples using information after prediction time | Row labels inherently use future outcomes. Stage 5 separates feature creation from outcome observation. |

## Stage 5 Targets Retained

Stage 5 keeps only methodologically explicit tasks:

1. Reply within horizon from a turn-based reply opportunity.
2. Conditional reply-delay bucket among observed responses.
3. Next completed adaptive-window activity using `messages_per_active_day`.

Reply opportunities now terminate at the first chronologically valid event: observed response by a different participant, same-sender new-thread supersession, or export end. This prevents a later response from being attributed to an older source turn after the source sender has already restarted the conversation.

The Stage 5 validation path is prequential/rolling-origin. It does not use random splitting for product eligibility, and tests assert that future message changes do not alter earlier prediction probabilities.

Initiation and reconnection forecasting remain audited but not promoted because
the current synthetic and fixture data do not establish enough independent,
unambiguous observations for product use.

Experimental labels remain outside `report.json`, outside the production
descriptive contract, and outside the Android UI unless they pass the forecasting
research gate.
