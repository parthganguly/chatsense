# ChatSense Runtime And Research Boundaries

ChatSense has two implementations with different jobs:

- **TypeScript is the Android runtime.** The Capacitor app parses and analyzes exports in `lib/chat-parser.ts` and `lib/chat-analyzer.ts`. No Python code is bundled into Android.
- **Python is the local research/reference package.** `python/chatsense_ml` owns richer offline analysis, research features, parquet output, notebooks, and predictive experiments.
- **The shared contract is the bridge.** `contracts/behavioral_contract.json`, `contracts/report.schema.json`, `fixtures/whatsapp`, and `fixtures/expected` define the stable behavior both sides must agree on.

The mobile app remains local-only: imported chats are processed in memory, not uploaded, not persisted by the app, and not analyzed by an LLM.

## Promotion Rule

New behavioral definitions should start in Python when they need pandas, notebooks, or research iteration. A metric is only considered shipped when it is:

1. Defined in `contracts/behavioral_contract.json` or `docs/data_contract.md`.
2. Implemented in the TypeScript runtime.
3. Covered by shared parity fixtures.

Forward-looking labels, sklearn models, survival analysis, anomaly experiments, and notebook visualizations are research-only unless they go through that promotion path.

## Known Follow-Up

The current Android import bridge passes file bytes through a Base64 string injected into the WebView. That is intentionally unchanged in this cleanup and should be handled as a separate performance/privacy hardening task.
