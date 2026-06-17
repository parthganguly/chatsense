export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
    </div>
  )
}
