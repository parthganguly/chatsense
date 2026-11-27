import { Eraser, MessagesSquare } from "lucide-react"
import { formatNumber } from "@/utils/formatting"

export function AppHeader({
  messageCount,
  sourceName,
  onClear,
}: {
  messageCount: number
  sourceName: string
  onClear: () => void
}) {
  const metadata = `${formatNumber(messageCount)} messages from ${sourceName}`

  return (
    <header className="border-b border-slate-200 bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 md:pb-1.5 md:pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-[8px]">
          <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white">
            <MessagesSquare className="h-[16px] w-[16px]" aria-hidden="true" />
          </div>
          <h1 className="min-w-0 text-lg font-bold">ChatSense</h1>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear chat and return to import"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <Eraser className="h-4 w-4 shrink-0" aria-hidden="true" />
          Clear chat
        </button>
      </div>
      <p title={metadata} className="mt-2 line-clamp-2 md:mt-1 md:line-clamp-1 break-words text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">
        {metadata}
      </p>
    </header>
  )
}
