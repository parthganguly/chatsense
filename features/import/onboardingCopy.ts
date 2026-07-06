/**
 * Stage 7 onboarding copy for the import screen.
 *
 * Kept as plain data so tests/onboarding.ts can scan every string with the
 * shared forbidden-language patterns (explicit "does not prove ..." negations
 * excepted) and so the screen stays a pure renderer. The copy must describe
 * observable patterns only: no motive, emotion, advice, prediction, or
 * relationship-status claims.
 */

export const ONBOARDING_PROMISE = "See observable communication patterns from a WhatsApp export."

export const ONBOARDING_WHAT_YOU_SEE = {
  title: "What you'll see",
  intro:
    "ChatSense turns a WhatsApp export into a local pattern read: what changed, who restarted contact, and what timing patterns show up.",
  bullets: [
    "Who kept contact alive after quiet periods",
    "Rhythm, pauses, and the longest silences",
    "Changes between earlier and later periods",
    "Reply timing patterns for each person",
    "Evidence-backed takeaways on every tab",
  ],
} as const

export const ONBOARDING_CANNOT_TELL = {
  title: "What this cannot tell you",
  lines: [
    "It shows patterns, not reasons. ChatSense reads timing, senders, and volume; it never reads minds or message meaning.",
    "It does not prove love, rejection, motive, attraction, attachment, personality, mental health, compatibility, or relationship status.",
    "It does not suggest what to send, and it does not predict whether or when anyone replies.",
  ],
} as const

export const ONBOARDING_PRIVACY = {
  title: "Private by design",
  lines: [
    "Analysis runs locally inside the app. There is no upload, no account, no server, and no tracking.",
    "The export stays on your device for this session only; closing the app clears the analysis.",
    "Only import chats you have permission to analyze.",
  ],
} as const

export const ONBOARDING_EXPORT_STEPS = {
  title: "How to export from WhatsApp",
  steps: [
    "Open the chat in WhatsApp",
    "Tap the menu (or More)",
    "Choose Export chat",
    "Pick Without media",
    "Select the exported .txt (or ZIP) file in ChatSense",
  ],
  note: "Without media is recommended; ChatSense only reads the text export, so large media exports are not needed.",
} as const

export const ONBOARDING_DEMO = {
  button: "Try demo export",
  note: "Loads a committed synthetic example conversation. No real chat data.",
} as const
