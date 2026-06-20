import { CalendarDays, FlaskConical, GitCompare, MessageCircleReply, RotateCcw, Split, Timer } from "lucide-react"
import {
  formatDuration,
  type AdaptiveWindow,
  type ChatAnalysis,
  type DynamicsComparison,
  type MetricChange,
  type ParticipantDynamicsSummary,
} from "@chatsense/core"
import { DataRow } from "@/components/analytics/DataRow"
import { MetricCard } from "@/components/analytics/MetricCard"
import { ProgressRow } from "@/components/analytics/ProgressRow"
import { SectionHeading } from "@/components/analytics/SectionHeading"
import { formatChangeDirection, formatDate, formatNumber } from "@/utils/formatting"

export function ChangesScreen({ analysis }: { analysis: ChatAnalysis }) {
  const dynamics = analysis.relationshipDynamics
  const topParticipants = dynamics.participantSummaries.slice(0, 4)

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow="Relationship dynamics" title="Changes over time" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="Window size" value={`${dynamics.windowSizeDays}d`} icon={CalendarDays} />
          <MetricCard label="Turns" value={formatNumber(dynamics.turns.length)} icon={Split} />
          <MetricCard label="24h restarts" value={formatNumber(dynamics.pauseSummary.longPauseCount)} icon={RotateCcw} />
          <MetricCard label="Notable changes" value={formatNumber(dynamics.notableChanges.length)} icon={GitCompare} />
        </div>
      </section>

      <ComparisonSection comparison={dynamics.earlyLate} />
      <ComparisonSection comparison={dynamics.recentPrior} />
      <ForecastingResearchSection analysis={analysis} />

      <section>
        <SectionHeading eyebrow="Adaptive windows" title="Export timeline" />
        <div className="mt-4 space-y-3">
          {dynamics.adaptiveWindows.map((bucket) => (
            <div key={bucket.index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {formatDate(bucket.start)} to {formatDate(bucket.end)}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {bucket.partial ? "Partial final window" : "Complete calendar window"} |{" "}
                    {bucket.eligible ? "eligible" : "limited evidence"}
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-800">{formatNumber(bucket.messageCount)}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <WindowStat label="Active days" value={formatNumber(bucket.activeDays)} />
                <WindowStat label="Turns" value={formatNumber(bucket.turnCount)} />
                <WindowStat label="Restarts" value={formatNumber(bucket.reconnectionCount)} />
              </div>
              <WindowParticipantDetails bucket={bucket} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Participant movement" title="Who keeps contact moving" />
        <div className="mt-4 space-y-5">
          {topParticipants.map((participant) => (
            <div key={participant.sender} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{participant.sender}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(participant.turnCount)} turns | median reply{" "}
                    {formatDuration(participant.medianReplyMinutes)}
                  </p>
                </div>
                <MessageCircleReply className="h-4 w-4 shrink-0 text-emerald-700" />
              </div>
              <div className="mt-4 space-y-3">
                <ProgressRow label="Turn share" value={participant.turnShare} />
                <ProgressRow label="Thread-start share" value={participant.threadStartShare} />
                <ProgressRow label="Reconnection share" value={participant.reconnectionShare} />
                <ProgressRow
                  label="Follow-up turn rate"
                  value={participant.followUpRate ?? 0}
                  valueLabel={participant.followUpRate === null ? "Limited data" : `${participant.followUpRate}%`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
        <p>
          Changes describe exported timing and volume behavior only. They are not proof of motive or relationship status,
          affection, attachment, personality, mental health, or relationship quality.
        </p>
      </section>
    </div>
  )
}

function ForecastingResearchSection({ analysis }: { analysis: ChatAnalysis }) {
  const forecasting = analysis.forecastingResearch
  const oneHour = forecasting.tasks.replyWithinHorizon["60"]
  const delay = forecasting.tasks.conditionalReplyDelayBucket
  const activity = forecasting.tasks.nextWindowActivity

  return (
    <section>
      <SectionHeading eyebrow="Research gate" title="Forecasting validation" />
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Not validated for product use</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              ChatSense can backtest observable timing and volume signals, but this export does not enable a product
              forecast or any claim about intent.
            </p>
          </div>
          <FlaskConical className="h-4 w-4 shrink-0 text-emerald-700" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <WindowStat label="Reply opportunities" value={formatNumber(forecasting.summary.replyOpportunityCount)} />
          <WindowStat label="Observed replies" value={formatNumber(forecasting.summary.observedReplyCount)} />
          <WindowStat label="Activity windows" value={formatNumber(forecasting.summary.completedActivityWindowCount)} />
          <WindowStat label="Promotion" value={forecasting.summary.productPromotion ? "Passed" : "Blocked"} />
        </div>
        <div className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
          <p>
            1h reply gate: {gateLabel(oneHour?.promotion.methodGatePassed ?? false)}; evaluated{" "}
            {formatNumber(oneHour?.metrics.candidate.evaluatedCount ?? 0)} opportunities.
          </p>
          <p>
            Delay-bucket gate: {gateLabel(delay.promotion.methodGatePassed)}; evaluated{" "}
            {formatNumber(delay.evaluatedCount)} observed responses.
          </p>
          <p>
            Activity gate: {gateLabel(activity.promotion.methodGatePassed)}; evaluated{" "}
            {formatNumber(activity.evaluatedCount)} completed windows.
          </p>
        </div>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          {forecasting.safety.noMotive}
        </p>
      </div>
    </section>
  )
}

function ComparisonSection({ comparison }: { comparison: DynamicsComparison }) {
  const changes = sortChangesForDisplay(comparison.changes)
    .filter((change) => change.notable || change.evidenceState !== "sufficient")
    .slice(0, 8)
  return (
    <section>
      <SectionHeading
        eyebrow={comparison.available ? "Evidence-safe comparison" : "Limited evidence"}
        title={comparisonTitle(comparison)}
      />
      {!comparison.available ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
          {comparison.unavailableReason}
        </p>
      ) : (
        <>
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
            <DataRow
              label={comparison.earlierPeriod.label}
              value={`${formatDate(comparison.earlierPeriod.start ?? "")} - ${formatDate(comparison.earlierPeriod.end ?? "")}`}
            />
            <DataRow
              label={comparison.laterPeriod.label}
              value={`${formatDate(comparison.laterPeriod.start ?? "")} - ${formatDate(comparison.laterPeriod.end ?? "")}`}
            />
          </div>
          <div className="mt-4 space-y-3">
            {changes.length > 0 ? (
              changes.map((change) => <ChangeCard key={changeKey(change)} change={change} />)
            ) : (
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                No notable change crossed the contract threshold for this comparison.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function WindowParticipantDetails({ bucket }: { bucket: AdaptiveWindow }) {
  const participants = bucket.participants.filter(
    (participant) =>
      participant.messageCount > 0 ||
      participant.turnCount > 0 ||
      participant.replySampleCount > 0 ||
      participant.reconnectionCount > 0,
  )

  if (participants.length === 0) return null

  return (
    <details className="mt-3 border-t border-slate-100 pt-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600">Participant details</summary>
      <div className="mt-3 space-y-3">
        {participants.map((participant) => (
          <WindowParticipantRow key={`${bucket.index}-${participant.sender}`} participant={participant} />
        ))}
      </div>
    </details>
  )
}

function WindowParticipantRow({ participant }: { participant: ParticipantDynamicsSummary }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-semibold text-slate-800">{participant.sender}</span>
        <span className="shrink-0 text-slate-500">{formatNumber(participant.reconnectionCount)} restarts</span>
      </div>
      <div className="mt-3 space-y-2">
        <ProgressRow label="Turn share" value={participant.turnShare} />
        <ProgressRow label="Thread-start share" value={participant.threadStartShare} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <WindowStat
          label={`${formatNumber(participant.replySampleCount)} reply samples`}
          value={formatDuration(participant.medianReplyMinutes)}
        />
        <WindowStat label="Reconnections" value={formatNumber(participant.reconnectionCount)} />
      </div>
    </div>
  )
}

function ChangeCard({ change }: { change: MetricChange }) {
  const hasDirection = change.evidenceState === "sufficient"
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {change.sender ?? "Conversation"} | {change.evidenceState}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{change.label}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {formatPeriod(change.earlierPeriod)} to {formatPeriod(change.laterPeriod)}
          </p>
        </div>
        {hasDirection ? (
          <span className="shrink-0 text-xs font-bold text-emerald-800">{formatChangeDirection(change.direction)}</span>
        ) : (
          <Timer className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <WindowStat label={`${change.earlierPeriod.label} value`} value={formatChangeValue(change.earlierValue)} />
        <WindowStat label={`${change.laterPeriod.label} value`} value={formatChangeValue(change.laterValue)} />
        <WindowStat label="Earlier sample" value={formatNumber(change.earlierSampleSize)} />
        <WindowStat label="Later sample" value={formatNumber(change.laterSampleSize)} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-600">{change.explanation}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{change.guardrail}</p>
    </div>
  )
}

function sortChangesForDisplay(changes: MetricChange[]): MetricChange[] {
  return [...changes].sort((left, right) => {
    const rank = (change: MetricChange) => {
      if (change.notable && change.evidenceState === "sufficient") return 0
      if (change.evidenceState !== "sufficient") return 1
      return 2
    }
    const rankDifference = rank(left) - rank(right)
    if (rankDifference !== 0) return rankDifference
    if (left.metric !== right.metric) return left.metric.localeCompare(right.metric)
    return (left.sender ?? "").localeCompare(right.sender ?? "")
  })
}

function gateLabel(passed: boolean): string {
  return passed ? "method gate passed, product gate still blocked" : "not enough validated evidence"
}

function WindowStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-slate-500">{label}</p>
    </div>
  )
}

function formatChangeValue(value: MetricChange["earlierValue"]): string {
  if (value === null) return "Unavailable"
  if (typeof value === "string") return value
  return String(value)
}

function changeKey(change: MetricChange): string {
  return `${change.metric}-${change.sender ?? "conversation"}-${change.earlierPeriod.label}-${change.laterPeriod.label}`
}

function comparisonTitle(comparison: DynamicsComparison): string {
  return comparison.kind === "early_late" ? "Early versus late" : "Recent versus prior"
}

function formatPeriod(period: MetricChange["earlierPeriod"]): string {
  if (!period.start || !period.end) return period.label
  return `${period.label} (${formatDate(period.start)} - ${formatDate(period.end)})`
}
