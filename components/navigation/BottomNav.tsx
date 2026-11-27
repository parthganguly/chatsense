import { useRef, useState, type ComponentType, type KeyboardEvent } from "react"
import { Activity, BarChart3, LineChart, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReportTab } from "./navigationTypes"

const TABS: Array<{ id: ReportTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "changes", label: "Changes", icon: LineChart },
  { id: "rhythm", label: "Rhythm", icon: Activity },
  { id: "people", label: "People", icon: Users },
]

export const REPORT_PANEL_ID = "report-panel"
export const tabButtonId = (tab: ReportTab) => `report-tab-${tab}`

/**
 * Manual-activation tabs: one tab stop (roving tabindex); arrows, Home and End
 * move focus; Enter or Space (native button click) selects.
 */
export function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: ReportTab
  setActiveTab: (tab: ReportTab) => void
}) {
  const [focusedTab, setFocusedTab] = useState(activeTab)
  const [syncedActive, setSyncedActive] = useState(activeTab)
  const buttons = useRef<Partial<Record<ReportTab, HTMLButtonElement | null>>>({})

  // A selection made elsewhere (evidence jump) takes the single tab stop with it.
  if (syncedActive !== activeTab) {
    setSyncedActive(activeTab)
    setFocusedTab(activeTab)
  }

  const moveFocus = (event: KeyboardEvent, index: number) => {
    const last = TABS.length - 1
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null
    if (next === null) return
    event.preventDefault()
    setFocusedTab(TABS[next].id)
    buttons.current[TABS[next].id]?.focus()
  }

  return (
    <nav
      aria-label="Report sections"
      className="order-last border-t border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div
        role="tablist"
        aria-label="Report sections"
        className="grid grid-cols-[repeat(auto-fit,minmax(4.6rem,1fr))]"
      >
        {TABS.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            ref={(element) => {
              buttons.current[id] = element
            }}
            id={tabButtonId(id)}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={REPORT_PANEL_ID}
            tabIndex={focusedTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onFocus={() => setFocusedTab(id)}
            onKeyDown={(event) => moveFocus(event, index)}
            className={cn(
              "flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[0.625rem] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700 sm:text-[0.6875rem]",
              activeTab === id ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50",
            )}
          >
            <Icon className="h-[20px] w-[20px] shrink-0" aria-hidden="true" />
            <span className="max-w-full">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
