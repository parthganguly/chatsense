export function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
      <span className="min-w-0 break-words text-slate-600">{label}</span>
      <span className="min-w-0 max-w-full break-words font-bold text-slate-900">{value}</span>
    </div>
  )
}
