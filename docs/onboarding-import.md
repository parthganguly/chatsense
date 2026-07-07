# Onboarding and Import (Stage 7)

## Purpose

A new user should understand the product before importing anything: what
ChatSense shows, what it cannot show, that analysis is local-only, how to
export a WhatsApp chat, and that a safe synthetic demo exists.

## Import screen

`features/import/ImportScreen.tsx` renders, before any analysis:

- the one-line promise ("See observable communication patterns from a
  WhatsApp export.");
- primary actions: **Choose WhatsApp export** and **Try demo export**;
- "What you'll see" — who kept contact alive, rhythm and pauses, changes over
  time, reply timing patterns, evidence-backed takeaways;
- "What this cannot tell you" — patterns, not reasons; no mind-reading; no
  proof of love, rejection, motive, attraction, attachment, personality,
  mental health, compatibility, or relationship status; no reply suggestions;
  no reply prediction;
- "Private by design" — analysis runs locally, no upload/account/server/
  tracking, session-only data, and a reminder to only import chats you have
  permission to analyze;
- "How to export from WhatsApp" — five steps, with **Without media**
  recommended.

All copy lives as plain data in `features/import/onboardingCopy.ts` so tests
can scan every string. The screen is a pure renderer; import orchestration
stays in `features/import/useChatImport.ts`.

## Demo import

**Try demo export** loads `features/import/demoExport.ts`, a line-ending-
normalized embedding of the committed synthetic fixture
`fixtures/whatsapp/stage4_increasing_initiation.txt`. The demo:

- runs the exact same parse/analyze pipeline as a user-selected file;
- labels the source as "Demo export (synthetic)" in the app header;
- fetches nothing from the network;
- contains no real people and no real message content.

`tests/onboarding.ts` asserts the embedded text matches the committed fixture
(modulo CRLF), that the demo produces the normal narrative and takeaways, and
that the import feature uses no network APIs.

## Language safety

Onboarding copy is scanned with the shared risk-pattern lists from
`tests/helpers/narrative-safety.ts`. Explicit boundary negations ("It does not
prove ...", "it never reads minds") are permitted; positive claims of motive,
emotion, prediction, or advice are rejected, as are promises like "tells you
why" or "will reply".

## QA

- Playwright (`tests/viewport/analytics-smoke.spec.ts`) asserts the onboarding
  sections at 360x800, 390x844, and 412x915, checks for horizontal overflow,
  clicks **Try demo export**, and verifies all four analysis tabs render. A
  second test still covers the real file-input import path.
- Maestro (`maestro/chatsense-smoke.yaml`) taps **Try demo export** when the
  onboarding screen is visible, removing the old Android file-picker
  precondition, then walks all four tabs.

No personal exports, screenshots, or personal data are used anywhere in this
flow or its tests.

## Future direction

Stage 8 is planned to lead the post-import experience with a plain-language
"Relationship Read" (pattern, direction, effort balance, silence, evidence,
confidence) ahead of the metric cards. Onboarding copy and the demo export
should continue to set that expectation. See
`docs/product/relationship-read-roadmap.md`.
