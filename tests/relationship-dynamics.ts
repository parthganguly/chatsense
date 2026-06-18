import assert from "node:assert/strict"
import { analyzeChat, parseWhatsAppChat } from "@chatsense/core"

const changingChat = [
  "01/02/2026, 09:00 - Asha: One",
  "01/02/2026, 11:00 - Ravi: Two",
  "02/02/2026, 09:00 - Asha: Three",
  "02/02/2026, 11:00 - Ravi: Four",
  "10/02/2026, 09:00 - Asha: Five",
  "10/02/2026, 09:45 - Ravi: Six",
  "11/02/2026, 09:00 - Asha: Seven",
  "11/02/2026, 09:45 - Ravi: Eight",
  "20/02/2026, 09:00 - Ravi: Nine",
  "20/02/2026, 09:05 - Asha: Ten",
  "20/02/2026, 09:10 - Ravi: Eleven",
  "20/02/2026, 09:15 - Ravi: Twelve",
].join("\n")

const tinyChat = [
  "01/02/2026, 09:00 - Asha: One",
  "01/02/2026, 09:05 - Ravi: Two",
  "01/02/2026, 09:10 - Asha: Three",
].join("\n")

function run() {
  testLifecyclePhaseComparison()
  testLimitedHistoryGuardrail()
  testDynamicsAreContentIndependent()
  console.log("Relationship dynamics tests passed.")
}

function testLifecyclePhaseComparison() {
  const analysis = analyzeChat(parseWhatsAppChat(changingChat))
  const dynamics = analysis.relationshipDynamics

  assert.equal(dynamics.phaseCount, 3)
  assert.deepEqual(dynamics.phases.map((phase) => phase.label), ["early", "middle", "recent"])
  assert.deepEqual(dynamics.phases.map((phase) => phase.messageCount), [4, 4, 4])
  assert.equal(dynamics.activityChange.direction, "rising")
  assert.equal(dynamics.replyPaceChange.direction, "faster")
  assert.equal(dynamics.balanceChange.direction, "more_one_sided")
  assert.equal(dynamics.initiationChange.direction, "shifted")
  assert.match(dynamics.changeInsights[0].detail, /not proof of motive or relationship status/)
}

function testLimitedHistoryGuardrail() {
  const analysis = analyzeChat(parseWhatsAppChat(tinyChat))
  const dynamics = analysis.relationshipDynamics

  assert.equal(dynamics.phaseCount, 1)
  assert.equal(dynamics.phases[0].label, "full")
  assert.equal(dynamics.activityChange.direction, "not_enough_data")
  assert.match(dynamics.changeInsights[0].detail, /enough exported messages/)
}

function testDynamicsAreContentIndependent() {
  const neutral = analyzeChat(parseWhatsAppChat(changingChat)).relationshipDynamics
  const rewritten = analyzeChat(
    parseWhatsAppChat(changingChat.replaceAll(/: \w+/g, ": completely different words here")),
  ).relationshipDynamics

  assert.deepEqual(rewritten, neutral)
}

run()
