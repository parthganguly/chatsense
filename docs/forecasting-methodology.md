# Forecasting Methodology

Stage 5 is a research gate, not a product forecast.

The goal is to test whether future observable communication outcomes can be estimated from earlier observable behavior better than simple baselines. A valid result is that forecasting is not justified.

## Allowed Inputs

Forecasting features are content-independent:

- sender and participant identity within the export;
- conversation turns;
- prediction timestamp, hour bucket, and prior activity rhythm;
- source-turn message and word counts;
- whether a source turn starts a new thread;
- earlier observed reply outcomes and delays;
- completed adaptive-window activity.

The evaluator does not use message meaning, sentiment, embeddings, LLMs, personality inference, motive inference, coaching, telemetry, backend services, or neural networks.

## Prediction Units

### Reply Opportunities

The reply task uses conversation turns, not raw message rows.

For each turn, the prediction time is the end of that turn. The observed response is the next future turn from a different participant. In two-person chats, the expected responder is the other participant. In group chats, the task is approximate: time until any different participant next speaks.

Same-sender follow-ups inside a turn do not become artificial reply labels.

### Censoring

If a response is observed after a horizon, that opportunity is a valid negative for that horizon.

If the export ends before the full horizon can be observed, the opportunity is right-censored and excluded from that horizon score. The final open turn is not automatically treated as a no-reply outcome.

If the same source sender starts a new thread before a different participant responds, the older opportunity is terminated as `superseded_by_new_source_thread`. It is censored for horizons that have not elapsed at supersession time, and later responses are not attached to the old turn.

### Activity

Activity forecasting uses completed, eligible adaptive windows only. A target window is scored using windows before it.

## Baselines

Reply horizon baselines:

- global historical smoothed rate;
- participant historical smoothed rate;
- recent rolling smoothed rate.
- time-context smoothed rate using expected responder, weekday/weekend, and broad hour bucket with fallback.

Delay-bucket baselines:

- global historical bucket distribution;
- participant historical bucket distribution;
- recent rolling bucket distribution.
- time-context bucket distribution using the same coarse context and fallback.

Activity baselines:

- previous completed value;
- historical mean;
- rolling mean.
- exponentially weighted mean.

## Candidate Models

Stage 5 candidates are transparent deterministic estimators:

- reply horizon: a smoothed blend of global, participant, recent, time-bucket, and thread-start rates;
- delay bucket: a smoothed blend of global, participant, recent, and time-bucket distributions;
- activity: a damped trend over recent completed windows.

These are intentionally simple. The point is to prove that any product forecast clears baselines and calibration before adding complexity.

## Metrics

Reply horizon metrics:

- Brier score;
- log loss;
- calibration table and expected calibration error;
- accuracy, precision, and recall as secondary context;
- deterministic bootstrap interval for best-baseline Brier minus candidate Brier;
- subgroup/time-slice degradation checks.

Delay-bucket metrics:

- balanced accuracy;
- macro F1;
- log loss;
- accuracy as secondary context;
- confusion matrix;
- per-class precision, recall, F1, and support.

Activity metrics:

- MAE;
- median absolute error;
- RMSE.
- safe MAPE when actual values are non-zero;
- per-window predictions and absolute errors for every estimator.

## Promotion Gates

`contracts/forecasting_contract.json` owns the numeric gates. Passing the method gate is not enough for product promotion. General predictive validity requires appropriate real validation data; synthetic fixtures only prove that the machinery is deterministic and leakage-safe.

Current product status: forecasting is not validated for product use.

## Generated Reports

`npm run forecast:eval` writes `artifacts/forecasting/typescript_report.json`, `artifacts/forecasting/parity_report.json`, and `artifacts/forecasting/report.md`.

`python -m chatsense_ml.forecasting.evaluate` writes `artifacts/forecasting/python_report.json`.

The machine-readable reports conform to `contracts/forecasting_report.schema.json`. The artifacts are ignored by git because they can also be produced for personal exports, but the committed synthetic fixture matrix is safe to benchmark in CI.
