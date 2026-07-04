# Stage 6.2 Human-readable Takeaways

## Objective

Stage 6 made every claim safe and evidence-backed, but the top of each tab
still read like a dashboard. Stage 6.2 adds a deterministic human-takeaway
layer so a normal user immediately gets the shape of the situation without
being told what to feel.

This is:

- not advice;
- not emotional inference;
- not prediction;
- not a new behavioral score;
- a translation of observable patterns into human-readable orientation.

## Structure

`ChatAnalysis.narrative.takeaways` contains one `HumanTakeaway` per tab:

```ts
interface HumanTakeaway {
  title: string          // fixed per tab
  oneLineRead: string    // the sentence a user should remember
  whatThisMeans: string  // one short paragraph of orientation
  whyItLooksThatWay: string[]  // evidence bullets, always at least one
  confidence: "strong" | "moderate" | "limited"
  tone: "balanced" | "uneven" | "changed" | "stable" | "limited" | "caution"
  guardrail: string
}
```

Tab titles: Overview "What this looks like", Changes "Direction of travel",
People "Who carried the contact?", Rhythm "Silence pattern".

`components/analytics/TakeawayCard.tsx` renders the card above the Stage 6
narrative on all four tabs. The Stage 6 narrative and raw metrics are
unchanged below it.

## Confidence

Contract-owned (`insight_narrative.takeaway`): a read is "strong" only when
the supporting event count reaches `strong_evidence_multiplier` (2) times the
corresponding maintenance/sample minimum; limited evidence always yields a
limited read. Product labels: "Strong read", "Useful read", "Light read".
"Statistically significant" is never used.

## Allowed language

- "Balanced volume, uneven maintenance."
- "Both people sent a similar amount, but one person did more of the
  restarting after silence."
- "The later period became more active."
- "This looks stable rather than clearly changing."
- "There is not enough evidence here to read a real change."
- "The quiet periods repeatedly ended the same way."
- "That is a pattern worth noticing, not an explanation of it."

## Forbidden language

- any motive or feeling claim ("cared less", "lost interest", "pulled away",
  "desperate", "needy", "invested", "emotional");
- any diagnosis or label ("anxious", "avoidant", "toxic", "unhealthy",
  "red flag", "green flag");
- any advice ("you should stop messaging");
- any prediction ("they will reply");
- any relationship-status claim.

The shared scanner in `tests/helpers/narrative-safety.ts` enforces this over
every takeaway field (title, one-line read, paragraph, evidence bullets,
guardrail) in addition to the Stage 6 narrative fields, with stem-based
patterns so morphological variants are also rejected.

## Tests

`tests/human-takeaway.ts` covers the eleven-case matrix:

1. balanced volume, uneven maintenance reads "Balanced volume, uneven
   maintenance." with restart evidence;
2. balanced maintenance reads neutral ("did not concentrate on one side");
3. short export is a limited/"Light read" everywhere;
4. concentrated restarts produce the silence-pattern read;
5. changed reply timing produces a direction-of-travel read;
6. no notable change reads "stable rather than clearly changing";
7. group chats state that attribution is approximate;
8. every takeaway carries evidence, a one-line read, and the guardrail;
9. all takeaway text passes the risk-language scanner on every fixture;
10. adversarial message content produces byte-identical takeaways;
11. the takeaway card renders above the narrative on all four screens.

## Phone test checklist

1. Install the debug APK and import an export through the picker.
2. Overview: the top card gives a human read before any stats.
3. Changes: the top card states the direction of travel or says no clear
   change / not enough history.
4. Rhythm: the top card describes the silence pattern.
5. People: the top card says who carried contact maintenance, if anyone.
6. Import a short export: every read is "Light read" and nothing looks broken.
7. Check no horizontal overflow at narrow width, including long names.
8. Check the bottom navigation still works above system navigation.
9. Confirm no motive, emotion, advice, prediction, or status claim appears.

## Scope boundary

No LLM, sentiment analysis, embeddings, message-content interpretation,
coaching, advice, prediction, or psychological labels were added. Python
mirrors the new contract constants for parity but does not generate takeaway
prose; the wording is TypeScript-owned production copy.
