import type { ActivityPoint } from "@chatsense/core"

export function MiniBars({ points }: { points: ActivityPoint[] }) {
  const maxCount = Math.max(...points.map((point) => point.count), 1)
  return (
    <div>
      <div className="flex h-28 items-end gap-1 border-b border-slate-300">
        {points.map((point) => (
          <div
            key={point.label}
            className="min-w-0 flex-1 rounded-t-sm bg-emerald-600"
            style={{ height: `${Math.max(3, (point.count / maxCount) * 100)}%` }}
            title={`${point.label}: ${point.count} messages`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{points.at(0)?.label ?? ""}</span>
        <span>{points.at(-1)?.label ?? ""}</span>
      </div>
    </div>
  )
}
