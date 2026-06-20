import { Activity, MessagesSquare, Moon, Timer } from "lucide-react"
import { formatDuration, type ChatAnalysis } from "@chatsense/core"
import { InsightRow } from "@/components/analytics/InsightRow"
import { MetricCard } from "@/components/analytics/MetricCard"
import { ProgressRow } from "@/components/analytics/ProgressRow"
import { SectionHeading } from "@/components/analytics/SectionHeading"
import { formatDate, formatNumber } from "@/utils/formatting"

export function OverviewScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { overview, replyDynamics, silenceSummary, insights } = analysis

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow="Imported export" title="What stands out" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="Messages" value={formatNumber(overview.messageCount)} icon={MessagesSquare} />
          <MetricCard label="Active days" value={formatNumber(overview.activeDays)} icon={Activity} />
          <MetricCard label="Median reply" value={formatDuration(replyDynamics.medianReplyMinutes)} icon={Timer} />
          <MetricCard label="Longest silence" value={formatDuration(silenceSummary.longestSilenceMinutes)} icon={Moon} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Observed patterns" title="Useful signals" />
        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {insights.length > 0 ? (
            insights.map((insight) => <InsightRow key={insight.title} insight={insight} />)
          ) : (
            <p className="px-4 py-5 text-sm text-slate-600">Not enough messages for pattern detection yet.</p>
          )}
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
