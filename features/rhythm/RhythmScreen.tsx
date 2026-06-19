import { Activity, Clock3, MessagesSquare, Moon, TrendingDown, TrendingUp } from "lucide-react"
import { formatDuration, type ChatAnalysis } from "@chatsense/core"
import { DataRow } from "@/components/analytics/DataRow"
import { MetricCard } from "@/components/analytics/MetricCard"
import { MiniBars } from "@/components/analytics/MiniBars"
import { ProgressRow } from "@/components/analytics/ProgressRow"
import { SectionHeading } from "@/components/analytics/SectionHeading"
import { formatDateTime, formatHour, formatNumber, formatTrend } from "@/utils/formatting"

export function RhythmScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { activity, replyDynamics, silenceSummary, threadCount, relationshipDynamics } = analysis
  const pauseSummary = relationshipDynamics.pauseSummary
  const reconnectors =
    pauseSummary.reconnectingParticipants.length > 0
      ? pauseSummary.reconnectingParticipants.map((participant) => participant.sender).join(", ")
      : "No 24h restarts"

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow="Time series" title="Conversation rhythm" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="Recent trend" value={formatTrend(activity.recentTrend)} icon={trendIcon(activity.recentTrend)} />
          <MetricCard label="Threads" value={formatNumber(threadCount)} icon={MessagesSquare} />
          <MetricCard label="Peak time" value={formatHour(activity.peakHour)} icon={Clock3} />
          <MetricCard label="Night messages" value={`${activity.nightMessageRate}%`} icon={Moon} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Last 30 days in export" title="Daily message volume" />
        <div className="mt-4">
          <MiniBars points={activity.dailyCounts} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Across the week" title="Messages by weekday" />
        <div className="mt-4 space-y-3">
          {activity.weekdayCounts.map((day) => (
            <ProgressRow
              key={day.label}
              label={day.label.slice(0, 3)}
              value={day.count}
              max={Math.max(...activity.weekdayCounts.map((point) => point.count), 1)}
              valueLabel={formatNumber(day.count)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Pauses and restarts" title="Long gaps in context" />
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          <DataRow label="Longest observed gap" value={formatDuration(silenceSummary.longestSilenceMinutes)} />
          <DataRow label="Median inter-message gap" value={formatDuration(pauseSummary.medianInterMessageGapMinutes)} />
          <DataRow label="Pauses at least 24h" value={formatNumber(pauseSummary.longPauseCount)} />
          <DataRow
            label="Latest gap percentile"
            value={pauseSummary.latestGapPercentile === null ? "No data" : `${pauseSummary.latestGapPercentile}%`}
          />
          <DataRow label="Reconnecting participants" value={reconnectors} />
          <DataRow label="Average reply" value={formatDuration(replyDynamics.avgReplyMinutes)} />
        </div>
        {pauseSummary.longestPauses.length > 0 ? (
          <div className="mt-4 space-y-2">
            {pauseSummary.longestPauses.map((pause) => (
              <div
                key={`${pause.startedAt}-${pause.endedAt}`}
                className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">
                      {formatDateTime(pause.startedAt)} to {formatDateTime(pause.endedAt)}
                    </p>
                    <p className="mt-1 text-slate-500">
                      First message afterward: {pause.reconnectingSender ?? "No following sender"}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold text-emerald-800">{formatDuration(pause.durationMinutes)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Latest percentile compares only with earlier gaps in this export. A restart is counted only when a participant
          sends the first message after a pause of at least 24 hours. This is a timing observation, not a motive claim.
        </p>
      </section>
    </div>
  )
}

function trendIcon(trend: ChatAnalysis["activity"]["recentTrend"]) {
  if (trend === "rising") return TrendingUp
  if (trend === "falling") return TrendingDown
  return Activity
}
