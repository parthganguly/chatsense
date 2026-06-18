import { Activity, GitBranch, MessagesSquare, Timer, Users } from "lucide-react"
import { formatDuration, type ChatAnalysis, type DynamicsChange } from "@chatsense/core"
import { DataRow } from "@/components/analytics/DataRow"
import { InsightRow } from "@/components/analytics/InsightRow"
import { MetricCard } from "@/components/analytics/MetricCard"
import { SectionHeading } from "@/components/analytics/SectionHeading"
import { formatChangeDirection, formatDate, formatNumber, formatPhaseLabel } from "@/utils/formatting"

export function DynamicsScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { relationshipDynamics } = analysis
  const changes = [
    relationshipDynamics.activityChange,
    relationshipDynamics.replyPaceChange,
    relationshipDynamics.balanceChange,
    relationshipDynamics.initiationChange,
  ]

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow="Over the export" title="How behavior changed" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard
            label="Compared phases"
            value={formatNumber(relationshipDynamics.phaseCount)}
            icon={GitBranch}
          />
          <MetricCard
            label="Activity"
            value={formatChangeDirection(relationshipDynamics.activityChange.direction)}
            icon={Activity}
          />
          <MetricCard
            label="Reply pace"
            value={formatChangeDirection(relationshipDynamics.replyPaceChange.direction)}
            icon={Timer}
          />
          <MetricCard
            label="Balance"
            value={formatChangeDirection(relationshipDynamics.balanceChange.direction)}
            icon={Users}
          />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Timeline phases" title="Early to recent" />
        <div className="mt-4 space-y-3">
          {relationshipDynamics.phases.map((phase) => (
            <div key={phase.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{formatPhaseLabel(phase.label)}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {formatDate(phase.startedAt)} to {formatDate(phase.endedAt)}
                  </p>
                </div>
                <MessagesSquare className="h-4 w-4 shrink-0 text-emerald-700" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <PhaseStat label="Messages" value={formatNumber(phase.messageCount)} />
                <PhaseStat label="Per active day" value={String(phase.avgMessagesPerActiveDay)} />
                <PhaseStat label="Median reply" value={formatDuration(phase.medianReplyMinutes)} />
                <PhaseStat label="Top share" value={`${phase.dominantSenderShare}%`} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="First vs recent" title="Observable shifts" />
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {changes.map((change) => (
            <ChangeRow key={change.label} change={change} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Interpretation guardrail" title="What this can and cannot say" />
        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {relationshipDynamics.changeInsights.map((insight) => (
            <InsightRow key={insight.title} insight={insight} />
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          These comparisons describe exported message timing and volume only. They do not prove motive,
          affection, attachment, personality, or relationship status.
        </p>
      </section>
    </div>
  )
}

function PhaseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-slate-500">{label}</p>
    </div>
  )
}

function ChangeRow({ change }: { change: DynamicsChange }) {
  return (
    <div>
      <DataRow label={change.label} value={formatChangeDirection(change.direction)} />
      <p className="px-4 pb-3 text-xs leading-5 text-slate-500">{change.summary}</p>
    </div>
  )
}
