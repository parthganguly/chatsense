import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"

import { analyzeChat, parseWhatsAppChat, type InsightNarrative } from "@chatsense/core"

function fixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", `${name}.txt`), "utf8")
}

function narrativeForFixture(name: string): InsightNarrative {
  return analyzeChat(parseWhatsAppChat(fixture(name))).narrative
}

function run() {
  testNotableChangesLeadWithVisibleEvidence()
  testLimitedEvidenceIsStatedPlainly()
  testNarrativeIsContentIndependent()
  testFindingsStayBoundedAndTraceable()
  testGroupApproximationIsExplicit()
  testOverviewLeadsWithNarrative()
  console.log("Insight narrative tests passed.")
}

function testNotableChangesLeadWithVisibleEvidence() {
  const narrative = narrativeForFixture("stage4_reply_slowdown")
  const first = narrative.findings[0]

  assert.equal(narrative.headline, "This export shows measurable changes over time")
  assert.equal(first.category, "change")
  assert.equal(first.evidenceLevel, "threshold_crossed")
  assert.match(first.title, /median reply timing became (faster|slower)/i)
  assert.match(first.summary, /crossing the predefined notable-change threshold/i)
  assert.equal(first.evidence.length, 3)
  assert.equal(first.evidence.some((item) => item.label === "Evidence samples"), true)
  assert.equal(
    narrative.findings.some((finding) => /median reply timing became slower/i.test(finding.title)),
    true,
  )
}

function testLimitedEvidenceIsStatedPlainly() {
  const narrative = narrativeForFixture("stage4_insufficient_export")
  const first = narrative.findings[0]

  assert.equal(narrative.headline, "This export supports a descriptive snapshot")
  assert.equal(first.category, "comparison_context")
  assert.equal(first.evidenceLevel, "limited")
  assert.match(first.summary, /not a strong comparison across time/i)
  assert.match(first.evidence[0].detail ?? "", /Requires \d+ eligible windows; found 0/i)
}

function testNarrativeIsContentIndependent() {
  const originalText = fixture("stage4_balanced_then_one_sided")
  const rewritten = originalText.replace(/: (.*)$/gm, ": unrelated tokens replace every message")

  const original = analyzeChat(parseWhatsAppChat(originalText)).narrative
  const changedContent = analyzeChat(parseWhatsAppChat(rewritten)).narrative

  assert.deepEqual(changedContent, original)
}

function testFindingsStayBoundedAndTraceable() {
  const narrative = narrativeForFixture("stage4_balanced_then_one_sided")
  const ids = narrative.findings.map((finding) => finding.id)
  const serialized = JSON.stringify(narrative).toLowerCase()

  assert.equal(narrative.findings.length <= 4, true)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(narrative.findings.every((finding) => finding.evidence.length > 0), true)
  assert.match(narrative.guardrail, /do not prove motive, love, rejection/i)
  assert.doesNotMatch(serialized, /attachment style|is interested|is withdrawing|should reply|likely to reply/)
  assert.match(narrative.limitations.join(" "), /Nothing .* predicts what anyone will do next/i)
}

function testGroupApproximationIsExplicit() {
  const narrative = narrativeForFixture("stage4_group_reply_edges")
  assert.match(narrative.limitations.join(" "), /group chats.*immediately previous sender/i)
}

function testOverviewLeadsWithNarrative() {
  const source = readFileSync(path.join(process.cwd(), "features", "overview", "OverviewScreen.tsx"), "utf8")
  const narrativeIndex = source.indexOf("Evidence-backed summary")
  const metricsIndex = source.indexOf("At a glance")

  assert.equal(narrativeIndex >= 0, true)
  assert.equal(metricsIndex > narrativeIndex, true)
  assert.match(source, /narrative\.findings/)
  assert.match(source, /What this can and cannot say/)
  assert.doesNotMatch(source, /Useful signals/)
}

run()
