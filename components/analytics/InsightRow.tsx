import { AlertCircle, Gauge, Sparkles } from "lucide-react"
import type { ObservableInsight } from "@chatsense/core"
import { cn } from "@/lib/utils"

export function InsightRow({ insight }: { insight: ObservableInsight }) {
  const styles = {
    watch: { icon: AlertCircle, iconClass: "text-amber-700", label: "Watch" },
    pattern: { icon: Sparkles, iconClass: "text-emerald-700", label: "Pattern" },
    context: { icon: Gauge, iconClass: "text-sky-700", label: "Context" },
  }[insight.tone]
  const Icon = styles.icon

  return (
    <div className="flex gap-3 px-4 py-4">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.iconClass)} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{styles.label}</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">{insight.title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">{insight.detail}</p>
      </div>
    </div>
  )
}
