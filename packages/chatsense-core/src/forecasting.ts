import type { ChatMessage } from "./chat-parser"
import {
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

export interface ReplyOpportunity {
  id: string
  sourceTurnId: number
  sourceSender: string
  expectedResponder: string | null
  observedResponder: string | null
  predictionTime: string
  observedResponseTime: string | null
  delayMinutes: number | null
  censorTime: string
  openAtExportEnd: boolean
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
  accuracy: number | null
}

export interface BinaryForecastResult {
  horizonMinutes: number
  eligibleCount: number
  censoredCount: number
  metrics: Record<"global" | "participant" | "recent" | "candidate", BinaryForecastMetrics>
  candidateImprovementOverBestBaselinePct: number | null
  promotion: ForecastingPromotionDecision
}

export interface DelayBucketTaskResult {
  observedResponseCount: number
  evaluatedCount: number
  classSupport: Record<string, number>
  baselines: Record<"global" | "participant" | "recent" | "candidate", MulticlassForecastMetrics>
  promotion: ForecastingPromotionDecision
}

export interface MulticlassForecastMetrics {
  accuracy: number | null
  macroF1: number | null
  logLoss: number | null
}

export interface ActivityTaskResult {
  completedWindowCount: number
  evaluatedCount: number
  baselines: Record<"previous" | "historical_mean" | "rolling_mean" | "candidate", RegressionForecastMetrics>
  candidateImprovementOverBestBaselinePct: number | null
  promotion: ForecastingPromotionDecision
}

export interface RegressionForecastMetrics {
  mae: number | null
  medianAbsoluteError: number | null
  rmse: number | null
}

export interface ForecastingPromotionDecision {
  promoted: boolean
  state: ForecastingGateState
  methodGatePassed: boolean
  reasons: string[]
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

export function evaluateForecastingResearch(messages: ChatMessage[]): ForecastingResearchReport {
  const sorted = [...messages]
    .filter((message) => !Number.isNaN(message.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
  const dynamics = analyzeRelationshipDynamics(sorted)
  const participants = uniqueSenders(sorted)
  const opportunities = buildReplyOpportunities(dynamics.turns, participants)
  const completedWindows = dynamics.adaptiveWindows.filter((bucket) => bucket.eligible && !bucket.partial)
  const replyWithinHorizon = Object.fromEntries(
    REPLY_HORIZONS_MINUTES.map((horizon) => [String(horizon), evaluateReplyWithinHorizon(opportunities, horizon)]),
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
    const response = turns.slice(index + 1).find((candidate) => candidate.sender !== source.sender)
    const expectedResponder =
      participants.length === 2 ? participants.find((sender) => sender !== source.sender) ?? null : null
    const predictionTime = source.end
    opportunities.push({
      id: `turn-${source.id}`,
      sourceTurnId: source.id,
      sourceSender: source.sender,
      expectedResponder,
      observedResponder: response?.sender ?? null,
      predictionTime,
      observedResponseTime: response?.start ?? null,
      delayMinutes: response ? round(diffMinutes(predictionTime, response.start), 3) : null,
      censorTime: response?.start ?? exportEnd,
      openAtExportEnd: !response,
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
    return {
      eligible: false,
      censored: true,
      outcome: null,
      reason: "export ended before the full horizon elapsed",
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
): BinaryForecastResult {
  const prior: BinaryExample[] = []
  const predictions: Record<"global" | "participant" | "recent" | "candidate", BinaryPrediction[]> = {
    global: [],
    participant: [],
    recent: [],
    candidate: [],
  }
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
    }

    prior.push({ opportunity, outcome: outcome.outcome })
  }

  const metrics = {
    global: binaryMetrics(predictions.global),
    participant: binaryMetrics(predictions.participant),
    recent: binaryMetrics(predictions.recent),
    candidate: binaryMetrics(predictions.candidate),
  }
  const bestBaselineBrier = minDefined([
    metrics.global.brierScore,
    metrics.participant.brierScore,
    metrics.recent.brierScore,
  ])
  const candidateImprovementOverBestBaselinePct =
    bestBaselineBrier !== null && bestBaselineBrier > 0 && metrics.candidate.brierScore !== null
      ? round(((bestBaselineBrier - metrics.candidate.brierScore) / bestBaselineBrier) * 100, 1)
      : null

  return {
    horizonMinutes,
    eligibleCount,
    censoredCount,
    metrics,
    candidateImprovementOverBestBaselinePct,
    promotion: assessReplyHorizonPromotion({
      evaluatedCount: metrics.candidate.evaluatedCount,
      positiveCount: metrics.candidate.positiveCount,
      negativeCount: metrics.candidate.negativeCount,
      candidateBrier: metrics.candidate.brierScore,
      bestBaselineBrier,
      calibrationError: metrics.candidate.calibrationError,
      participantMinimumEvaluatedCount: participantMinimumEvaluationCount(predictions.candidate),
      generalValidityEstablished: false,
    }),
  }
}

export function evaluateConditionalReplyDelayBucket(opportunities: ReplyOpportunity[]): DelayBucketTaskResult {
  const observed = opportunities.filter((opportunity) => opportunity.delayMinutes !== null)
  const prior: DelayExample[] = []
  const predictions: Record<"global" | "participant" | "recent" | "candidate", DelayPrediction[]> = {
    global: [],
    participant: [],
    recent: [],
    candidate: [],
  }

  for (const opportunity of observed) {
    const bucket = bucketForDelay(opportunity.delayMinutes!)
    if (prior.length >= FORECASTING_WARM_UP_REPLY_OPPORTUNITIES) {
      const distributions = delayDistributions(prior, opportunity)
      for (const key of Object.keys(predictions) as Array<keyof typeof predictions>) {
        predictions[key].push({ bucket, distribution: distributions[key] })
      }
    }
    prior.push({ opportunity, bucket })
  }

  const baselines = {
    global: multiclassMetrics(predictions.global),
    participant: multiclassMetrics(predictions.participant),
    recent: multiclassMetrics(predictions.recent),
    candidate: multiclassMetrics(predictions.candidate),
  }
  const support = classSupport(observed.map((opportunity) => bucketForDelay(opportunity.delayMinutes!)))
  const candidateBeatsLogLoss =
    baselines.candidate.logLoss !== null &&
    [baselines.global.logLoss, baselines.participant.logLoss, baselines.recent.logLoss]
      .filter((value): value is number => value !== null)
      .every((value) => baselines.candidate.logLoss! < value)
  const candidateBeatsMacroF1 =
    baselines.candidate.macroF1 !== null &&
    [baselines.global.macroF1, baselines.participant.macroF1, baselines.recent.macroF1]
      .filter((value): value is number => value !== null)
      .every((value) => baselines.candidate.macroF1! > value)
  const meaningfulClassSupport = Object.values(support).filter((count) => count >= 3).length >= 2

  return {
    observedResponseCount: observed.length,
    evaluatedCount: predictions.candidate.length,
    classSupport: support,
    baselines,
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
  const predictions: Record<"previous" | "historical_mean" | "rolling_mean" | "candidate", ActivityPrediction[]> = {
    previous: [],
    historical_mean: [],
    rolling_mean: [],
    candidate: [],
  }

  for (let index = FORECASTING_WARM_UP_WINDOWS; index < values.length; index += 1) {
    const prior = values.slice(0, index).map((item) => item.value)
    const actual = values[index].value
    const previous = prior.at(-1)!
    const historicalMean = average(prior)
    const rollingMean = average(prior.slice(-FORECASTING_WARM_UP_WINDOWS))
    const trend = prior.length >= 2 ? prior.at(-1)! - prior.at(-2)! : 0
    const candidate = Math.max(0, rollingMean + trend * 0.5)
    predictions.previous.push({ actual, predicted: previous })
    predictions.historical_mean.push({ actual, predicted: historicalMean })
    predictions.rolling_mean.push({ actual, predicted: rollingMean })
    predictions.candidate.push({ actual, predicted: candidate })
  }

  const baselines = {
    previous: regressionMetrics(predictions.previous),
    historical_mean: regressionMetrics(predictions.historical_mean),
    rolling_mean: regressionMetrics(predictions.rolling_mean),
    candidate: regressionMetrics(predictions.candidate),
  }
  const bestBaselineMae = minDefined([baselines.previous.mae, baselines.historical_mean.mae, baselines.rolling_mean.mae])
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
  generalValidityEstablished?: boolean
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

  const methodGatePassed = reasons.length === 0
  if (!input.generalValidityEstablished) {
    reasons.push(FORECASTING_SAFETY_WORDING.syntheticLimit)
  }

  return {
    promoted: methodGatePassed && Boolean(input.generalValidityEstablished),
    state: methodGatePassed ? "passed_method_gate" : "failed_gate",
    methodGatePassed,
    reasons,
  }
}

function binaryProbabilities(
  prior: BinaryExample[],
  opportunity: ReplyOpportunity,
): Record<"global" | "participant" | "recent" | "candidate", number> {
  const global = smoothedBinaryRate(prior)
  const participantExamples = prior.filter((example) => participantKey(example.opportunity) === participantKey(opportunity))
  const recentExamples = prior.slice(-FORECASTING_RECENT_WINDOW_SIZE)
  const contextExamples = prior.filter(
    (example) =>
      participantKey(example.opportunity) === participantKey(opportunity) &&
      timeBucket(example.opportunity.predictionTime) === timeBucket(opportunity.predictionTime),
  )
  const threadExamples = prior.filter((example) => example.opportunity.startsThread === opportunity.startsThread)
  const participant =
    participantExamples.length >= FORECASTING_MIN_PARTICIPANT_SAMPLES ? smoothedBinaryRate(participantExamples) : global
  const recent = recentExamples.length ? smoothedBinaryRate(recentExamples) : global
  const context = contextExamples.length >= FORECASTING_MIN_CONTEXT_SAMPLES ? smoothedBinaryRate(contextExamples) : participant
  const thread = threadExamples.length >= FORECASTING_MIN_CONTEXT_SAMPLES ? smoothedBinaryRate(threadExamples) : global
  const candidate = clampProbability((global + participant * 2 + recent + context * 2 + thread) / 7)
  return {
    global: clampProbability(global),
    participant: clampProbability(participant),
    recent: clampProbability(recent),
    candidate,
  }
}

function delayDistributions(
  prior: DelayExample[],
  opportunity: ReplyOpportunity,
): Record<"global" | "participant" | "recent" | "candidate", Record<string, number>> {
  const global = smoothedBucketDistribution(prior)
  const participantExamples = prior.filter((example) => participantKey(example.opportunity) === participantKey(opportunity))
  const recentExamples = prior.slice(-FORECASTING_RECENT_WINDOW_SIZE)
  const contextExamples = prior.filter(
    (example) =>
      participantKey(example.opportunity) === participantKey(opportunity) &&
      timeBucket(example.opportunity.predictionTime) === timeBucket(opportunity.predictionTime),
  )
  const participant =
    participantExamples.length >= FORECASTING_MIN_PARTICIPANT_SAMPLES ? smoothedBucketDistribution(participantExamples) : global
  const recent = recentExamples.length ? smoothedBucketDistribution(recentExamples) : global
  const context = contextExamples.length >= FORECASTING_MIN_CONTEXT_SAMPLES ? smoothedBucketDistribution(contextExamples) : participant
  return {
    global,
    participant,
    recent,
    candidate: averageDistributions([global, participant, participant, recent, context, context]),
  }
}

function binaryMetrics(predictions: BinaryPrediction[]): BinaryForecastMetrics {
  if (predictions.length === 0) {
    return {
      evaluatedCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      brierScore: null,
      logLoss: null,
      calibrationError: null,
      accuracy: null,
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
  return {
    evaluatedCount: predictions.length,
    positiveCount,
    negativeCount: predictions.length - positiveCount,
    brierScore: round(brierScore, 4),
    logLoss: round(logLoss, 4),
    calibrationError: round(calibrationError(predictions), 4),
    accuracy: round(accuracy, 4),
  }
}

function multiclassMetrics(predictions: DelayPrediction[]): MulticlassForecastMetrics {
  if (predictions.length === 0) return { accuracy: null, macroF1: null, logLoss: null }
  const labels = FORECASTING_DELAY_BUCKETS.map((bucket) => bucket.label)
  const predictedLabels = predictions.map((prediction) => maxProbabilityLabel(prediction.distribution))
  const accuracy = average(predictions.map((prediction, index) => (predictedLabels[index] === prediction.bucket ? 1 : 0)))
  const f1Scores = labels.map((label) => {
    const truePositive = predictions.filter((prediction, index) => prediction.bucket === label && predictedLabels[index] === label).length
    const falsePositive = predictions.filter((prediction, index) => prediction.bucket !== label && predictedLabels[index] === label).length
    const falseNegative = predictions.filter((prediction, index) => prediction.bucket === label && predictedLabels[index] !== label).length
    if (truePositive + falsePositive + falseNegative === 0) return 0
    const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive)
    const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative)
    return precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  })
  const logLoss = average(
    predictions.map((prediction) => -Math.log(clampProbability(prediction.distribution[prediction.bucket] ?? 0))),
  )
  return {
    accuracy: round(accuracy, 4),
    macroF1: round(average(f1Scores), 4),
    logLoss: round(logLoss, 4),
  }
}

function regressionMetrics(predictions: ActivityPrediction[]): RegressionForecastMetrics {
  if (predictions.length === 0) return { mae: null, medianAbsoluteError: null, rmse: null }
  const errors = predictions.map((prediction) => Math.abs(prediction.predicted - prediction.actual))
  const squared = predictions.map((prediction) => (prediction.predicted - prediction.actual) ** 2)
  return {
    mae: round(average(errors), 4),
    medianAbsoluteError: round(median(errors), 4),
    rmse: round(Math.sqrt(average(squared)), 4),
  }
}

function calibrationError(predictions: BinaryPrediction[]): number {
  const binCount = FORECASTING_CALIBRATION_BINS
  const bins = Array.from({ length: binCount }, () => [] as BinaryPrediction[])
  for (const prediction of predictions) {
    const index = Math.min(binCount - 1, Math.floor(clampProbability(prediction.probability) * binCount))
    bins[index].push(prediction)
  }
  return bins.reduce((total, bin) => {
    if (bin.length === 0) return total
    const predicted = average(bin.map((prediction) => prediction.probability))
    const observed = average(bin.map((prediction) => (prediction.outcome ? 1 : 0)))
    return total + (bin.length / predictions.length) * Math.abs(predicted - observed)
  }, 0)
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

function minDefined(values: Array<number | null>): number | null {
  const defined = values.filter((value): value is number => value !== null)
  return defined.length ? Math.min(...defined) : null
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
