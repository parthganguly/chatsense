import type { ComponentType } from "react"

export function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="min-h-28 min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="h-4 w-4 text-emerald-700" />
      <p className="mt-4 break-words text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 break-words text-xs text-slate-500">{label}</p>
    </div>
  )
}
