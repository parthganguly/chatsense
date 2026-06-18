# Stage 4 Relationship Dynamics Report

Stage 4 makes ChatSense describe how observable communication behavior changed
over the lifetime of an export.

## Scope

- Local-first TypeScript runtime only.
- Deterministic calculations in `@chatsense/core`.
- Content-independent: message text is not interpreted.
- Non-LLM, non-predictive, non-diagnostic.
- No claims about motive, affection, attachment, personality, mental health,
  relationship quality, or relationship status.

## Implementation

`ChatAnalysis.relationshipDynamics` now contains:

- deterministic lifecycle phases;
- first-vs-recent activity change;
- first-vs-recent reply-pace change;
- first-vs-recent message-balance change;
- first-vs-recent initiation-leader change;
- guardrailed observable insights.

The app renders this through the new `Dynamics` tab. Screens only display values
computed by `@chatsense/core`; they do not compute behavioral analytics.

## Phase Definition

For exports with at least six messages, messages are sorted by timestamp and
split by message index into three phases:

```text
early -> middle -> recent
```

For smaller exports, ChatSense reports a single `full` phase and marks
first-vs-recent comparison as limited data.

## Product Copy Guardrail

Every dynamics insight describes exported timing or volume behavior only. The
UI includes an explicit warning:

```text
These comparisons describe exported message timing and volume only. They do not
prove motive, affection, attachment, personality, or relationship status.
```
