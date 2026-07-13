import { Compass } from "lucide-react"
import type { RelationshipRead } from "@chatsense/core"

const stateAccent: Record<RelationshipRead["state"], string> = {
  unusual_silence: "border-amber-600",
  pattern_change: "border-cyan-600",
  carried_contact: "border-violet-600",
  insufficient_evidence: "border-slate-300",
}

const detailsLabel: Record<RelationshipRead["detailsSection"], string> = {
  overview: "the summary below",
  changes: "the Changes tab",
  people: "the People tab",
  rhythm: "the Rhythm tab",
}

/**
 * Stage 8A hero card. Renders a precomputed relationship read; every value on
 * this card is calculated in @chatsense/core, never here.
 */
export function RelationshipReadCard({ read }: { read: RelationshipRead }) {
  return (
    <section
      aria-label="Relationship read"
      className={`rounded-lg border border-slate-200 border-l-4 ${stateAccent[read.state]} bg-white p-4 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-emerald-800">
          <Compass className="mr-1 inline h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          What this export shows
        </p>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {read.confidenceLabel}
        </span>
      </div>
      <h1 className="mt-2 break-words text-xl font-bold leading-7 text-slate-950">{read.headline}</h1>
      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{read.summary}</p>

      {read.evidence.length > 0 ? (
        <>
          <p className="mt-3 text-[11px] font-semibold text-slate-500">Counted in this export</p>
          <ul className="mt-1 space-y-0.5">
            {read.evidence.map((fact) => (
              <li key={fact} className="flex gap-2 break-words text-xs leading-5 text-slate-500">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                <span className="min-w-0">{fact}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {read.historicalNote ? (
        <p className="mt-3 break-words border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-600">
          {read.historicalNote}
        </p>
      ) : null}

      {read.stalenessNote ? (
        <p className="mt-3 break-words text-xs leading-5 text-slate-500">{read.stalenessNote}</p>
      ) : null}

      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-400">{read.limitation}</p>
      <a
        href="#narrative-heading"
        className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline underline-offset-2"
      >
        See the evidence in {detailsLabel[read.detailsSection]}
      </a>
    </section>
  )
}
