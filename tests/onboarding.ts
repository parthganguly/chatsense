import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

import { assertNarrativeLanguageSafe } from "./helpers/narrative-safety"
import { NARRATIVE_HIGH_RISK_PATTERNS, NARRATIVE_SOFT_RISK_PATTERNS } from "./helpers/narrative-safety"
import { DEMO_EXPORT_NAME, DEMO_EXPORT_TEXT } from "../features/import/demoExport"
import {
  ONBOARDING_CANNOT_TELL,
  ONBOARDING_DEMO,
  ONBOARDING_EXPORT_STEPS,
  ONBOARDING_PRIVACY,
  ONBOARDING_PROMISE,
  ONBOARDING_WHAT_YOU_SEE,
} from "../features/import/onboardingCopy"
import { analyzeImportedText } from "../features/import/useChatImport"

function run() {
  testOnboardingSectionsExist()
  testOnboardingCopyIsSafe()
  testOnboardingMakesNoForbiddenPromises()
  testDemoUsesCommittedSyntheticFixtureOnly()
  testDemoImportRunsTheRealPipeline()
  testImportFeatureHasNoNetworkDependency()
  testImportScreenRendersOnboardingCopy()
  console.log("Onboarding and demo import tests passed.")
}

function onboardingStrings(): string[] {
  return [
    ONBOARDING_PROMISE,
    ONBOARDING_WHAT_YOU_SEE.title,
    ONBOARDING_WHAT_YOU_SEE.intro,
    ...ONBOARDING_WHAT_YOU_SEE.bullets,
    ONBOARDING_CANNOT_TELL.title,
    ...ONBOARDING_CANNOT_TELL.lines,
    ONBOARDING_PRIVACY.title,
    ...ONBOARDING_PRIVACY.lines,
    ONBOARDING_EXPORT_STEPS.title,
    ...ONBOARDING_EXPORT_STEPS.steps,
    ONBOARDING_EXPORT_STEPS.note,
    ONBOARDING_DEMO.button,
    ONBOARDING_DEMO.note,
  ]
}

function testOnboardingSectionsExist() {
  // The six things a new user must understand before importing.
  assert.match(ONBOARDING_WHAT_YOU_SEE.intro, /local pattern read/i)
  assert.equal(ONBOARDING_WHAT_YOU_SEE.bullets.length >= 4, true)
  assert.match(ONBOARDING_CANNOT_TELL.lines.join(" "), /patterns, not reasons/i)
  assert.match(ONBOARDING_CANNOT_TELL.lines.join(" "), /never reads minds/i)
  assert.match(ONBOARDING_PRIVACY.lines.join(" "), /locally inside the app/i)
  assert.match(ONBOARDING_PRIVACY.lines.join(" "), /no upload, no account, no server, and no tracking/i)
  assert.match(ONBOARDING_PRIVACY.lines.join(" "), /permission to analyze/i)
  assert.equal(ONBOARDING_EXPORT_STEPS.steps.length, 5)
  assert.match(ONBOARDING_EXPORT_STEPS.steps.join(" "), /Export chat/)
  assert.match(ONBOARDING_EXPORT_STEPS.steps.join(" "), /Without media/)
  assert.match(ONBOARDING_EXPORT_STEPS.steps.join(" "), /\.txt/)
  assert.match(ONBOARDING_DEMO.note, /synthetic/i)
}

function testOnboardingCopyIsSafe() {
  // Onboarding copy must pass the shared forbidden-language patterns, with the
  // same explicit-negation allowance the narrative scanner uses ("does not
  // prove ...") plus onboarding's own "does not / never ..." boundary
  // sentences, which exist precisely to deny these claims.
  const negation =
    /(?:it does not|it never|does not|never)[^.]{0,160}\./gi
  for (const text of onboardingStrings()) {
    const withoutNegations = text.replace(negation, "")
    for (const { name, pattern } of [...NARRATIVE_HIGH_RISK_PATTERNS, ...NARRATIVE_SOFT_RISK_PATTERNS]) {
      assert.doesNotMatch(withoutNegations, pattern, `onboarding copy contains unnegated risk term '${name}': ${text}`)
    }
  }
}

function testOnboardingMakesNoForbiddenPromises() {
  // No promise of mind-reading, prediction, or advice — even positively phrased.
  const forbiddenPromise =
    /\b(?:tells you why|reveals (?:their|his|her)|reads minds\b(?!\S)|predicts\b|will (?:reply|respond|text|message)|you should (?:send|say|message|text)|advice|coaching|therapist|diagnos)/i
  for (const text of onboardingStrings()) {
    const withoutNegations = text.replace(/(?:it does not|it never|does not|never)[^.]{0,160}\./gi, "")
    assert.doesNotMatch(withoutNegations, forbiddenPromise, `onboarding copy promises too much: ${text}`)
  }
}

function testDemoUsesCommittedSyntheticFixtureOnly() {
  // The embedded demo text must stay byte-identical to the committed synthetic
  // fixture so the demo can never drift toward uncommitted or personal data.
  // Compare with normalized line endings so Windows (CRLF) and CI (LF)
  // checkouts of the fixture both match the embedded LF text.
  const fixture = readFileSync(
    path.join(process.cwd(), "fixtures", "whatsapp", "stage4_increasing_initiation.txt"),
    "utf8",
  ).replace(/\r\n/g, "\n")
  assert.equal(DEMO_EXPORT_TEXT, fixture, "demoExport.ts must match fixtures/whatsapp/stage4_increasing_initiation.txt")
  assert.match(DEMO_EXPORT_NAME, /demo/i)
  assert.match(DEMO_EXPORT_NAME, /synthetic/i)
}

function testDemoImportRunsTheRealPipeline() {
  // Same parse/analyze path as a real import, producing the normal narrative.
  const imported = analyzeImportedText(DEMO_EXPORT_TEXT)
  assert.equal(imported.messages.length > 0, true)
  assert.equal(imported.analysis.overview.messageCount > 0, true)
  const takeaways = imported.analysis.narrative.takeaways
  for (const key of ["overview", "changes", "people", "rhythm"] as const) {
    assert.equal(takeaways[key].oneLineRead.length > 0, true, `demo analysis missing ${key} takeaway`)
  }
  assertNarrativeLanguageSafe(imported.analysis.narrative, "demo export narrative")
}

function testImportFeatureHasNoNetworkDependency() {
  // The import feature (including the demo) must not fetch anything.
  const files = [
    "features/import/ImportScreen.tsx",
    "features/import/useChatImport.ts",
    "features/import/demoExport.ts",
    "features/import/onboardingCopy.ts",
    "features/import/readWhatsAppExport.ts",
  ]
  const network = /\bfetch\s*\(|XMLHttpRequest|axios|WebSocket|navigator\.sendBeacon|https?:\/\//i
  for (const file of files) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8")
    assert.doesNotMatch(source, network, `${file} must not use network APIs`)
  }
}

function testImportScreenRendersOnboardingCopy() {
  // The screen must render the copy module rather than restating strings, and
  // must offer both the real import and the demo import.
  const source = readFileSync(path.join(process.cwd(), "features", "import", "ImportScreen.tsx"), "utf8")
  for (const symbol of [
    "ONBOARDING_PROMISE",
    "ONBOARDING_WHAT_YOU_SEE",
    "ONBOARDING_CANNOT_TELL",
    "ONBOARDING_PRIVACY",
    "ONBOARDING_EXPORT_STEPS",
    "ONBOARDING_DEMO",
    "Choose WhatsApp export",
    "onDemoImport",
  ]) {
    assert.equal(source.includes(symbol), true, `ImportScreen.tsx must reference ${symbol}`)
  }
}

run()
