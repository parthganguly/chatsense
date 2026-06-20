# Forecasting Safety

Stage 5 forecasting work is local-first, deterministic, non-LLM, and non-diagnostic.

## Product Boundary

ChatSense may show a forecasting research gate, but it must not present a live prediction unless future validation work clears the contract gates on appropriate data.

Current UI wording must stay conservative:

- forecasting is not validated for this export;
- forecasts are estimates from previous observable behavior;
- forecasts are not knowledge of intent, affection, attachment, personality, mental health, relationship quality, or relationship status.

## Explicitly Not Included

Stage 5 does not add:

- LLMs;
- sentiment analysis;
- embeddings;
- personality inference;
- motive inference;
- attachment or relationship-status inference;
- coaching or generated reply suggestions;
- remote processing;
- cloud sync;
- telemetry;
- neural networks;
- React Native or Expo work.

## Synthetic Fixture Limits

Committed fixtures are synthetic and may be used for correctness tests, boundary cases, and reproducible benchmark mechanics. They are not evidence that a forecast works in real relationships or real chats.

## Responsible Output

When a gate fails, the product should say so plainly. "Not enough validated evidence" is better than a confident but unsupported forecast.
