import type { ChatMessage } from "./chat-parser"
import {
  FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL,
  FORECASTING_BOOTSTRAP_RESAMPLE_COUNT,
  FORECASTING_BOOTSTRAP_SEED,
  FORECASTING_BOOTSTRAP_STRONGLY_INFERIOR_MARGIN,
  FORECASTING_CALIBRATION_BINS,
  FORECASTING_CONTRACT_VERSION,
  FORECASTING_DELAY_BUCKETS,
  FORECASTING_MIN_CONTEXT_SAMPLES,
  FORECASTING_MIN_PARTICIPANT_SAMPLES,
  FORECASTING_PROBABILITY_CLIP,
  FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS,
  FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT,
  FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES,
  FORECASTING_PROMOTION_REPLY_MAX_CALIBRATION_ERROR,
  FORECASTING_PROMOTION_REPLY_MIN_BRIER_IMPROVEMENT_PCT,
  FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT,
  FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
  FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE,
  FORECASTING_PROMOTION_REPLY_MIN_POSITIVE,
  FORECASTING_RECENT_WINDOW_SIZE,
  FORECASTING_SAFETY_WORDING,
  FORECASTING_SMOOTHING_ALPHA,
  FORECASTING_SMOOTHING_BETA,
  FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
  FORECASTING_SUBGROUP_MIN_EVALUATED,
  FORECASTING_WARM_UP_REPLY_OPPORTUNITIES,
  FORECASTING_WARM_UP_WINDOWS,
  REPLY_HORIZONS_MINUTES,
} from "./forecasting-contract"
import {
  analyzeRelationshipDynamics,
  type AdaptiveWindow,
  type ConversationTurn,
} from "./relationship-dynamics"

const MINUTE_MS = 60 * 1000

export type ForecastingValidationStatus = "not_validated"
export type ForecastingGateState = "passed_method_gate" | "failed_gate" | "not_applicable"
export type DelayBucketLabel = (typeof FORECASTING_DELAY_BUCKETS)[number]["label"]
export type ReplyOpportunityTermination = "observed_response" | "superseded_by_new_source_thread" | "export_end"
export type BinaryBaselineKey = "global" | "participant" | "recent" | "time_context"
export type BinaryEstimatorKey = BinaryBaselineKey | "candidate"
export type DelayEstimatorKey = "global" | "participant" | "recent" | "time_context" | "candidate"
export type ActivityEstimatorKey = "previous" | "historical_mean" | "rolling_mean" | "ewma" | "candidate"

export interface ReplyOpportunity {
  id: string
  conversationIndex: number
  sourceTurnIndex: number
  sourceTurnId: number
  sourceSender: string
  expectedResponder: string | null
  observedResponder: string | null
  predictionTime: string
  observedResponseTime: string | null
  delayMinutes: number | null
  censorTime: string
  censored: boolean
  openAtExportEnd: boolean
  termination: ReplyOpportunityTermination
  supersedingTurnId: number | null
  groupApproximation: boolean
  startsThread: boolean
  sourceTurnMessageCount: number
  sourceTurnWordCount: number
}

export interface HorizonOutcome {
  eligible: boolean
  censored: boolean
  outcome: boolean | null
  reason: string | null
}

export interface BinaryForecastMetrics {
  evaluatedCount: number
  positiveCount: number
  negativeCount: number
  brierScore: number | null
  logLoss: number | null
  calibrationError: number | null
  calibrationBins: CalibrationBin[]
  nonEmptyCalibrationBins: number
  accuracy: number | null
  precision: number | null
  recall: number | null
  relativeBrierImprovementPct: number | null
}

export interface BinaryForecastResult {
  horizonMinutes: number
  eligibleCount: number
  censoredCount: number
  metrics: Record<BinaryEstimatorKey, BinaryForecastMetrics>
  predictionRecords: BinaryPredictionRecord[]
  candidateRelativeBrierImprovementPct: Record<BinaryBaselineKey, number | null>
  bestBaselineKey: BinaryBaselineKey | null
  candidateImprovementOverBestBaselinePct: number | null
  bootstrap: BootstrapResult
  subgroupChecks: SubgroupCheckResult[]
  promotion: ForecastingPromotionDecision
}

export interface DelayBucketTaskResult {
  observedResponseCount: number
  evaluatedCount: number
  classSupport: Record<string, number>
  baselines: Record<DelayEstimatorKey, MulticlassForecastMetrics>
  predictionRecords: DelayPredictionRecord[]
  bestBaselineKey: Exclude<DelayEstimatorKey, "candidate"> | null
  insufficientSupport: boolean
  promotion: ForecastingPromotionDecision
}

export interface MulticlassForecastMetrics {
  evaluatedCount: number
  accuracy: number | null
  balancedAccuracy: number | null
  macroF1: number | null
  logLoss: number | null
  confusionMatrix: Record<string, Record<string, number>>
  perClass: Record<string, ClassMetrics>
  classSupport: Record<string, number>
}

export interface ActivityTaskResult {
  completedWindowCount: number
  evaluatedCount: number
  baselines: Record<ActivityEstimatorKey, RegressionForecastMetrics>
  predictionRecords: ActivityPredictionRecord[]
  bestBaselineKey: Exclude<ActivityEstimatorKey, "candidate"> | null
  candidateImprovementOverBestBaselinePct: number | null
  promotion: ForecastingPromotionDecision
}

export interface RegressionForecastMetrics {
  evaluatedCount: number
  mae: number | null
  medianAbsoluteError: number | null
  rmse: number | null
  safeMape: number | null
}

export interface ForecastingPromotionDecision {
  promoted: boolean
  state: ForecastingGateState
  methodGatePassed: boolean
  reasons: string[]
}

export interface CalibrationBin {
  lowerBound: number
  upperBound: number
  meanPredicted: number | null
  observedRate: number | null
  count: number
}

export interface BinaryPredictionRecord {
  opportunityId: string
  participantContext: string
  predictionTime: string
  outcome: boolean
  probabilities: Record<BinaryEstimatorKey, number>
}

export interface DelayPredictionRecord {
  opportunityId: string
  participantContext: string
  predictionTime: string
  bucket: DelayBucketLabel
  distributions: Record<DelayEstimatorKey, Record<string, number>>
}

export interface ActivityPredictionRecord {
  windowIndex: number
  predictionTime: string
  targetWindowStart: string
  targetWindowEnd: string
  actual: number
  predictions: Record<ActivityEstimatorKey, number>
  absoluteErrors: Record<ActivityEstimatorKey, number>
}

export interface ClassMetrics {
  support: number
  precision: number | null
  recall: number | null
  f1: number | null
}

export interface BootstrapResult {
  seed: number
  resampleCount: number
  confidenceLevel: number
  pointEstimate: number | null
  lowerBound: number | null
  upperBound: number | null
  stronglyInferior: boolean
  unavailableReason: string | null
}

export interface SubgroupCheckResult {
  subgroup: string
  sampleCount: number
  candidateScore: number | null
  bestBaselineScore: number | null
  degradation: number | null
  eligible: boolean
  catastrophicFailure: boolean
}

export interface ExternalValidationEvidence {
  datasetKind: "synthetic" | "private_exports" | "research_dataset"
  conversationCount: number
  independentConversationCount: number
  evaluatedOpportunityCount: number
  provenance: string
  bootstrapCompleted: boolean
  subgroupChecksCompleted: boolean
  realWorldValidationEligible: boolean
}

export interface ForecastingEvaluationOptions {
  datasetKind?: ExternalValidationEvidence["datasetKind"]
  datasetIdentity?: string
}

export interface ForecastingResearchReport {
  contractVersion: string
  status: ForecastingValidationStatus
  summary: {
    productPromotion: false
    reasons: string[]
    replyOpportunityCount: number
    observedReplyCount: number
    completedActivityWindowCount: number
  }
  validationEvidence: ExternalValidationEvidence
  opportunities: {
    reply: {
      total: number
      observedResponses: number
      finalOpenTurns: number
      groupApproximation: boolean
    }
  }
  tasks: {
    replyWithinHorizon: Record<string, BinaryForecastResult>
    conditionalReplyDelayBucket: DelayBucketTaskResult
    nextWindowActivity: ActivityTaskResult
    initiationReconnection: ForecastingPromotionDecision
  }
  safety: typeof FORECASTING_SAFETY_WORDING
}

interface BinaryExample {
  opportunity: ReplyOpportunity
  outcome: boolean
}

interface BinaryPrediction {
  outcome: boolean
  probability: number
  participantContext: string
}

interface DelayExample {
  opportunity: ReplyOpportunity
  bucket: DelayBucketLabel
}

interface DelayPrediction {
  bucket: DelayBucketLabel
  distribution: Record<string, number>
}

interface ActivityPrediction {
  actual: number
  predicted: number
}

export function evaluateForecastingResearch(
  messages: ChatMessage[],
  options: ForecastingEvaluationOptions = {},
): ForecastingResearchReport {
  const sorted = [...messages]
    .filter((message) => !Number.isNaN(message.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
  const dynamics = analyzeRelationshipDynamics(sorted)
  const participants = uniqueSenders(sorted)
  const opportunities = buildReplyOpportunities(dynamics.turns, participants)
  const completedWindows = dynamics.adaptiveWindows.filter((bucket) => bucket.eligible && !bucket.partial)
  const validationEvidence = buildExternalValidationEvidence(options, opportunities.length)
  const replyWithinHorizon = Object.fromEntries(
    REPLY_HORIZONS_MINUTES.map((horizon) => [
      String(horizon),
      evaluateReplyWithinHorizon(opportunities, horizon, validationEvidence),
    ]),
  ) as Record<string, BinaryForecastResult>
  const conditionalReplyDelayBucket = evaluateConditionalReplyDelayBucket(opportunities)
  const nextWindowActivity = evaluateNextWindowActivity(completedWindows)
  const reasons = [
    FORECASTING_SAFETY_WORDING.notValidated,
    "Stage 5 validates backtesting mechanics and conservative gates; it does not establish general predictive validity.",
    FORECASTING_SAFETY_WORDING.noMotive,
  ]

  return {
    contractVersion: FORECASTING_CONTRACT_VERSION,
    status: "not_validated",
    summary: {
      productPromotion: false,
      reasons,
      replyOpportunityCount: opportunities.length,
      observedReplyCount: opportunities.filter((opportunity) => opportunity.delayMinutes !== null).length,
      completedActivityWindowCount: completedWindows.length,
    },
    validationEvidence,
    opportunities: {
      reply: {
        total: opportunities.length,
        observedResponses: opportunities.filter((opportunity) => opportunity.delayMinutes !== null).length,
        finalOpenTurns: opportunities.filter((opportunity) => opportunity.openAtExportEnd).length,
        groupApproximation: participants.length > 2,
      },
    },
    tasks: {
      replyWithinHorizon,
      conditionalReplyDelayBucket,
      nextWindowActivity,
      initiationReconnection: {
        promoted: false,
        state: "not_applicable",
        methodGatePassed: false,
        reasons: [
          "Initiation and reconnection forecasting were audited but not implemented for Stage 5 promotion.",
          "Sample sizes and independent observations are likely insufficient in single exports.",
        ],
      },
    },
    safety: FORECASTING_SAFETY_WORDING,
  }
}

export function buildReplyOpportunities(turns: ConversationTurn[], participants: string[]): ReplyOpportunity[] {
  if (turns.length === 0) return []
  const groupApproximation = participants.length > 2
  const exportEnd = turns.at(-1)!.end
  const opportunities: ReplyOpportunity[] = []

  for (let index = 0; index < turns.length; index += 1) {
    const source = turns[index]
    let response: ConversationTurn | null = null
    let supersedingTurn: ConversationTurn | null = null
    for (const candidate of turns.slice(index + 1)) {
      if (candidate.sender !== source.sender) {
        response = candidate
        break
      }
      if (candidate.startsThread) {
        supersedingTurn = candidate
        break
      }
    }
    const expectedResponder =
      participants.length === 2 ? participants.find((sender) => sender !== source.sender) ?? null : null
    const predictionTime = source.end
    const termination: ReplyOpportunityTermination = response
      ? "observed_response"
      : supersedingTurn
        ? "superseded_by_new_source_thread"
        : "export_end"
    const censorTime = response?.start ?? supersedingTurn?.start ?? exportEnd
    opportunities.push({
      id: `turn-${source.id}`,
      conversationIndex: 0,
      sourceTurnIndex: index,
      sourceTurnId: source.id,
      sourceSender: source.sender,
      expectedResponder,
      observedResponder: response?.sender ?? null,
      predictionTime,
      observedResponseTime: response?.start ?? null,
      delayMinutes: response ? round(diffMinutes(predictionTime, response.start), 3) : null,
      censorTime,
      censored: termination !== "observed_response",
      openAtExportEnd: termination === "export_end",
      termination,
      supersedingTurnId: supersedingTurn?.id ?? null,
      groupApproximation,
      startsThread: source.startsThread,
      sourceTurnMessageCount: source.messageCount,
      sourceTurnWordCount: source.wordCount,
    })
  }

  return opportunities
}

export function outcomeForHorizon(opportunity: ReplyOpportunity, horizonMinutes: number): HorizonOutcome {
  if (opportunity.delayMinutes !== null) {
    return {
      eligible: true,
      censored: false,
      outcome: opportunity.delayMinutes <= horizonMinutes,
      reason: null,
    }
  }

  const observedCoverageMinutes = diffMinutes(opportunity.predictionTime, opportunity.censorTime)
  if (observedCoverageMinutes < horizonMinutes) {
    const reason =
      opportunity.termination === "superseded_by_new_source_thread"
        ? "source sender started a new thread before the full horizon elapsed"
        : "export ended before the full horizon elapsed"
    return {
      eligible: false,
      censored: true,
      outcome: null,
      reason,
    }
  }

  return {
    eligible: true,
    censored: false,
    outcome: false,
    reason: null,
  }
}

export function evaluateReplyWithinHorizon(
  opportunities: ReplyOpportunity[],
  horizonMinutes: number,
  validationEvidence: ExternalValidationEvidence = buildExternalValidationEvidence({}, opportunities.length),
): BinaryForecastResult {
  const prior: BinaryExample[] = []
  const predictions: Record<BinaryEstimatorKey, BinaryPrediction[]> = {
    global: [],
    participant: [],
    recent: [],
    time_context: [],
    candidate: [],
  }
  const predictionRecords: BinaryPredictionRecord[] = []
  let eligibleCount = 0
  let censoredCount = 0

  for (const opportunity of opportunities) {
    const outcome = outcomeForHorizon(opportunity, horizonMinutes)
    if (outcome.censored) {
      censoredCount += 1
      continue
    }
    if (!outcome.eligible || outcome.outcome === null) continue
    eligibleCount += 1

    if (prior.length >= FORECASTING_WARM_UP_REPLY_OPPORTUNITIES) {
      const predicted = binaryProbabilities(prior, opportunity)
      const context = participantKey(opportunity)
      for (const key of Object.keys(predictions) as Array<keyof typeof predictions>) {
        predictions[key].push({ outcome: outcome.outcome, probability: predicted[key], participantContext: context })
      }
      predictionRecords.push({
        opportunityId: opportunity.id,
        participantContext: context,
        predictionTime: opportunity.predictionTime,
        outcome: outcome.outcome,
        probabilities: predicted,
      })
    }

    prior.push({ opportunity, outcome: outcome.outcome })
  }

  const metrics = {
    global: binaryMetrics(predictions.global),
    participant: binaryMetrics(predictions.participant),
    recent: binaryMetrics(predictions.recent),
    time_context: binaryMetrics(predictions.time_context),
    candidate: binaryMetrics(predictions.candidate),
  }
  const bestBaselineKey = bestBinaryBaselineKey(metrics)
  const bestBaselineBrier = bestBaselineKey ? metrics[bestBaselineKey].brierScore : null
  const candidateImprovementOverBestBaselinePct =
    bestBaselineBrier !== null && bestBaselineBrier > 0 && metrics.candidate.brierScore !== null
      ? round(((bestBaselineBrier - metrics.candidate.brierScore) / bestBaselineBrier) * 100, 1)
      : null
  const candidateRelativeBrierImprovementPct = candidateBrierImprovements(metrics)
  metrics.candidate.relativeBrierImprovementPct = candidateImprovementOverBestBaselinePct
  const bootstrap = bootstrapBrierImprovement(predictionRecords, bestBaselineKey)
  const subgroupChecks = subgroupBrierChecks(predictionRecords, bestBaselineKey)

  return {
    horizonMinutes,
    eligibleCount,
    censoredCount,
    metrics,
    predictionRecords,
    candidateRelativeBrierImprovementPct,
    bestBaselineKey,
    candidateImprovementOverBestBaselinePct,
    bootstrap,
    subgroupChecks,
    promotion: assessReplyHorizonPromotion({
      evaluatedCount: metrics.candidate.evaluatedCount,
      positiveCount: metrics.candidate.positiveCount,
      negativeCount: metrics.candidate.negativeCount,
      candidateBrier: metrics.candidate.brierScore,
      bestBaselineBrier,
      calibrationError: metrics.candidate.calibrationError,
      participantMinimumEvaluatedCount: participantMinimumEvaluationCount(predictions.candidate),
      bootstrap,
      subgroupChecks,
      validationEvidence: {
        ...validationEvidence,
        evaluatedOpportunityCount: metrics.candidate.evaluatedCount,
        bootstrapCompleted: bootstrap.unavailableReason === null,
        subgroupChecksCompleted: subgroupChecks.some((check) => check.eligible),
      },
    }),
  }
}

export function evaluateConditionalReplyDelayBucket(opportunities: ReplyOpportunity[]): DelayBucketTaskResult {
  const observed = opportunities.filter((opportunity) => opportunity.delayMinutes !== null)
  const prior: DelayExample[] = []
  const predictions: Record<DelayEstimatorKey, DelayPrediction[]> = {
    global: [],
    participant: [],
    recent: [],
    time_context: [],
    candidate: [],
  }
  const predictionRecords: DelayPredictionRecord[] = []

  for (const opportunity of observed) {
    const bucket = bucketForDelay(opportunity.delayMinutes!)
    if (prior.length >= FORECASTING_WARM_UP_REPLY_OPPORTUNITIES) {
      const distributions = delayDistributions(prior, opportunity)
      for (const key of Object.keys(predictions) as Array<keyof typeof predictions>) {
        predictions[key].push({ bucket, distribution: distributions[key] })
      }
      predictionRecords.push({
        opportunityId: opportunity.id,
        participantContext: participantKey(opportunity),
        predictionTime: opportunity.predictionTime,
        bucket,
        distributions,
      })
    }
    prior.push({ opportunity, bucket })
  }

  const baselines = {
    global: multiclassMetrics(predictions.global),
    participant: multiclassMetrics(predictions.participant),
    recent: multiclassMetrics(predictions.recent),
    time_context: multiclassMetrics(predictions.time_context),
    candidate: multiclassMetrics(predictions.candidate),
  }
  const support = classSupport(observed.map((opportunity) => bucketForDelay(opportunity.delayMinutes!)))
  const bestBaselineKey = bestDelayBaselineKey(baselines)
  const candidateBeatsLogLoss =
    baselines.candidate.logLoss !== null &&
    [baselines.global.logLoss, baselines.participant.logLoss, baselines.recent.logLoss, baselines.time_context.logLoss]
      .filter((value): value is number => value !== null)
      .every((value) => baselines.candidate.logLoss! < value)
  const candidateBeatsMacroF1 =
    baselines.candidate.macroF1 !== null &&
    [baselines.global.macroF1, baselines.participant.macroF1, baselines.recent.macroF1, baselines.time_context.macroF1]
      .filter((value): value is number => value !== null)
      .every((value) => baselines.candidate.macroF1! > value)
  const meaningfulClassSupport = Object.values(support).filter((count) => count >= 3).length >= 2
  const insufficientSupport = !meaningfulClassSupport

  return {
    observedResponseCount: observed.length,
    evaluatedCount: predictions.candidate.length,
    classSupport: support,
    baselines,
    predictionRecords,
    bestBaselineKey,
    insufficientSupport,
    promotion: {
      promoted: false,
      state:
        observed.length >= FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES &&
        meaningfulClassSupport &&
        candidateBeatsLogLoss &&
        candidateBeatsMacroF1
          ? "passed_method_gate"
          : "failed_gate",
      methodGatePassed:
        observed.length >= FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES &&
        meaningfulClassSupport &&
        candidateBeatsLogLoss &&
        candidateBeatsMacroF1,
      reasons: [
        ...(observed.length < FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES
          ? [`Requires ${FORECASTING_PROMOTION_DELAY_MIN_OBSERVED_RESPONSES} observed responses; found ${observed.length}.`]
          : []),
        ...(meaningfulClassSupport ? [] : ["Delay bucket support is too concentrated for product validation."]),
        ...(candidateBeatsLogLoss && candidateBeatsMacroF1
          ? []
          : ["The transparent candidate did not beat all delay-bucket baselines on both log loss and macro F1."]),
        FORECASTING_SAFETY_WORDING.syntheticLimit,
      ],
    },
  }
}

export function evaluateNextWindowActivity(windows: AdaptiveWindow[]): ActivityTaskResult {
  const values = windows.map((bucket) => ({
    bucket,
    value: bucket.activeDays > 0 ? bucket.messageCount / bucket.activeDays : 0,
  }))
  const predictions: Record<ActivityEstimatorKey, ActivityPrediction[]> = {
    previous: [],
    historical_mean: [],
    rolling_mean: [],
    ewma: [],
    candidate: [],
  }
  const predictionRecords: ActivityPredictionRecord[] = []

  for (let index = FORECASTING_WARM_UP_WINDOWS; index < values.length; index += 1) {
    const prior = values.slice(0, index).map((item) => item.value)
    const actual = values[index].value
    const previous = prior.at(-1)!
    const historicalMean = average(prior)
    const rollingMean = average(prior.slice(-FORECASTING_WARM_UP_WINDOWS))
    const ewma = exponentiallyWeightedMean(prior)
    const trend = prior.length >= 2 ? prior.at(-1)! - prior.at(-2)! : 0
    const candidate = Math.max(0, rollingMean + trend * 0.5)
    predictions.previous.push({ actual, predicted: previous })
    predictions.historical_mean.push({ actual, predicted: historicalMean })
    predictions.rolling_mean.push({ actual, predicted: rollingMean })
    predictions.ewma.push({ actual, predicted: ewma })
    predictions.candidate.push({ actual, predicted: candidate })
    const rowPredictions = {
      previous,
      historical_mean: historicalMean,
      rolling_mean: rollingMean,
      ewma,
      candidate,
    }
    predictionRecords.push({
      windowIndex: values[index].bucket.index,
      predictionTime: values[index - 1].bucket.end,
      targetWindowStart: values[index].bucket.start,
      targetWindowEnd: values[index].bucket.end,
      actual,
      predictions: rowPredictions,
      absoluteErrors: Object.fromEntries(
        (Object.keys(rowPredictions) as ActivityEstimatorKey[]).map((key) => [key, round(Math.abs(rowPredictions[key] - actual), 4)]),
      ) as Record<ActivityEstimatorKey, number>,
    })
  }

  const baselines = {
    previous: regressionMetrics(predictions.previous),
    historical_mean: regressionMetrics(predictions.historical_mean),
    rolling_mean: regressionMetrics(predictions.rolling_mean),
    ewma: regressionMetrics(predictions.ewma),
    candidate: regressionMetrics(predictions.candidate),
  }
  const bestBaselineKey = bestActivityBaselineKey(baselines)
  const bestBaselineMae = bestBaselineKey ? baselines[bestBaselineKey].mae : null
  const candidateImprovementOverBestBaselinePct =
    bestBaselineMae !== null && bestBaselineMae > 0 && baselines.candidate.mae !== null
      ? round(((bestBaselineMae - baselines.candidate.mae) / bestBaselineMae) * 100, 1)
      : null
  const methodGatePassed =
    predictions.candidate.length >= FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS &&
    candidateImprovementOverBestBaselinePct !== null &&
    candidateImprovementOverBestBaselinePct >= FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT

  return {
    completedWindowCount: windows.length,
    evaluatedCount: predictions.candidate.length,
    baselines,
    predictionRecords,
    bestBaselineKey,
    candidateImprovementOverBestBaselinePct,
    promotion: {
      promoted: false,
      state: methodGatePassed ? "passed_method_gate" : "failed_gate",
      methodGatePassed,
      reasons: [
        ...(predictions.candidate.length < FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS
          ? [
              `Requires ${FORECASTING_PROMOTION_ACTIVITY_MIN_COMPLETED_TARGET_WINDOWS} completed target windows; found ${predictions.candidate.length}.`,
            ]
          : []),
        ...(candidateImprovementOverBestBaselinePct === null ||
        candidateImprovementOverBestBaselinePct < FORECASTING_PROMOTION_ACTIVITY_MIN_MAE_IMPROVEMENT_PCT
          ? ["The activity candidate did not clear the MAE improvement gate."]
          : []),
        FORECASTING_SAFETY_WORDING.syntheticLimit,
      ],
    },
  }
}

export function assessReplyHorizonPromotion(input: {
  evaluatedCount: number
  positiveCount: number
  negativeCount: number
  candidateBrier: number | null
  bestBaselineBrier: number | null
  calibrationError: number | null
  participantMinimumEvaluatedCount?: number
  bootstrap: BootstrapResult
  subgroupChecks: SubgroupCheckResult[]
  validationEvidence: ExternalValidationEvidence
}): ForecastingPromotionDecision {
  const participantMinimum =
    input.participantMinimumEvaluatedCount ?? FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT
  const improvement =
    input.bestBaselineBrier !== null && input.bestBaselineBrier > 0 && input.candidateBrier !== null
      ? ((input.bestBaselineBrier - input.candidateBrier) / input.bestBaselineBrier) * 100
      : null
  const reasons: string[] = []

  if (input.evaluatedCount < FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL) {
    reasons.push(
      `Requires ${FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL} evaluated opportunities; found ${input.evaluatedCount}.`,
    )
  }
  if (participantMinimum < FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT) {
    reasons.push(
      `Requires ${FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_FOR_DISPLAYED_PARTICIPANT} evaluated opportunities for displayed participant groups; found ${participantMinimum}.`,
    )
  }
  if (input.positiveCount < FORECASTING_PROMOTION_REPLY_MIN_POSITIVE) {
    reasons.push(`Requires ${FORECASTING_PROMOTION_REPLY_MIN_POSITIVE} positive examples; found ${input.positiveCount}.`)
  }
  if (input.negativeCount < FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE) {
    reasons.push(`Requires ${FORECASTING_PROMOTION_REPLY_MIN_NEGATIVE} negative examples; found ${input.negativeCount}.`)
  }
  if (improvement === null || improvement < FORECASTING_PROMOTION_REPLY_MIN_BRIER_IMPROVEMENT_PCT) {
    reasons.push("The candidate did not clear the Brier improvement gate over the best baseline.")
  }
  if (input.calibrationError === null || input.calibrationError > FORECASTING_PROMOTION_REPLY_MAX_CALIBRATION_ERROR) {
    reasons.push("The candidate did not clear the calibration error gate.")
  }
  if (input.bootstrap.unavailableReason !== null) {
    reasons.push(`Bootstrap comparison unavailable: ${input.bootstrap.unavailableReason}`)
  } else if (input.bootstrap.stronglyInferior) {
    reasons.push("Bootstrap evidence indicates the candidate may be strongly inferior to the best baseline.")
  }
  const catastrophicChecks = input.subgroupChecks.filter((check) => check.eligible && check.catastrophicFailure)
  if (catastrophicChecks.length > 0) {
    reasons.push(
      `Catastrophic subgroup degradation detected in ${catastrophicChecks.length} subgroup/time-slice check(s).`,
    )
  }

  const methodGatePassed = reasons.length === 0
  if (!input.validationEvidence.realWorldValidationEligible) {
    reasons.push(FORECASTING_SAFETY_WORDING.syntheticLimit)
  }

  return {
    promoted: methodGatePassed && input.validationEvidence.realWorldValidationEligible,
    state: methodGatePassed ? "passed_method_gate" : "failed_gate",
    methodGatePassed,
    reasons,
  }
}

function binaryProbabilities(
  prior: BinaryExample[],
  opportunity: ReplyOpportunity,
): Record<BinaryEstimatorKey, number> {
  const global = smoothedBinaryRate(prior)
  const participantExamples = prior.filter((example) => participantKey(example.opportunity) === participantKey(opportunity))
  const recentExamples = prior.slice(-FORECASTING_RECENT_WINDOW_SIZE)
  const contextExamples = prior.filter(
    (example) =>
      participantKey(example.opportunity) === participantKey(opportunity) &&
      dayKind(example.opportunity.predictionTime) === dayKind(opportunity.predictionTime) &&
      timeBucket(example.opportunity.predictionTime) === timeBucket(opportunity.predictionTime),
  )
  const threadExamples = prior.filter((example) => example.opportunity.startsThread === opportunity.startsThread)
  const participant =
    participantExamples.length >= FORECASTING_MIN_PARTICIPANT_SAMPLES ? smoothedBinaryRate(participantExamples) : global
  const recent = recentExamples.length ? smoothedBinaryRate(recentExamples) : global
  const timeContext =
    contextExamples.length >= FORECASTING_MIN_CONTEXT_SAMPLES ? smoothedBinaryRate(contextExamples) : participant
  const thread = threadExamples.length >= FORECASTING_MIN_CONTEXT_SAMPLES ? smoothedBinaryRate(threadExamples) : global
  const candidate = clampProbability((global + participant * 2 + recent + timeContext * 2 + thread) / 7)
  return {
    global: clampProbability(global),
    participant: clampProbability(participant),
    recent: clampProbability(recent),
    time_context: clampProbability(timeContext),
    candidate,
  }
}

function delayDistributions(
  prior: DelayExample[],
  opportunity: ReplyOpportunity,
): Record<DelayEstimatorKey, Record<string, number>> {
  const global = smoothedBucketDistribution(prior)
  const participantExamples = prior.filter((example) => participantKey(example.opportunity) === participantKey(opportunity))
  const recentExamples = prior.slice(-FORECASTING_RECENT_WINDOW_SIZE)
  const contextExamples = prior.filter(
    (example) =>
      participantKey(example.opportunity) === participantKey(opportunity) &&
      dayKind(example.opportunity.predictionTime) === dayKind(opportunity.predictionTime) &&
      timeBucket(example.opportunity.predictionTime) === timeBucket(opportunity.predictionTime),
  )
  const participant =
    participantExamples.length >= FORECASTING_MIN_PARTICIPANT_SAMPLES ? smoothedBucketDistribution(participantExamples) : global
  const recent = recentExamples.length ? smoothedBucketDistribution(recentExamples) : global
  const timeContext =
    contextExamples.length >= FORECASTING_MIN_CONTEXT_SAMPLES ? smoothedBucketDistribution(contextExamples) : participant
  return {
    global,
    participant,
    recent,
    time_context: timeContext,
    candidate: averageDistributions([global, participant, participant, recent, timeContext, timeContext]),
  }
}

function binaryMetrics(predictions: BinaryPrediction[]): BinaryForecastMetrics {
  const emptyCalibrationBins = calibrationBins([])
  if (predictions.length === 0) {
    return {
      evaluatedCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      brierScore: null,
      logLoss: null,
      calibrationError: null,
      calibrationBins: emptyCalibrationBins,
      nonEmptyCalibrationBins: 0,
      accuracy: null,
      precision: null,
      recall: null,
      relativeBrierImprovementPct: null,
    }
  }
  const positiveCount = predictions.filter((prediction) => prediction.outcome).length
  const brierScore = average(
    predictions.map((prediction) => (prediction.probability - (prediction.outcome ? 1 : 0)) ** 2),
  )
  const logLoss = average(
    predictions.map((prediction) => {
      const p = clampProbability(prediction.probability)
      return prediction.outcome ? -Math.log(p) : -Math.log(1 - p)
    }),
  )
  const accuracy = average(
    predictions.map((prediction) => (prediction.probability >= 0.5) === prediction.outcome ? 1 : 0),
  )
  const predictedPositive = predictions.filter((prediction) => prediction.probability >= 0.5)
  const truePositive = predictedPositive.filter((prediction) => prediction.outcome).length
  const falseNegative = predictions.filter((prediction) => prediction.outcome && prediction.probability < 0.5).length
  const precision = predictedPositive.length === 0 ? null : truePositive / predictedPositive.length
  const recall = truePositive + falseNegative === 0 ? null : truePositive / (truePositive + falseNegative)
  const bins = calibrationBins(predictions)
  return {
    evaluatedCount: predictions.length,
    positiveCount,
    negativeCount: predictions.length - positiveCount,
    brierScore: round(brierScore, 4),
    logLoss: round(logLoss, 4),
    calibrationError: round(calibrationErrorFromBins(bins, predictions.length), 4),
    calibrationBins: bins,
    nonEmptyCalibrationBins: bins.filter((bin) => bin.count > 0).length,
    accuracy: round(accuracy, 4),
    precision: precision === null ? null : round(precision, 4),
    recall: recall === null ? null : round(recall, 4),
    relativeBrierImprovementPct: null,
  }
}

function multiclassMetrics(predictions: DelayPrediction[]): MulticlassForecastMetrics {
  const labels = FORECASTING_DELAY_BUCKETS.map((bucket) => bucket.label)
  const emptyMatrix = emptyConfusionMatrix(labels)
  const emptySupport = Object.fromEntries(labels.map((label) => [label, 0]))
  const emptyClassMetrics = Object.fromEntries(
    labels.map((label) => [label, { support: 0, precision: null, recall: null, f1: null }]),
  )
  if (predictions.length === 0) {
    return {
      evaluatedCount: 0,
      accuracy: null,
      balancedAccuracy: null,
      macroF1: null,
      logLoss: null,
      confusionMatrix: emptyMatrix,
      perClass: emptyClassMetrics,
      classSupport: emptySupport,
    }
  }
  const predictedLabels = predictions.map((prediction) => maxProbabilityLabel(prediction.distribution))
  const accuracy = average(predictions.map((prediction, index) => (predictedLabels[index] === prediction.bucket ? 1 : 0)))
  const matrix = emptyConfusionMatrix(labels)
  predictions.forEach((prediction, index) => {
    matrix[prediction.bucket][predictedLabels[index]] += 1
  })
  const perClassEntries = labels.map((label) => {
    const truePositive = predictions.filter((prediction, index) => prediction.bucket === label && predictedLabels[index] === label).length
    const falsePositive = predictions.filter((prediction, index) => prediction.bucket !== label && predictedLabels[index] === label).length
    const falseNegative = predictions.filter((prediction, index) => prediction.bucket === label && predictedLabels[index] !== label).length
    const support = truePositive + falseNegative
    const precision = truePositive + falsePositive === 0 ? null : truePositive / (truePositive + falsePositive)
    const recall = support === 0 ? null : truePositive / support
    const f1 = precision === null || recall === null || precision + recall === 0 ? null : (2 * precision * recall) / (precision + recall)
    return [
      label,
      {
        support,
        precision: precision === null ? null : round(precision, 4),
        recall: recall === null ? null : round(recall, 4),
        f1: f1 === null ? null : round(f1, 4),
      },
    ] as const
  })
  const perClass = Object.fromEntries(perClassEntries)
  const recalls = Object.values(perClass)
    .map((metric) => metric.recall)
    .filter((value): value is number => value !== null)
  const f1Scores = Object.values(perClass)
    .map((metric) => metric.f1)
    .filter((value): value is number => value !== null)
  const logLoss = average(
    predictions.map((prediction) => -Math.log(clampProbability(prediction.distribution[prediction.bucket] ?? 0))),
  )
  return {
    evaluatedCount: predictions.length,
    accuracy: round(accuracy, 4),
    balancedAccuracy: recalls.length === 0 ? null : round(average(recalls), 4),
    macroF1: f1Scores.length === 0 ? null : round(average(f1Scores), 4),
    logLoss: round(logLoss, 4),
    confusionMatrix: matrix,
    perClass,
    classSupport: Object.fromEntries(labels.map((label) => [label, perClass[label].support])),
  }
}

function regressionMetrics(predictions: ActivityPrediction[]): RegressionForecastMetrics {
  if (predictions.length === 0) return { evaluatedCount: 0, mae: null, medianAbsoluteError: null, rmse: null, safeMape: null }
  const errors = predictions.map((prediction) => Math.abs(prediction.predicted - prediction.actual))
  const squared = predictions.map((prediction) => (prediction.predicted - prediction.actual) ** 2)
  const percentageErrors = predictions
    .filter((prediction) => prediction.actual !== 0)
    .map((prediction) => Math.abs((prediction.predicted - prediction.actual) / prediction.actual))
  return {
    evaluatedCount: predictions.length,
    mae: round(average(errors), 4),
    medianAbsoluteError: round(median(errors), 4),
    rmse: round(Math.sqrt(average(squared)), 4),
    safeMape: percentageErrors.length === 0 ? null : round(average(percentageErrors), 4),
  }
}

function calibrationBins(predictions: BinaryPrediction[]): CalibrationBin[] {
  const binCount = FORECASTING_CALIBRATION_BINS
  const bins = Array.from({ length: binCount }, () => [] as BinaryPrediction[])
  for (const prediction of predictions) {
    const index = Math.min(binCount - 1, Math.floor(clampProbability(prediction.probability) * binCount))
    bins[index].push(prediction)
  }
  return bins.map((bin, index) => {
    const lowerBound = index / binCount
    const upperBound = (index + 1) / binCount
    return {
      lowerBound,
      upperBound,
      meanPredicted: bin.length === 0 ? null : round(average(bin.map((prediction) => prediction.probability)), 4),
      observedRate:
        bin.length === 0 ? null : round(average(bin.map((prediction) => (prediction.outcome ? 1 : 0))), 4),
      count: bin.length,
    }
  })
}

function calibrationErrorFromBins(bins: CalibrationBin[], predictionCount: number): number {
  if (predictionCount === 0) return 0
  return bins.reduce((total, bin) => {
    if (bin.count === 0 || bin.meanPredicted === null || bin.observedRate === null) return total
    return total + (bin.count / predictionCount) * Math.abs(bin.meanPredicted - bin.observedRate)
  }, 0)
}

function bestBinaryBaselineKey(metrics: Record<BinaryEstimatorKey, BinaryForecastMetrics>): BinaryBaselineKey | null {
  return minMetricKey(
    {
      global: metrics.global.brierScore,
      participant: metrics.participant.brierScore,
      recent: metrics.recent.brierScore,
      time_context: metrics.time_context.brierScore,
    },
    "min",
  )
}

function bestDelayBaselineKey(
  metrics: Record<DelayEstimatorKey, MulticlassForecastMetrics>,
): Exclude<DelayEstimatorKey, "candidate"> | null {
  return minMetricKey(
    {
      global: metrics.global.logLoss,
      participant: metrics.participant.logLoss,
      recent: metrics.recent.logLoss,
      time_context: metrics.time_context.logLoss,
    },
    "min",
  )
}

function bestActivityBaselineKey(
  metrics: Record<ActivityEstimatorKey, RegressionForecastMetrics>,
): Exclude<ActivityEstimatorKey, "candidate"> | null {
  return minMetricKey(
    {
      previous: metrics.previous.mae,
      historical_mean: metrics.historical_mean.mae,
      rolling_mean: metrics.rolling_mean.mae,
      ewma: metrics.ewma.mae,
    },
    "min",
  )
}

function minMetricKey<T extends string>(values: Record<T, number | null>, direction: "min" | "max"): T | null {
  const defined = Object.entries(values).filter((entry): entry is [T, number] => typeof entry[1] === "number")
  if (defined.length === 0) return null
  return defined.reduce((best, current) =>
    direction === "min"
      ? current[1] < best[1]
        ? current
        : best
      : current[1] > best[1]
        ? current
        : best,
  )[0]
}

function candidateBrierImprovements(
  metrics: Record<BinaryEstimatorKey, BinaryForecastMetrics>,
): Record<BinaryBaselineKey, number | null> {
  return {
    global: relativeImprovement(metrics.global.brierScore, metrics.candidate.brierScore),
    participant: relativeImprovement(metrics.participant.brierScore, metrics.candidate.brierScore),
    recent: relativeImprovement(metrics.recent.brierScore, metrics.candidate.brierScore),
    time_context: relativeImprovement(metrics.time_context.brierScore, metrics.candidate.brierScore),
  }
}

function relativeImprovement(baseline: number | null, candidate: number | null): number | null {
  return baseline !== null && baseline > 0 && candidate !== null ? round(((baseline - candidate) / baseline) * 100, 1) : null
}

function bootstrapBrierImprovement(
  records: BinaryPredictionRecord[],
  baselineKey: BinaryBaselineKey | null,
): BootstrapResult {
  const base = {
    seed: FORECASTING_BOOTSTRAP_SEED,
    resampleCount: FORECASTING_BOOTSTRAP_RESAMPLE_COUNT,
    confidenceLevel: FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL,
  }
  if (!baselineKey || records.length === 0) {
    return {
      ...base,
      pointEstimate: null,
      lowerBound: null,
      upperBound: null,
      stronglyInferior: false,
      unavailableReason: "no evaluated predictions with an applicable baseline",
    }
  }
  const improvements = records.map((record) => {
    const actual = record.outcome ? 1 : 0
    const baselineError = (record.probabilities[baselineKey] - actual) ** 2
    const candidateError = (record.probabilities.candidate - actual) ** 2
    return baselineError - candidateError
  })
  const pointEstimate = average(improvements)
  const random = seededRandom(FORECASTING_BOOTSTRAP_SEED)
  const samples: number[] = []
  for (let index = 0; index < FORECASTING_BOOTSTRAP_RESAMPLE_COUNT; index += 1) {
    let total = 0
    for (let draw = 0; draw < improvements.length; draw += 1) {
      total += improvements[Math.floor(random() * improvements.length)]
    }
    samples.push(total / improvements.length)
  }
  samples.sort((left, right) => left - right)
  const tail = (1 - FORECASTING_BOOTSTRAP_CONFIDENCE_LEVEL) / 2
  const lowerBound = quantileSorted(samples, tail)
  const upperBound = quantileSorted(samples, 1 - tail)
  return {
    ...base,
    pointEstimate: round(pointEstimate, 4),
    lowerBound: round(lowerBound, 4),
    upperBound: round(upperBound, 4),
    stronglyInferior: upperBound < -FORECASTING_BOOTSTRAP_STRONGLY_INFERIOR_MARGIN,
    unavailableReason: null,
  }
}

function subgroupBrierChecks(
  records: BinaryPredictionRecord[],
  baselineKey: BinaryBaselineKey | null,
): SubgroupCheckResult[] {
  if (!baselineKey) {
    return [
      {
        subgroup: "all:no_applicable_baseline",
        sampleCount: records.length,
        candidateScore: null,
        bestBaselineScore: null,
        degradation: null,
        eligible: false,
        catastrophicFailure: false,
      },
    ]
  }
  const groups = new Map<string, BinaryPredictionRecord[]>()
  records.forEach((record, index) => {
    const date = new Date(record.predictionTime)
    const names = [
      `responder:${record.participantContext}`,
      `period:${index < records.length / 2 ? "early" : "late"}`,
      `day:${dayKind(record.predictionTime)}`,
      `time:${timeBucket(record.predictionTime)}`,
    ]
    if (Number.isNaN(date.getTime())) names.push("time:unknown")
    for (const name of names) {
      groups.set(name, [...(groups.get(name) ?? []), record])
    }
  })
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([subgroup, groupRecords]) => subgroupBrierCheck(subgroup, groupRecords, baselineKey))
}

function subgroupBrierCheck(
  subgroup: string,
  records: BinaryPredictionRecord[],
  baselineKey: BinaryBaselineKey,
): SubgroupCheckResult {
  if (records.length < FORECASTING_SUBGROUP_MIN_EVALUATED) {
    return {
      subgroup,
      sampleCount: records.length,
      candidateScore: null,
      bestBaselineScore: null,
      degradation: null,
      eligible: false,
      catastrophicFailure: false,
    }
  }
  const candidateScore = brierFromRecords(records, "candidate")
  const bestBaselineScore = brierFromRecords(records, baselineKey)
  const degradation = candidateScore - bestBaselineScore
  return {
    subgroup,
    sampleCount: records.length,
    candidateScore: round(candidateScore, 4),
    bestBaselineScore: round(bestBaselineScore, 4),
    degradation: round(degradation, 4),
    eligible: true,
    catastrophicFailure: degradation > FORECASTING_SUBGROUP_CATASTROPHIC_BRIER_DEGRADATION,
  }
}

function brierFromRecords(records: BinaryPredictionRecord[], key: BinaryEstimatorKey): number {
  return average(
    records.map((record) => {
      const actual = record.outcome ? 1 : 0
      return (record.probabilities[key] - actual) ** 2
    }),
  )
}

function emptyConfusionMatrix(labels: readonly string[]): Record<string, Record<string, number>> {
  return Object.fromEntries(labels.map((actual) => [actual, Object.fromEntries(labels.map((predicted) => [predicted, 0]))]))
}

function buildExternalValidationEvidence(
  options: ForecastingEvaluationOptions,
  opportunityCount: number,
): ExternalValidationEvidence {
  const datasetKind = options.datasetKind ?? "private_exports"
  return {
    datasetKind,
    conversationCount: 1,
    independentConversationCount: datasetKind === "research_dataset" ? 1 : 0,
    evaluatedOpportunityCount: opportunityCount,
    provenance: options.datasetIdentity ?? (datasetKind === "synthetic" ? "committed synthetic fixture" : "local export"),
    bootstrapCompleted: false,
    subgroupChecksCompleted: false,
    realWorldValidationEligible: false,
  }
}

export function assertNoForecastingLeakage(records: Array<{ predictionTime: string; featureTime: string }>): void {
  for (const record of records) {
    if (new Date(record.featureTime).getTime() > new Date(record.predictionTime).getTime()) {
      throw new Error(`Forecasting leakage detected: ${record.featureTime} is after ${record.predictionTime}`)
    }
  }
}

function smoothedBinaryRate(examples: BinaryExample[]): number {
  const positives = examples.filter((example) => example.outcome).length
  return (positives + FORECASTING_SMOOTHING_ALPHA) / (examples.length + FORECASTING_SMOOTHING_ALPHA + FORECASTING_SMOOTHING_BETA)
}

function smoothedBucketDistribution(examples: DelayExample[]): Record<string, number> {
  const labels = FORECASTING_DELAY_BUCKETS.map((bucket) => bucket.label)
  const denominator = examples.length + labels.length * FORECASTING_SMOOTHING_ALPHA
  return Object.fromEntries(
    labels.map((label) => [
      label,
      (examples.filter((example) => example.bucket === label).length + FORECASTING_SMOOTHING_ALPHA) / denominator,
    ]),
  )
}

function averageDistributions(distributions: Array<Record<string, number>>): Record<string, number> {
  const labels = FORECASTING_DELAY_BUCKETS.map((bucket) => bucket.label)
  const raw = Object.fromEntries(
    labels.map((label) => [label, average(distributions.map((distribution) => distribution[label] ?? 0))]),
  )
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0)
  return Object.fromEntries(labels.map((label) => [label, total === 0 ? 1 / labels.length : raw[label] / total]))
}

function bucketForDelay(delayMinutes: number): DelayBucketLabel {
  const buckets: ReadonlyArray<{
    label: DelayBucketLabel
    minMinutes: number
    maxMinutes: number | null
    maxInclusive: boolean
  }> = FORECASTING_DELAY_BUCKETS
  const match = buckets.find((bucket) => {
    if (delayMinutes < bucket.minMinutes) return false
    if (bucket.maxMinutes === null) return true
    return bucket.maxInclusive ? delayMinutes <= bucket.maxMinutes : delayMinutes < Number(bucket.maxMinutes)
  })
  return match?.label ?? "over_24h"
}

function classSupport(labels: DelayBucketLabel[]): Record<string, number> {
  return Object.fromEntries(
    FORECASTING_DELAY_BUCKETS.map((bucket) => [bucket.label, labels.filter((label) => label === bucket.label).length]),
  )
}

function maxProbabilityLabel(distribution: Record<string, number>): DelayBucketLabel {
  return FORECASTING_DELAY_BUCKETS.map((bucket) => bucket.label).reduce((best, label) =>
    (distribution[label] ?? 0) > (distribution[best] ?? 0) ? label : best,
  )
}

function participantKey(opportunity: ReplyOpportunity): string {
  return opportunity.expectedResponder ?? opportunity.observedResponder ?? opportunity.sourceSender
}

function participantMinimumEvaluationCount(predictions: BinaryPrediction[]): number {
  if (predictions.length === 0) return 0
  const counts = new Map<string, number>()
  for (const prediction of predictions) {
    counts.set(prediction.participantContext, (counts.get(prediction.participantContext) ?? 0) + 1)
  }
  return Math.min(...counts.values())
}

function timeBucket(value: string): string {
  const hour = new Date(value).getHours()
  if (hour < 6) return "night"
  if (hour < 12) return "morning"
  if (hour < 18) return "afternoon"
  return "evening"
}

function dayKind(value: string): "weekday" | "weekend" {
  const day = new Date(value).getDay()
  return day === 0 || day === 6 ? "weekend" : "weekday"
}

function exponentiallyWeightedMean(values: number[]): number {
  if (values.length === 0) return 0
  const alpha = 0.5
  return values.slice(1).reduce((estimate, value) => alpha * value + (1 - alpha) * estimate, values[0])
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function quantileSorted(values: number[], quantile: number): number {
  if (values.length === 0) return 0
  const position = Math.min(values.length - 1, Math.max(0, quantile * (values.length - 1)))
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return values[lower]
  const weight = position - lower
  return values[lower] * (1 - weight) + values[upper] * weight
}

function uniqueSenders(messages: ChatMessage[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const message of messages) {
    if (!seen.has(message.sender)) {
      seen.add(message.sender)
      result.push(message.sender)
    }
  }
  return result
}

function diffMinutes(startIso: string, endIso: string): number {
  return Math.max(0, (new Date(endIso).getTime() - new Date(startIso).getTime()) / MINUTE_MS)
}

function clampProbability(value: number): number {
  return Math.min(1 - FORECASTING_PROBABILITY_CLIP, Math.max(FORECASTING_PROBABILITY_CLIP, value))
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
