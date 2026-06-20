import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { evaluateForecastingResearch, parseWhatsAppChat } from "@chatsense/core"

const root = process.cwd()
const fixtureDirs = [path.join(root, "fixtures", "whatsapp"), path.join(root, "fixtures", "forecasting")]
const artifactDir = path.join(root, "artifacts", "forecasting")

mkdirSync(artifactDir, { recursive: true })

const fixtures = fixtureDirs
  .flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(".txt"))
      .map((name) => ({ dir, name })),
  )
  .sort((left, right) => left.name.localeCompare(right.name))
  .map(({ dir, name }) => {
    const text = readFileSync(path.join(dir, name), "utf8")
    return {
      fixture: name,
      report: evaluateForecastingResearch(parseWhatsAppChat(text)),
    }
  })

const summary = {
  source: "typescript",
  fixtureCount: fixtures.length,
  fixtures,
}

writeFileSync(path.join(artifactDir, "typescript_report.json"), JSON.stringify(summary, null, 2), "utf8")
writeFileSync(path.join(artifactDir, "typescript_report.md"), markdown(summary), "utf8")

console.log(`Wrote TypeScript forecasting evaluation for ${fixtures.length} fixtures to ${artifactDir}`)

function markdown(report: typeof summary): string {
  const rows = report.fixtures.map((item) => {
    const summary = item.report.summary
    return `| ${item.fixture} | ${item.report.status} | ${summary.replyOpportunityCount} | ${summary.observedReplyCount} | ${summary.completedActivityWindowCount} |`
  })
  return [
    "# TypeScript Forecasting Evaluation",
    "",
    "Research-only chronological backtests over committed synthetic fixtures.",
    "",
    "| Fixture | Status | Reply opportunities | Observed replies | Completed windows |",
    "| --- | --- | ---: | ---: | ---: |",
    ...rows,
    "",
    "Synthetic fixtures validate method mechanics, not real-world predictive validity.",
    "",
  ].join("\n")
}
