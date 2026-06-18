# Relationship Dynamics

Relationship dynamics are deterministic, local-only summaries of how observable
communication behavior changes across a WhatsApp export. They describe timing,
turn-taking, restarts, and volume. They do not inspect message meaning and must
not be presented as proof of motive, affection, attachment, personality, mental
health, relationship quality, or relationship status.

## Contract

The canonical thresholds live in `contracts/behavioral_contract.json` under
contract version `2.0`. TypeScript mirrors them in
`packages/chatsense-core/src/contract.ts`; Python mirrors them in
`python/chatsense_ml/contract.py`.

| Threshold | Value |
| --- | --- |
| Thread gap | 360 minutes |
| Reconnection gap | 1440 minutes |
| Follow-up minimum gap | 15 minutes |
| Window eligibility | 20 messages and 2 active days |
| Early/late availability | 4 eligible windows |
| Reply latency sample minimum | 5 replies per participant per period |
| Thread-start sample minimum | 3 total starts per period |
| Reconnection sample minimum | 2 total reconnections per period |
| Follow-up sample minimum | 3 relevant turns per participant per period |

## Output Shape

`ChatAnalysis.relationshipDynamics` contains:

- `windowSizeDays`: selected adaptive calendar size.
- `turns`: ordered `ConversationTurn` rows.
- `adaptiveWindows`: calendar-window summaries.
- `participantSummaries`: full-export participant turn/reply/restart summaries.
- `pauseSummary`: long-pause count, latest-gap percentile, reconnecting senders.
- `earlyLate`: first two eligible windows versus last two eligible windows.
- `recentPrior`: final eligible window versus the previous eligible window.
- `notableChanges`: sufficient changes that cross contract thresholds.
- `changeInsights`: guardrailed observable insight cards.

## Metric Meanings

| Metric | Meaning |
| --- | --- |
| `turnShare` | Participant turns divided by all turns in the period. |
| `medianReplyMinutes` | Median sender-switch delay for that participant. |
| `threadStartShare` | Participant thread starts divided by all thread starts. |
| `reconnectionShare` | Participant reconnections divided by all reconnections after 24-hour pauses. |
| `followUpRate` | Relevant turns with at least one same-sender follow-up before another participant responds. |
| `messagesPerActiveDay` | Period message count divided by active calendar days. |

## Evidence States

- `sufficient`: values and samples satisfy the contract for that metric.
- `insufficient`: values exist, but the sample minimum is not met.
- `unavailable`: the comparison itself cannot be made.

Screens must not show a directional label when evidence is insufficient or
unavailable.

## Runtime Boundaries

The Android runtime consumes the TypeScript implementation only. Python is the
reference and research layer. Cross-language drift is controlled by synthetic
fixtures and exact parity JSON under `fixtures/expected`.

The implementation is content-independent except for word-count volume features.
It never performs sentiment analysis, topic analysis, NLP classification,
personality inference, or LLM prompting.
