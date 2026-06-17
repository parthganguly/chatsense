import { MessagesSquare, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatNumber } from "@/utils/formatting"

export function AppHeader({
  messageCount,
  sourceName,
  onImport,
}: {
  messageCount: number
  sourceName: string
  onImport: () => void
}) {
  return (
    <header className="border-b border-slate-200 bg-white px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-700 text-white">
              <MessagesSquare className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold">ChatSense</h1>
          </div>
          <p className="mt-2 truncate text-xs text-slate-500">
            {formatNumber(messageCount)} messages from {sourceName}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onImport}
          aria-label="Analyze another export"
          title="Analyze another export"
          className="shrink-0 rounded-md"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
