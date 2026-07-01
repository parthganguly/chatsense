import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { FORECASTING_CONTRACT_VERSION } from "@chatsense/core/forecasting-contract"
import { normalizedForecastingParityFromText } from "@chatsense/core/forecasting-parity"

const root = process.cwd()
const fixtureDir = path.join(root, "fixtures", "forecasting")
const manifest = JSON.parse(readFileSync(path.join(fixtureDir, "manifest.json"), "utf8"))
const artifactDir = path.join(root, "artifacts", "forecasting")

mkdirSync(artifactDir, { recursive: true })

const report = buildReport("typescript")
const parityReport = { ...report, source: "parity" as const }
writeFileSync(path.join(artifactDir, "typescript_report.json"), JSON.stringify(report, null, 2), "utf8")
writeFileSync(path.join(artifactDir, "parity_report.json"), JSON.stringify(parityReport, null, 2), "utf8")
writeFileSync(path.join(artifactDir, "report.md"), markdown(report), "utf8")

console.log(`Wrote TypeScript forecasting evaluation for ${report.fixture_count} fixtures to ${artifactDir}`)

function buildReport(source: "typescript" | "python" | "parity") {
  const fixtureNames = readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".txt"))
    .sort()
  return {
    schema_version: "1.0",
    contract_version: FORECASTING_CONTRACT_VERSION,
    source,
    dataset_identity: "committed_stage5_synthetic_fixtures",
    fixture_count: fixtureNames.length,
    fixtures: fixtureNames.map((fixture) => {
      const normalized = normalizedForecastingParityFromText(readFileSync(path.join(fixtureDir, fixture), "utf8"), fixture) as any
      return summarizeFixture(fixture, normalized)
    }),
  }
}

function summarizeFixture(fixture: string, normalized: any) {
  return {
    fixture,
    cases: caseIdsForFixture(fixture),
    status: normalized.status,
    summary: normalized.summary,
    opportunities: normalized.opportunities,
    validation_evidence: normalized.validation_evidence,
    tasks: {
      reply_within_horizon: Object.values(normalized.tasks.reply_within_horizon)
        .sort((left: any, right: any) => left.horizon_minutes - right.horizon_minutes)
        .map((task: any) => ({
          horizon_minutes: task.horizon_minutes,
          eligible_count: task.eligible_count,
          censored_count: task.censored_count,
          prediction_records: task.prediction_records,
          metrics: task.metrics,
          best_baseline_key: task.best_baseline_key,
          candidate_relative_brier_improvement_pct: task.candidate_relative_brier_improvement_pct,
          candidate_improvement_over_best_baseline_pct: task.candidate_improvement_over_best_baseline_pct,
          bootstrap: task.bootstrap,
          subgroup_checks: task.subgroup_checks,
          promotion: task.promotion,
        })),
      conditional_reply_delay_bucket: {
        observed_response_count: normalized.tasks.conditional_reply_delay_bucket.observed_response_count,
        evaluated_count: normalized.tasks.conditional_reply_delay_bucket.evaluated_count,
        class_support: normalized.tasks.conditional_reply_delay_bucket.class_support,
        best_baseline_key: normalized.tasks.conditional_reply_delay_bucket.best_baseline_key,
        insufficient_support: normalized.tasks.conditional_reply_delay_bucket.insufficient_support,
        prediction_records: normalized.tasks.conditional_reply_delay_bucket.prediction_records,
        metrics: normalized.tasks.conditional_reply_delay_bucket.baselines,
        promotion: normalized.tasks.conditional_reply_delay_bucket.promotion,
      },
      next_window_activity: {
        completed_window_count: normalized.tasks.next_window_activity.completed_window_count,
        evaluated_count: normalized.tasks.next_window_activity.evaluated_count,
        best_baseline_key: normalized.tasks.next_window_activity.best_baseline_key,
        candidate_improvement_over_best_baseline_pct:
          normalized.tasks.next_window_activity.candidate_improvement_over_best_baseline_pct,
        prediction_records: normalized.tasks.next_window_activity.prediction_records,
        metrics: normalized.tasks.next_window_activity.baselines,
        promotion: normalized.tasks.next_window_activity.promotion,
      },
    },
  }
}

function caseIdsForFixture(fixture: string): string[] {
  return Object.entries(manifest.cases)
    .filter(([, entry]: [string, any]) => entry.fixture === fixture)
    .map(([caseId]) => caseId)
    .sort()
}

function markdown(report: ReturnType<typeof buildReport>): string {
  const lines = [
    "# ChatSense Stage 5 Forecasting Evaluation",
    "",
    "Synthetic fixtures validate implementation mechanics and gate behavior. They do not establish real-world predictive validity.",
    "",
    "| Fixture | Cases | Opps | Observed | 1h eval | 1h candidate Brier | 1h calibration | 1h bootstrap CI | Method gate | Product |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |",
  ]
  for (const fixture of report.fixtures) {
    const oneHour = fixture.tasks.reply_within_horizon.find((task: any) => task.horizon_minutes === 60)!
    const candidate = oneHour.metrics.candidate
    lines.push(
      `| ${fixture.fixture} | ${fixture.cases.length} | ${fixture.summary.reply_opportunity_count} | ${fixture.summary.observed_reply_count} | ${oneHour.metrics.candidate.evaluated_count} | ${formatMetric(candidate.brier_score)} | ${formatMetric(candidate.calibration_error)} | ${formatBootstrap(oneHour.bootstrap)} | ${oneHour.promotion.state} | ${oneHour.promotion.promoted ? "promoted" : "blocked"} |`,
    )
  }
  lines.push("")
  lines.push("## Gate Summary")
  lines.push("")
  for (const fixture of report.fixtures) {
    const passed = fixture.tasks.reply_within_horizon.filter((task: any) => task.promotion.method_gate_passed).length
    const product = fixture.tasks.reply_within_horizon.some((task: any) => task.promotion.promoted)
    lines.push(
      `- ${fixture.fixture}: ${passed}/3 reply-horizon method gates passed; product forecasting ${product ? "promoted" : "blocked"}.`,
    )
  }
  lines.push("")
  lines.push("No live predictions, sentiment analysis, LLM coaching, or motive inference are enabled by this report.")
  lines.push("")
  return lines.join("\n")
}

function formatMetric(value: number | null): string {
  return value === null ? "n/a" : String(value)
}

function formatBootstrap(bootstrap: any): string {
  if (bootstrap.unavailable_reason) return "n/a"
  return `[${bootstrap.lower_bound}, ${bootstrap.upper_bound}]`
}
