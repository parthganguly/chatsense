import { Activity, MessagesSquare, Moon, ShieldCheck, Timer } from "lucide-react"
import { formatDuration, type ChatAnalysis } from "@chatsense/core"
import { MetricCard } from "@/components/analytics/MetricCard"
import { NarrativeFindingRow } from "@/components/analytics/NarrativeFindingRow"
import { ProgressRow } from "@/components/analytics/ProgressRow"
import { SectionHeading } from "@/components/analytics/SectionHeading"
import { formatDate, formatNumber } from "@/utils/formatting"

export function OverviewScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { overview, replyDynamics, silenceSummary, narrative } = analysis

  return (
    <div className="space-y-7 px-5 py-5">
      <section aria-labelledby="narrative-heading">
        <p className="text-[11px] font-bold uppercase text-emerald-700">Evidence-backed summary</p>
        <h2 id="narrative-heading" className="mt-2 max-w-xl break-words text-2xl font-bold leading-8 text-slate-950">
          {narrative.headline}
        </h2>
        <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-slate-600">{narrative.summary}</p>

        <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
          {narrative.findings.map((finding) => (
            <NarrativeFindingRow key={finding.id} finding={finding} />
          ))}
        </div>

        <div className="mt-4 flex gap-3 border-l-2 border-emerald-600 bg-emerald-50/60 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-emerald-950">What this can and cannot say</p>
            <p className="mt-1 text-xs leading-5 text-emerald-950/75">{narrative.guardrail}</p>
            {narrative.limitations.map((limitation) => (
              <p key={limitation} className="mt-1 text-xs leading-5 text-emerald-950/75">
                {limitation}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Imported export" title="At a glance" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="Messages" value={formatNumber(overview.messageCount)} icon={MessagesSquare} />
          <MetricCard label="Active days" value={formatNumber(overview.activeDays)} icon={Activity} />
          <MetricCard label="Median reply" value={formatDuration(replyDynamics.medianReplyMinutes)} icon={Timer} />
          <MetricCard label="Longest silence" value={formatDuration(silenceSummary.longestSilenceMinutes)} icon={Moon} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Historical reply timing" title="Observed sender switches" />
        <div className="mt-4 space-y-3">
          <ProgressRow label="Within 1 hour" value={replyDynamics.withinOneHourRate} />
          <ProgressRow label="Within 6 hours" value={replyDynamics.withinSixHoursRate} />
          <ProgressRow label="Within 24 hours" value={replyDynamics.withinDayRate} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Based on {formatNumber(replyDynamics.replyCount)} observed sender-switch replies in this export. This is
          historical timing, not a prediction of future replies.
        </p>
      </section>

      <section className="border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
        <p>
          Coverage: {formatDate(overview.startedAt)} to {formatDate(overview.endedAt)}. This report describes
          communication patterns in the exported messages only.
        </p>
      </section>
    </div>
  )
}
