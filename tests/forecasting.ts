import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  FORECASTING_CONTRACT_VERSION,
  FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
  REPLY_HORIZONS_MINUTES,
  assessReplyHorizonPromotion,
  buildReplyOpportunities,
  evaluateForecastingResearch,
  outcomeForHorizon,
  parseWhatsAppChat,
} from "@chatsense/core"
import { analyzeRelationshipDynamics } from "@chatsense/core"

function run() {
  testForecastingFixtureMatrixExists()
  testForecastingContractMirrorsJson()
  testReplyOpportunitiesUseTurnsNotRawNextRows()
  testCensoringDoesNotTreatFinalOpenTurnAsNoReply()
  testPromotionGateSeparatesMethodPassFromProductPromotion()
  testResearchReportIsConservative()
  console.log("Forecasting research tests passed.")
}

function testForecastingFixtureMatrixExists() {
  const fixtureNames = fs
    .readdirSync(path.join(process.cwd(), "fixtures", "forecasting"))
    .filter((name) => name.endsWith(".txt"))
    .sort()
  assert.deepEqual(fixtureNames, [
    "stage5_activity_windows.txt",
    "stage5_group_approximation.txt",
    "stage5_regime_shift.txt",
    "stage5_reply_censoring.txt",
  ])
}

function testForecastingContractMirrorsJson() {
  const contract = JSON.parse(fs.readFileSync(path.join(process.cwd(), "contracts", "forecasting_contract.json"), "utf8"))
  assert.equal(FORECASTING_CONTRACT_VERSION, contract.contract_version)
  assert.deepEqual(REPLY_HORIZONS_MINUTES, contract.tasks.reply_within_horizon.horizons_minutes)
  assert.equal(
    FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
    contract.promotion_gates.reply_horizon.min_evaluated_overall,
  )
}

function testReplyOpportunitiesUseTurnsNotRawNextRows() {
  const messages = parseWhatsAppChat(
    [
      "01/01/2026, 09:00 - Asha: first",
      "01/01/2026, 09:05 - Asha: same sender follow up",
      "01/01/2026, 09:20 - Ravi: response",
    ].join("\n"),
  )
  const dynamics = analyzeRelationshipDynamics(messages)
  const opportunities = buildReplyOpportunities(dynamics.turns, ["Asha", "Ravi"])

  assert.equal(dynamics.turns.length, 2)
  assert.equal(opportunities[0].sourceSender, "Asha")
  assert.equal(opportunities[0].sourceTurnMessageCount, 2)
  assert.equal(opportunities[0].observedResponder, "Ravi")
  assert.equal(opportunities[0].delayMinutes, 15)
}

function testCensoringDoesNotTreatFinalOpenTurnAsNoReply() {
  const messages = parseWhatsAppChat(
    [
      "01/01/2026, 09:00 - Asha: start",
      "01/01/2026, 16:00 - Asha: same sender new thread",
    ].join("\n"),
  )
  const dynamics = analyzeRelationshipDynamics(messages)
  const opportunities = buildReplyOpportunities(dynamics.turns, ["Asha", "Ravi"])

  assert.equal(opportunities.length, 2)
  assert.equal(outcomeForHorizon(opportunities[0], 60).censored, false)
  assert.equal(outcomeForHorizon(opportunities[0], 60).outcome, false)
  assert.equal(opportunities[1].openAtExportEnd, true)
  assert.deepEqual(outcomeForHorizon(opportunities[1], 60), {
    eligible: false,
    censored: true,
    outcome: null,
    reason: "export ended before the full horizon elapsed",
  })
}

function testPromotionGateSeparatesMethodPassFromProductPromotion() {
  const methodPass = assessReplyHorizonPromotion({
    evaluatedCount: 100,
    positiveCount: 50,
    negativeCount: 50,
    candidateBrier: 0.18,
    bestBaselineBrier: 0.2,
    calibrationError: 0.05,
    participantMinimumEvaluatedCount: 40,
    generalValidityEstablished: false,
  })
  assert.equal(methodPass.methodGatePassed, true)
  assert.equal(methodPass.promoted, false)
  assert.match(methodPass.reasons.join("\n"), /Synthetic fixtures/)

  const productPass = assessReplyHorizonPromotion({
    evaluatedCount: 100,
    positiveCount: 50,
    negativeCount: 50,
    candidateBrier: 0.18,
    bestBaselineBrier: 0.2,
    calibrationError: 0.05,
    participantMinimumEvaluatedCount: 40,
    generalValidityEstablished: true,
  })
  assert.equal(productPass.methodGatePassed, true)
  assert.equal(productPass.promoted, true)

  const fail = assessReplyHorizonPromotion({
    evaluatedCount: 20,
    positiveCount: 19,
    negativeCount: 1,
    candidateBrier: 0.2,
    bestBaselineBrier: 0.2,
    calibrationError: 0.2,
    participantMinimumEvaluatedCount: 10,
    generalValidityEstablished: true,
  })
  assert.equal(fail.methodGatePassed, false)
  assert.equal(fail.promoted, false)
  assert.match(fail.reasons.join("\n"), /Requires 80 evaluated opportunities/)
}

function testResearchReportIsConservative() {
  const text = fs.readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", "stage4_balanced_then_one_sided.txt"), "utf8")
  const report = evaluateForecastingResearch(parseWhatsAppChat(text))

  assert.equal(report.status, "not_validated")
  assert.equal(report.summary.productPromotion, false)
  assert.equal(report.opportunities.reply.total > 0, true)
  assert.equal(report.tasks.initiationReconnection.promoted, false)
  assert.match(report.summary.reasons.join("\n"), /not knowledge of intent/)
}

run()
