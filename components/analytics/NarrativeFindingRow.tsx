import {
  Activity,
  Clock3,
  FlaskConical,
  GitCompare,
  Handshake,
  MessagesSquare,
  PauseCircle,
  RotateCcw,
  Scale,
  ScanSearch,
  ShieldAlert,
  TrendingUp,
  Waves,
  type LucideIcon,
} from "lucide-react"
import type { NarrativeCategory, NarrativeFinding } from "@chatsense/core"

const categoryPresentation: Record<NarrativeCategory, { icon: LucideIcon; label: string; iconClass: string }> = {
  balance: { icon: Scale, label: "Balance", iconClass: "text-violet-700" },
  maintenance: { icon: Handshake, label: "Contact maintenance", iconClass: "text-emerald-700" },
  reconnection: { icon: RotateCcw, label: "Restarts", iconClass: "text-amber-700" },
  reply_timing: { icon: Clock3, label: "Reply timing", iconClass: "text-cyan-700" },
  activity_change: { icon: TrendingUp, label: "Activity change", iconClass: "text-rose-700" },
  rhythm: { icon: Waves, label: "Rhythm", iconClass: "text-sky-700" },
  forecasting_gate: { icon: FlaskConical, label: "Forecasting gate", iconClass: "text-slate-700" },
  data_quality: { icon: ShieldAlert, label: "Evidence limit", iconClass: "text-amber-700" },
  change: { icon: GitCompare, label: "Measured change", iconClass: "text-emerald-700" },
  comparison_context: { icon: ScanSearch, label: "Comparison", iconClass: "text-sky-700" },
  participation: { icon: MessagesSquare, label: "Participation", iconClass: "text-violet-700" },
  pause_reconnection: { icon: PauseCircle, label: "Pauses", iconClass: "text-amber-700" },
  activity: { icon: Activity, label: "Activity", iconClass: "text-rose-700" },
}

export function NarrativeFindingRow({ finding }: { finding: NarrativeFinding }) {
  const presentation = categoryPresentation[finding.category]
  const Icon = presentation.icon

  return (
    <article className="py-5">
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${presentation.iconClass}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase text-slate-400">{presentation.label}</p>
          <h3 className="mt-1 break-words text-sm font-semibold text-slate-950">{finding.title}</h3>
          <p className="mt-1 break-words text-sm leading-6 text-slate-600">{finding.summary}</p>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
            {finding.evidence.map((item) => (
              <div key={`${finding.id}-${item.label}`} className="min-w-0 border-l-2 border-slate-200 pl-3">
                <dt className="break-words text-[10px] font-semibold uppercase text-slate-400">{item.label}</dt>
                <dd className="mt-1 break-words text-xs font-bold text-slate-900">{item.value}</dd>
                {item.detail && (
                  <dd className="mt-1 break-words text-[11px] leading-4 text-slate-500">{item.detail}</dd>
                )}
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  )
}
