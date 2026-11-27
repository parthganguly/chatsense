export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-[11px] font-bold uppercase tracking-wider text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1 break-words text-xl font-bold text-slate-900">{title}</h2>
    </div>
  )
}
