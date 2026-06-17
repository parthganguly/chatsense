export function ProgressRow({
  label,
  max = 100,
  value,
  valueLabel,
}: {
  label: string
  max?: number
  value: number
  valueLabel?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-4 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{valueLabel ?? `${value}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }}
        />
      </div>
    </div>
  )
}
