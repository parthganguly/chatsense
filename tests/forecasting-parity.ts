import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { normalizedForecastingParityFromText } from "@chatsense/core/forecasting-parity"

const root = process.cwd()
const forecastingDir = path.join(root, "fixtures", "forecasting")
const fixtureNames = fs
  .readdirSync(forecastingDir)
  .filter((name) => name.endsWith(".txt"))
  .sort()

const results = fixtureNames.map((fixtureName) => {
  const fixturePath = path.join(forecastingDir, fixtureName)
  const text = fs.readFileSync(fixturePath, "utf8")
  const typescript = normalizedForecastingParityFromText(text, fixtureName)
  const python = JSON.parse(
    execFileSync("python", ["-m", "chatsense_ml.forecasting.parity", fixturePath], {
      cwd: root,
      env: {
        ...process.env,
        PYTHONPATH: [path.join(root, "python"), process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
      },
      encoding: "utf8",
    }),
  )

  try {
    assert.deepStrictEqual(typescript, python)
  } catch (error) {
    console.error(`Forecasting parity mismatch for ${fixtureName}`)
    console.error(JSON.stringify({ typescript, python }, null, 2))
    throw error
  }

  return {
    fixture: fixtureName,
    opportunities: (typescript.summary as { reply_opportunity_count: number }).reply_opportunity_count,
    observed: (typescript.summary as { observed_reply_count: number }).observed_reply_count,
  }
})

assert.ok(results.length >= 10, "expected dedicated Stage 5 forecasting fixtures")
console.log(`Forecasting parity passed for ${results.length} fixtures.`)
