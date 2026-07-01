import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  FORECASTING_BOOTSTRAP_SEED,
  FORECASTING_CONTRACT_VERSION,
  FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
  FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
  REPLY_HORIZONS_MINUTES,
  assertNoForecastingLeakage,
  assessReplyHorizonPromotion,
  buildReplyOpportunities,
  evaluateConditionalReplyDelayBucket,
  evaluateForecastingResearch,
  evaluateNextWindowActivity,
  evaluateReplyWithinHorizon,
  outcomeForHorizon,
  parseWhatsAppChat,
  type BootstrapResult,
  type ExternalValidationEvidence,
  type ReplyOpportunity,
  type SubgroupCheckResult,
} from "@chatsense/core"
import { analyzeRelationshipDynamics } from "@chatsense/core"

const root = process.cwd()
const forecastingDir = path.join(root, "fixtures", "forecasting")
const requiredCases = [
  "response_exactly_60m",
  "response_just_after_60m",
  "response_exactly_6h",
  "response_just_after_6h",
  "response_exactly_24h",
  "response_just_after_24h",
  "export_ends_before_1h",
  "export_ends_after_1h_before_24h",
  "final_open_turn",
  "same_sender_followup_before_response",
  "same_sender_new_thread_before_response",
  "sparse_participant_history",
  "changing_reply_regime",
  "stable_periodic_communication",
  "sudden_activity_decline",
  "partial_target_window_excluded",
  "leakage_trap_future_aggregates",
  "chronological_regime_shift_random_split_trap",
  "synthetic_candidate_fails_method_gate",
  "synthetic_candidate_passes_method_gate_product_blocked",
  "group_chat_approximate_unsupported",
]

const tests: Array<[string, () => void]> = [
  ["manifest covers the complete Stage 5 fixture matrix", testForecastingFixtureManifest],
  ["forecasting contract mirrors TypeScript constants", testForecastingContractMirrorsJson],
  ["reply opportunities terminate on same-sender new threads", testSupersededOpportunity],
  ["same-sender follow-ups inside a turn are not separate stale opportunities", testSameSenderFollowUp],
  ["horizon boundaries are inclusive and just-after cases are negative", testHorizonBoundaries],
  ["export-end censoring distinguishes available and unavailable horizons", testExportEndCensoring],
  ["reply baselines expose time context, calibration and precision/recall", testReplyMetrics],
  ["delay-bucket task reports confusion matrices and insufficient support", testDelayBucketMetrics],
  ["activity task reports EWMA, safe MAPE and per-window errors", testActivityMetrics],
  ["promotion gate separates method pass from product promotion", testPromotionGate],
  ["leakage helper rejects future feature timestamps", testLeakageHelper],
  ["future messages do not change prior prediction features", testFutureMutationDoesNotChangeEarlierPrediction],
  ["research report remains conservative", testResearchReportIsConservative],
]

function run() {
  for (const [name, test] of tests) {
    try {
      test()
    } catch (error) {
      console.error(`Forecasting test failed: ${name}`)
      throw error
    }
  }
  console.log(`Forecasting research tests passed (${tests.length} tests).`)
}

function testForecastingFixtureManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(forecastingDir, "manifest.json"), "utf8"))
  assert.deepEqual(manifest.required_cases, requiredCases)
  for (const caseId of requiredCases) {
    assert.ok(manifest.cases[caseId], `missing manifest case ${caseId}`)
    assert.ok(
      manifest.cases[caseId].fixture || manifest.cases[caseId].generator,
      `case ${caseId} must name a fixture or generator`,
    )
    assert.ok("expected_opportunity_count" in manifest.cases[caseId])
    assert.ok("expected_censoring_state" in manifest.cases[caseId])
    assert.ok("expected_boundary_outcome" in manifest.cases[caseId])
    assert.ok("expected_gate_behavior" in manifest.cases[caseId])
  }
  const fixtureNames = fs
    .readdirSync(forecastingDir)
    .filter((name) => name.endsWith(".txt"))
    .sort()
  assert.ok(fixtureNames.length >= 10, "expected a dedicated Stage 5 forecasting fixture set")
}

function testForecastingContractMirrorsJson() {
  const contract = JSON.parse(fs.readFileSync(path.join(root, "contracts", "forecasting_contract.json"), "utf8"))
  assert.equal(FORECASTING_CONTRACT_VERSION, contract.contract_version)
  assert.deepEqual(REPLY_HORIZONS_MINUTES, contract.tasks.reply_within_horizon.horizons_minutes)
  assert.equal(
    FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
    contract.promotion_gates.reply_horizon.min_evaluated_overall,
  )
  assert.equal(FORECASTING_BOOTSTRAP_SEED, contract.evaluation.bootstrap.seed)
  assert.equal(
    FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
    contract.evaluation.subgroup_checks.catastrophic_brier_degradation,
  )
}

function testSupersededOpportunity() {
  const messages = parseWhatsAppChat(
    [
      "01/01/2026, 09:00 - Asha: old source",
      "01/01/2026, 16:00 - Asha: new source thread",
      "01/01/2026, 16:10 - Ravi: response to new source",
    ].join("\n"),
  )
  const opportunities = buildReplyOpportunities(analyzeRelationshipDynamics(messages).turns, ["Asha", "Ravi"])

  assert.equal(opportunities[0].termination, "superseded_by_new_source_thread")
  assert.equal(opportunities[0].observedResponder, null)
  assert.equal(opportunities[0].supersedingTurnId, opportunities[1].sourceTurnId)
  assert.equal(outcomeForHorizon(opportunities[0], 1440).censored, true)
  assert.equal(outcomeForHorizon(opportunities[1], 60).outcome, true)
}

function testSameSenderFollowUp() {
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
  assert.equal(opportunities[0].sourceTurnMessageCount, 2)
  assert.equal(opportunities[0].termination, "observed_response")
  assert.equal(opportunities[0].delayMinutes, 15)
}

function testHorizonBoundaries() {
  assert.equal(outcomeForHorizon(makeOpportunity({ delayMinutes: 60 }), 60).outcome, true)
  assert.equal(outcomeForHorizon(makeOpportunity({ delayMinutes: 60.001 }), 60).outcome, false)
  assert.equal(outcomeForHorizon(makeOpportunity({ delayMinutes: 360 }), 360).outcome, true)
  assert.equal(outcomeForHorizon(makeOpportunity({ delayMinutes: 360.001 }), 360).outcome, false)
  assert.equal(outcomeForHorizon(makeOpportunity({ delayMinutes: 1440 }), 1440).outcome, true)
  assert.equal(outcomeForHorizon(makeOpportunity({ delayMinutes: 1440.001 }), 1440).outcome, false)
}

function testExportEndCensoring() {
  const oneHourCovered = makeOpportunity({
    delayMinutes: null,
    predictionTime: "2026-01-01T09:00:00.000Z",
    censorTime: "2026-01-01T10:30:00.000Z",
    termination: "export_end",
  })
  assert.equal(outcomeForHorizon(oneHourCovered, 60).outcome, false)
  assert.equal(outcomeForHorizon(oneHourCovered, 1440).censored, true)

  const superseded = makeOpportunity({
    delayMinutes: null,
    predictionTime: "2026-01-01T09:00:00.000Z",
    censorTime: "2026-01-01T09:30:00.000Z",
    termination: "superseded_by_new_source_thread",
  })
  assert.deepEqual(outcomeForHorizon(superseded, 60), {
    eligible: false,
    censored: true,
    outcome: null,
    reason: "source sender started a new thread before the full horizon elapsed",
  })
}

function testReplyMetrics() {
  const opportunities = Array.from({ length: 16 }, (_, index) =>
    makeOpportunity({
      id: `op-${index}`,
      predictionTime: `2026-01-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
      delayMinutes: index % 3 === 0 ? 120 : 20,
      sourceSender: index % 2 === 0 ? "Asha" : "Ravi",
      expectedResponder: index % 2 === 0 ? "Ravi" : "Asha",
    }),
  )
  const result = evaluateReplyWithinHorizon(opportunities, 60, syntheticEvidence(opportunities.length))
  assert.ok(result.metrics.time_context)
  assert.equal(result.metrics.candidate.calibrationBins.length, 5)
  assert.equal(
    result.metrics.candidate.nonEmptyCalibrationBins,
    result.metrics.candidate.calibrationBins.filter((bin) => bin.count > 0).length,
  )
  assert.ok("precision" in result.metrics.candidate)
  assert.ok("recall" in result.metrics.candidate)
  assert.ok(result.bestBaselineKey === null || ["global", "participant", "recent", "time_context"].includes(result.bestBaselineKey))
  assert.equal(result.bootstrap.seed, FORECASTING_BOOTSTRAP_SEED)
  assert.ok(result.subgroupChecks.some((check) => check.subgroup.startsWith("period:")))
}

function testDelayBucketMetrics() {
  const delays = [10, 20, 40, 90, 120, 180, 400, 500, 800, 1500, 1600, 1700]
  const result = evaluateConditionalReplyDelayBucket(
    delays.map((delayMinutes, index) =>
      makeOpportunity({
        id: `delay-${index}`,
        delayMinutes,
        predictionTime: `2026-02-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
      }),
    ),
  )
  assert.ok(result.baselines.time_context)
  assert.ok(result.baselines.candidate.confusionMatrix.under_1h)
  assert.ok(result.baselines.candidate.perClass.over_24h)
  assert.equal(result.baselines.candidate.evaluatedCount, result.predictionRecords.length)
  assert.equal(typeof result.insufficientSupport, "boolean")
}

function testActivityMetrics() {
  const windows = Array.from({ length: 8 }, (_, index) => ({
    index,
    start: `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    end: `2026-03-${String(index + 1).padStart(2, "0")}T23:59:00.000Z`,
    partial: false,
    eligible: true,
    messageCount: index < 4 ? 20 : 6,
    activeDays: 1,
    turnCount: 2,
    threadCount: 1,
    reconnectionCount: 0,
    participants: [],
  }))
  const result = evaluateNextWindowActivity(windows)
  assert.ok(result.baselines.ewma)
  assert.equal(result.baselines.candidate.evaluatedCount, result.predictionRecords.length)
  assert.ok("safeMape" in result.baselines.candidate)
  assert.ok(result.predictionRecords[0].absoluteErrors.ewma >= 0)
}

function testPromotionGate() {
  const bootstrap = passingBootstrap()
  const subgroupChecks = [passingSubgroup()]
  const methodPass = assessReplyHorizonPromotion({
    evaluatedCount: 100,
    positiveCount: 50,
    negativeCount: 50,
    candidateBrier: 0.18,
    bestBaselineBrier: 0.2,
    calibrationError: 0.05,
    participantMinimumEvaluatedCount: 40,
    bootstrap,
    subgroupChecks,
    validationEvidence: syntheticEvidence(100),
  })
  assert.equal(methodPass.methodGatePassed, true)
  assert.equal(methodPass.promoted, false)
  assert.match(methodPass.reasons.join("\n"), /Synthetic fixtures/)

  const subgroupFail = assessReplyHorizonPromotion({
    evaluatedCount: 100,
    positiveCount: 50,
    negativeCount: 50,
    candidateBrier: 0.18,
    bestBaselineBrier: 0.2,
    calibrationError: 0.05,
    participantMinimumEvaluatedCount: 40,
    bootstrap,
    subgroupChecks: [{ ...passingSubgroup(), degradation: 0.2, catastrophicFailure: true }],
    validationEvidence: syntheticEvidence(100),
  })
  assert.equal(subgroupFail.methodGatePassed, false)
}

function testLeakageHelper() {
  assert.doesNotThrow(() =>
    assertNoForecastingLeakage([{ featureTime: "2026-01-01T09:00:00.000Z", predictionTime: "2026-01-01T09:10:00.000Z" }]),
  )
  assert.throws(
    () =>
      assertNoForecastingLeakage([
        { featureTime: "2026-01-01T09:11:00.000Z", predictionTime: "2026-01-01T09:10:00.000Z" },
      ]),
    /Forecasting leakage/,
  )
}

function testFutureMutationDoesNotChangeEarlierPrediction() {
  const base = Array.from({ length: 8 }, (_, index) =>
    makeOpportunity({
      id: `stable-${index}`,
      predictionTime: `2026-04-${String(index + 1).padStart(2, "0")}T09:00:00.000Z`,
      delayMinutes: index % 2 === 0 ? 20 : 80,
    }),
  )
  const changedFuture = base.map((opportunity, index) =>
    index === base.length - 1 ? { ...opportunity, delayMinutes: 300, observedResponseTime: "2026-04-08T14:00:00.000Z" } : opportunity,
  )
  const firstPrediction = evaluateReplyWithinHorizon(base, 60, syntheticEvidence(base.length)).predictionRecords[0]
  const firstAfterFutureChange = evaluateReplyWithinHorizon(changedFuture, 60, syntheticEvidence(base.length)).predictionRecords[0]
  assert.deepEqual(firstAfterFutureChange.probabilities, firstPrediction.probabilities)
}

function testResearchReportIsConservative() {
  const text = fs.readFileSync(path.join(root, "fixtures", "whatsapp", "stage4_balanced_then_one_sided.txt"), "utf8")
  const report = evaluateForecastingResearch(parseWhatsAppChat(text), {
    datasetKind: "synthetic",
    datasetIdentity: "stage4_balanced_then_one_sided.txt",
  })

  assert.equal(report.status, "not_validated")
  assert.equal(report.summary.productPromotion, false)
  assert.equal(report.opportunities.reply.total > 0, true)
  assert.equal(report.tasks.initiationReconnection.promoted, false)
  assert.equal(report.validationEvidence.realWorldValidationEligible, false)
  assert.match(report.summary.reasons.join("\n"), /not knowledge of intent/)
}

function makeOpportunity(overrides: Partial<ReplyOpportunity> = {}): ReplyOpportunity {
  const predictionTime = overrides.predictionTime ?? "2026-01-01T09:00:00.000Z"
  const delayMinutes = overrides.delayMinutes === undefined ? 20 : overrides.delayMinutes
  const observedResponseTime =
    delayMinutes === null ? null : new Date(new Date(predictionTime).getTime() + delayMinutes * 60_000).toISOString()
  const termination = overrides.termination ?? (delayMinutes === null ? "export_end" : "observed_response")
  return {
    id: overrides.id ?? "opportunity",
    conversationIndex: overrides.conversationIndex ?? 0,
    sourceTurnIndex: overrides.sourceTurnIndex ?? 0,
    sourceTurnId: overrides.sourceTurnId ?? 0,
    sourceSender: overrides.sourceSender ?? "Asha",
    expectedResponder: overrides.expectedResponder ?? "Ravi",
    observedResponder: delayMinutes === null ? null : "Ravi",
    predictionTime,
    observedResponseTime,
    delayMinutes,
    censorTime: overrides.censorTime ?? observedResponseTime ?? predictionTime,
    censored: termination !== "observed_response",
    openAtExportEnd: termination === "export_end",
    termination,
    supersedingTurnId: overrides.supersedingTurnId ?? null,
    groupApproximation: overrides.groupApproximation ?? false,
    startsThread: overrides.startsThread ?? true,
    sourceTurnMessageCount: overrides.sourceTurnMessageCount ?? 1,
    sourceTurnWordCount: overrides.sourceTurnWordCount ?? 3,
    ...overrides,
  }
}

function syntheticEvidence(evaluatedOpportunityCount: number): ExternalValidationEvidence {
  return {
    datasetKind: "synthetic",
    conversationCount: 1,
    independentConversationCount: 0,
    evaluatedOpportunityCount,
    provenance: "unit test synthetic fixture",
    bootstrapCompleted: true,
    subgroupChecksCompleted: true,
    realWorldValidationEligible: false,
  }
}

function passingBootstrap(): BootstrapResult {
  return {
    seed: FORECASTING_BOOTSTRAP_SEED,
    resampleCount: 200,
    confidenceLevel: 0.9,
    pointEstimate: 0.02,
    lowerBound: 0.01,
    upperBound: 0.03,
    stronglyInferior: false,
    unavailableReason: null,
  }
}

function passingSubgroup(): SubgroupCheckResult {
  return {
    subgroup: "period:early",
    sampleCount: 50,
    candidateScore: 0.18,
    bestBaselineScore: 0.2,
    degradation: -0.02,
    eligible: true,
    catastrophicFailure: false,
  }
}

run()
