import type { ComponentType } from "react"
import { Activity, BarChart3, LineChart, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AppScreen } from "./navigationTypes"

export function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: AppScreen
  setActiveTab: (tab: AppScreen) => void
}) {
  return (
    <nav className="border-t border-slate-200 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-4">
        <NavItem icon={BarChart3} label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
        <NavItem icon={LineChart} label="Dynamics" active={activeTab === "dynamics"} onClick={() => setActiveTab("dynamics")} />
        <NavItem icon={Activity} label="Rhythm" active={activeTab === "rhythm"} onClick={() => setActiveTab("rhythm")} />
        <NavItem icon={Users} label="People" active={activeTab === "people"} onClick={() => setActiveTab("people")} />
      </div>
    </nav>
  )
}

function NavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold transition sm:text-[11px]",
        active ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  )
}
