import { Sparkles } from "lucide-react"
import { takeawayConfidenceLabel, type HumanTakeaway, type TakeawayTone } from "@chatsense/core"

const toneAccent: Record<TakeawayTone, string> = {
  balanced: "border-emerald-600",
  uneven: "border-violet-600",
  changed: "border-cyan-600",
  stable: "border-emerald-600",
  limited: "border-slate-300",
  caution: "border-amber-600",
}

export function TakeawayCard({ takeaway }: { takeaway: HumanTakeaway }) {
  return (
    <section
      aria-label={takeaway.title}
      className={`rounded-lg border border-slate-200 border-l-4 ${toneAccent[takeaway.tone]} bg-white p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase text-slate-500">
          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          {takeaway.title}
        </p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {takeawayConfidenceLabel(takeaway.confidence)}
        </span>
      </div>
      <h2 className="mt-2 break-words text-lg font-bold leading-6 text-slate-950">{takeaway.oneLineRead}</h2>
      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{takeaway.whatThisMeans}</p>
      <ul className="mt-3 space-y-1">
        {takeaway.whyItLooksThatWay.slice(0, 3).map((reason) => (
          <li key={reason} className="flex gap-2 break-words text-xs leading-5 text-slate-500">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
            <span className="min-w-0">{reason}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
