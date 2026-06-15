import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

import {
  DATE_ORDER_DEFAULT,
  LATE_REPLY_MIN_EXCLUSIVE_MIN,
  QUICK_REPLY_MAX_MIN,
  SILENCE_ANOMALY_FLOOR_MIN,
  SILENCE_ANOMALY_K,
  SILENCE_ANOMALY_SCALE,
  THREAD_GAP_MIN,
  TWO_DIGIT_YEAR_PIVOT,
  WITHIN_ONE_DAY_MAX_MIN,
  WITHIN_ONE_HOUR_MAX_MIN,
  WITHIN_SIX_HOURS_MAX_MIN,
} from "@chatsense/core/contract"
import { normalizedParityFromText } from "@chatsense/core/parity"

const root = process.cwd()
const contractPath = path.join(root, "contracts", "behavioral_contract.json")
const fixturesDir = path.join(root, "fixtures", "whatsapp")
const expectedDir = path.join(root, "fixtures", "expected")

const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"))
const thresholds = contract.thresholds_minutes

assert.equal(QUICK_REPLY_MAX_MIN, thresholds.quick_reply_max)
assert.equal(WITHIN_ONE_HOUR_MAX_MIN, thresholds.within_one_hour_max)
assert.equal(WITHIN_SIX_HOURS_MAX_MIN, thresholds.within_six_hours_max)
assert.equal(WITHIN_ONE_DAY_MAX_MIN, thresholds.within_one_day_max)
assert.equal(LATE_REPLY_MIN_EXCLUSIVE_MIN, thresholds.late_reply_min_exclusive)
assert.equal(THREAD_GAP_MIN, thresholds.thread_gap_min)
assert.equal(SILENCE_ANOMALY_SCALE, contract.silence_anomaly.scale)
assert.equal(SILENCE_ANOMALY_K, contract.silence_anomaly.k)
assert.equal(SILENCE_ANOMALY_FLOOR_MIN, thresholds.thread_gap_min)
assert.equal(DATE_ORDER_DEFAULT, contract.date_order_policy.default)
assert.equal(TWO_DIGIT_YEAR_PIVOT, contract.date_order_policy.two_digit_year_pivot)

const fixtureNames = fs
  .readdirSync(fixturesDir)
  .filter((name) => name.endsWith(".txt"))
  .sort()

assert.equal(fixtureNames.length, 9, "expected exactly nine parity fixtures")

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
