import { ArrowRight } from "lucide-react"
import { formatDuration, type ChatAnalysis } from "@chatsense/core"
import { DataRow } from "@/components/analytics/DataRow"
import { ProgressRow } from "@/components/analytics/ProgressRow"
import { SectionHeading } from "@/components/analytics/SectionHeading"
import { formatNumber } from "@/utils/formatting"

export function PeopleScreen({ analysis }: { analysis: ChatAnalysis }) {
  const maxMessages = Math.max(...analysis.participants.map((participant) => participant.messageCount), 1)
  const participantDynamics = analysis.relationshipDynamics.participantSummaries
  const isTwoPersonChat = analysis.overview.participantCount === 2

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow={`${analysis.participants.length} participants`} title="Who contributes" />
        <div className="mt-4 space-y-3">
          {analysis.participants.map((participant) => (
            <div key={participant.sender} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{participant.sender}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(participant.wordCount)} words | {formatNumber(participant.initiationCount)} thread starts
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-800">{participant.messageShare}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${(participant.messageCount / maxMessages) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{formatNumber(participant.messageCount)} messages</span>
                <span>median reply {formatDuration(participant.medianReplyMinutes)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {isTwoPersonChat ? (
        <section>
          <SectionHeading eyebrow="Observable contact patterns" title="Who keeps contact moving" />
          <div className="mt-4 space-y-4">
            {participantDynamics.map((participant) => (
              <div key={participant.sender} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">{participant.sender}</h3>
                <div className="mt-4 space-y-3">
                  <ProgressRow label="Turn share" value={participant.turnShare} />
                  <ProgressRow label="Thread-start share" value={participant.threadStartShare} />
                  <DataRow label="Median reply" value={formatDuration(participant.medianReplyMinutes)} />
                  <DataRow label="Reconnections after 24h" value={formatNumber(participant.reconnectionCount)} />
                  <DataRow label="Follow-ups before reply" value={formatNumber(participant.followUpCount)} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            These are observable turn, timing, and restart counts. They do not indicate motive or relationship status.
          </p>
        </section>
      ) : (
        <section>
          <SectionHeading eyebrow="Sender switches" title="Approximate interaction paths" />
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
            {analysis.replyEdges.length > 0 ? (
              analysis.replyEdges.slice(0, 12).map((edge) => (
                <div key={`${edge.from}-${edge.to}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-slate-800">{edge.from}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate text-slate-600">{edge.to}</span>
                  </div>
                  <span className="shrink-0 font-semibold text-emerald-800">{formatNumber(edge.count)}</span>
                </div>
              ))
            ) : (
              <p className="px-4 py-5 text-sm text-slate-600">No sender-switch replies were found.</p>
            )}
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Sender-switch edges in group exports are approximate. They use the immediately previous sender only and
            do not resolve quoted replies, mentions, or side threads.
          </p>
        </section>
      )}
    </div>
  )
}
