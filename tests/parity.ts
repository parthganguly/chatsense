import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  DATE_ORDER_DEFAULT,
  EARLY_LATE_MIN_ELIGIBLE_WINDOWS,
  EARLY_LATE_WINDOW_COUNT,
  FOLLOW_UP_MIN,
  LATE_REPLY_MIN_EXCLUSIVE_MIN,
  MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
  MIN_RECONNECTIONS_PER_PERIOD,
  MIN_REPLY_LATENCY_PER_PARTICIPANT,
  MIN_THREAD_STARTS_PER_PERIOD,
  MIN_WINDOW_ACTIVE_DAYS,
  MIN_WINDOW_MESSAGES,
  NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT,
  NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT,
  NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS,
  NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS,
  NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS,
  NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT,
  NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS,
  NARRATIVE_MAX_PRIMARY_FINDINGS,
  NARRATIVE_REQUIRED_GUARDRAIL,
  NARRATIVE_TAKEAWAY_CONFIDENCE_LABELS,
  NARRATIVE_TAKEAWAY_SAFETY_LINE,
  NARRATIVE_TAKEAWAY_STRONG_EVIDENCE_MULTIPLIER,
  NOTABLE_FOLLOW_UP_RATE_ABS_PCT,
  NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
  NOTABLE_RECONNECTION_SHARE_ABS_PCT,
  NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN,
  NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER,
  NOTABLE_THREAD_START_SHARE_ABS_PCT,
  NOTABLE_TURN_SHARE_ABS_PCT,
  QUICK_REPLY_MAX_MIN,
  READ_ESTRANGEMENT_DOMINANCE_MIN_SHARE_PCT,
  READ_ESTRANGEMENT_PAUSE_MIN_DAYS,
  READ_MIN_AGREEING_CONSTRUCTS,
  READ_MIN_COMPARABLE_PAUSES_TO_RANK,
  READ_NEXT_PATTERN_MIN_COMPLETED_PAUSES,
  READ_STRONG_COMPARABLE_PAUSES,
  READ_UNUSUAL_RANK_MIN_SHARE_PCT,
  READ_USEFUL_COMPARABLE_PAUSES,
  RECONNECTION_GAP_MIN,
  RECENT_PRIOR_WINDOW_COUNT,
  SILENCE_ANOMALY_FLOOR_MIN,
  SILENCE_ANOMALY_K,
  SILENCE_ANOMALY_SCALE,
  THREAD_GAP_MIN,
  TWO_DIGIT_YEAR_PIVOT,
  WITHIN_ONE_DAY_MAX_MIN,
  WITHIN_ONE_HOUR_MAX_MIN,
  WITHIN_SIX_HOURS_MAX_MIN,
} from "@chatsense/core/contract"
import {
  FORECASTING_CONTRACT_VERSION,
  FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
  FORECASTING_WARM_UP_REPLY_OPPORTUNITIES,
  REPLY_HORIZONS_MINUTES,
} from "@chatsense/core/forecasting-contract"
import { normalizedParityFromText } from "@chatsense/core/parity"

const root = process.cwd()
const contractPath = path.join(root, "contracts", "behavioral_contract.json")
const forecastingContractPath = path.join(root, "contracts", "forecasting_contract.json")
const fixturesDir = path.join(root, "fixtures", "whatsapp")
const expectedDir = path.join(root, "fixtures", "expected")

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"))
const forecastingContract = JSON.parse(fs.readFileSync(forecastingContractPath, "utf8"))
const thresholds = contract.thresholds_minutes
const dynamics = contract.relationship_dynamics
const narrative = contract.insight_narrative

assert.equal(QUICK_REPLY_MAX_MIN, thresholds.quick_reply_max)
assert.equal(WITHIN_ONE_HOUR_MAX_MIN, thresholds.within_one_hour_max)
assert.equal(WITHIN_SIX_HOURS_MAX_MIN, thresholds.within_six_hours_max)
assert.equal(WITHIN_ONE_DAY_MAX_MIN, thresholds.within_one_day_max)
assert.equal(LATE_REPLY_MIN_EXCLUSIVE_MIN, thresholds.late_reply_min_exclusive)
assert.equal(THREAD_GAP_MIN, thresholds.thread_gap_min)
assert.equal(RECONNECTION_GAP_MIN, thresholds.reconnection_gap_min)
assert.equal(FOLLOW_UP_MIN, thresholds.follow_up_min)
assert.equal(SILENCE_ANOMALY_SCALE, contract.silence_anomaly.scale)
assert.equal(SILENCE_ANOMALY_K, contract.silence_anomaly.k)
assert.equal(SILENCE_ANOMALY_FLOOR_MIN, thresholds.thread_gap_min)
assert.equal(DATE_ORDER_DEFAULT, contract.date_order_policy.default)
assert.equal(TWO_DIGIT_YEAR_PIVOT, contract.date_order_policy.two_digit_year_pivot)
assert.equal(MIN_WINDOW_MESSAGES, dynamics.window_eligibility.min_messages)
assert.equal(MIN_WINDOW_ACTIVE_DAYS, dynamics.window_eligibility.min_active_days)
assert.equal(EARLY_LATE_MIN_ELIGIBLE_WINDOWS, dynamics.comparison_periods.early_late_min_eligible_windows)
assert.equal(EARLY_LATE_WINDOW_COUNT, dynamics.comparison_periods.early_late_window_count)
assert.equal(RECENT_PRIOR_WINDOW_COUNT, dynamics.comparison_periods.recent_prior_window_count)
assert.equal(MIN_REPLY_LATENCY_PER_PARTICIPANT, dynamics.sample_minimums.reply_latency_per_participant)
assert.equal(MIN_THREAD_STARTS_PER_PERIOD, dynamics.sample_minimums.thread_starts_per_period)
assert.equal(MIN_RECONNECTIONS_PER_PERIOD, dynamics.sample_minimums.reconnections_per_period)
assert.equal(
  MIN_FOLLOW_UP_RELEVANT_TURNS_PER_PARTICIPANT,
  dynamics.sample_minimums.follow_up_relevant_turns_per_participant,
)
assert.equal(
  NOTABLE_MESSAGES_PER_ACTIVE_DAY_RELATIVE_PCT,
  dynamics.notable_change_thresholds.messages_per_active_day_relative_pct,
)
assert.equal(NOTABLE_TURN_SHARE_ABS_PCT, dynamics.notable_change_thresholds.turn_share_abs_pct)
assert.equal(
  NOTABLE_REPLY_LATENCY_RELATIVE_MULTIPLIER,
  dynamics.notable_change_thresholds.reply_latency_relative_multiplier,
)
assert.equal(NOTABLE_REPLY_LATENCY_ABSOLUTE_MIN, dynamics.notable_change_thresholds.reply_latency_absolute_min)
assert.equal(NOTABLE_THREAD_START_SHARE_ABS_PCT, dynamics.notable_change_thresholds.thread_start_share_abs_pct)
assert.equal(NOTABLE_RECONNECTION_SHARE_ABS_PCT, dynamics.notable_change_thresholds.reconnection_share_abs_pct)
assert.equal(NOTABLE_FOLLOW_UP_RATE_ABS_PCT, dynamics.notable_change_thresholds.follow_up_rate_abs_pct)
assert.equal(NARRATIVE_MAX_PRIMARY_FINDINGS, narrative.max_primary_findings)
assert.equal(NARRATIVE_MAX_NOTABLE_CHANGE_FINDINGS, narrative.max_notable_change_findings)
assert.equal(
  NARRATIVE_BALANCED_MAX_TOP_SHARE_PCT,
  narrative.maintenance_thresholds.balanced_max_top_share_pct,
)
assert.equal(
  NARRATIVE_MAINTENANCE_UNEVEN_SHARE_MIN_PCT,
  narrative.maintenance_thresholds.uneven_share_min_pct,
)
assert.equal(NARRATIVE_HIGH_FOLLOW_UP_RATE_PCT, narrative.maintenance_thresholds.high_follow_up_rate_pct)
assert.equal(NARRATIVE_MAINTENANCE_MIN_THREAD_STARTS, narrative.maintenance_thresholds.min_thread_starts)
assert.equal(NARRATIVE_MAINTENANCE_MIN_RECONNECTIONS, narrative.maintenance_thresholds.min_reconnections)
assert.equal(
  NARRATIVE_MAINTENANCE_MIN_FOLLOW_UP_RELEVANT_TURNS,
  narrative.maintenance_thresholds.min_follow_up_relevant_turns,
)
assert.equal(NARRATIVE_REQUIRED_GUARDRAIL, narrative.required_guardrail)
assert.equal(NARRATIVE_TAKEAWAY_STRONG_EVIDENCE_MULTIPLIER, narrative.takeaway.strong_evidence_multiplier)
assert.deepEqual({ ...NARRATIVE_TAKEAWAY_CONFIDENCE_LABELS }, narrative.takeaway.confidence_labels)
assert.equal(NARRATIVE_TAKEAWAY_SAFETY_LINE, narrative.takeaway.safety_line)
const relationshipRead = contract.relationship_read
assert.equal(READ_MIN_COMPARABLE_PAUSES_TO_RANK, relationshipRead.silence.min_comparable_pauses_to_rank)
assert.equal(READ_USEFUL_COMPARABLE_PAUSES, relationshipRead.silence.useful_comparable_pauses)
assert.equal(READ_STRONG_COMPARABLE_PAUSES, relationshipRead.silence.strong_comparable_pauses)
assert.equal(READ_UNUSUAL_RANK_MIN_SHARE_PCT, relationshipRead.silence.unusual_rank_min_share_pct)
assert.equal(READ_NEXT_PATTERN_MIN_COMPLETED_PAUSES, relationshipRead.silence.next_pattern_min_completed_pauses)
assert.equal(READ_ESTRANGEMENT_PAUSE_MIN_DAYS, relationshipRead.silence.estrangement_pause_min_days)
assert.equal(
  READ_ESTRANGEMENT_DOMINANCE_MIN_SHARE_PCT,
  relationshipRead.silence.estrangement_dominance_min_share_pct,
)
assert.equal(READ_MIN_AGREEING_CONSTRUCTS, relationshipRead.carried_contact.min_agreeing_constructs)
assert.equal(FORECASTING_CONTRACT_VERSION, forecastingContract.contract_version)
assert.deepEqual(REPLY_HORIZONS_MINUTES, forecastingContract.tasks.reply_within_horizon.horizons_minutes)
assert.equal(
  FORECASTING_WARM_UP_REPLY_OPPORTUNITIES,
  forecastingContract.evaluation.warm_up_reply_opportunities,
)
assert.equal(
  FORECASTING_PROMOTION_REPLY_MIN_EVALUATED_OVERALL,
  forecastingContract.promotion_gates.reply_horizon.min_evaluated_overall,
)

const fixtureNames = fs
  .readdirSync(fixturesDir)
  .filter((name) => name.endsWith(".txt"))
  .sort()

assert.ok(fixtureNames.length >= 21, "expected the original nine fixtures plus the Stage 4 fixture matrix")

for (const fixtureName of fixtureNames) {
  const stem = path.basename(fixtureName, ".txt")
  const text = fs.readFileSync(path.join(fixturesDir, fixtureName), "utf8")
  const expected = JSON.parse(fs.readFileSync(path.join(expectedDir, `${stem}.json`), "utf8"))
  const actual = normalizedParityFromText(text)

  try {
    assert.deepStrictEqual(actual, expected)
  } catch (error) {
    console.error(`Parity mismatch for ${fixtureName}`)
    console.error(JSON.stringify({ expected, actual }, null, 2))
    throw error
  }
}

console.log(`TypeScript parity passed for ${fixtureNames.length} fixtures.`)
