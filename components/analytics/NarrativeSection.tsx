import { ShieldCheck } from "lucide-react"
import type { NarrativeSection as NarrativeSectionData } from "@chatsense/core"
import { NarrativeFindingRow } from "@/components/analytics/NarrativeFindingRow"

export function NarrativeSection({
  eyebrow,
  title,
  section,
  guardrail,
}: {
  eyebrow: string
  title: string
  section: NarrativeSectionData
  guardrail: string
}) {
  const headingId = `${section.id}-narrative-heading`

  return (
    <section aria-labelledby={headingId}>
      <p className="text-[11px] font-bold uppercase text-emerald-700">{eyebrow}</p>
      <h2 id={headingId} className="mt-2 break-words text-xl font-bold leading-7 text-slate-950">
        {title}
      </h2>
      <p className="mt-2 break-words text-sm leading-6 text-slate-600">{section.summary}</p>
      <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {section.findings.map((finding) => (
          <NarrativeFindingRow key={finding.id} finding={finding} />
        ))}
      </div>
      <div className="mt-3 flex gap-2 border-l-2 border-slate-300 pl-3 text-xs leading-5 text-slate-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
        <p>{guardrail}</p>
      </div>
    </section>
  )
}
