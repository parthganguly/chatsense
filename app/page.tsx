"use client"

import { useEffect, useRef, useState } from "react"
import JSZip from "jszip"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Clock3,
  Gauge,
  Import,
  Loader2,
  MessagesSquare,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/utils/cn"
import {
  analyzeChat,
  formatDuration,
  type ActivityPoint,
  type ChatAnalysis,
  type ChatMessage,
  type ObservableInsight,
  parseWhatsAppChat,
} from "@chatsense/core"

type Screen = "import" | "overview" | "rhythm" | "people"

type SharedFileEvent = CustomEvent<{
  name?: string
  mimeType?: string
  base64?: string
}>

export default function ChatSenseApp() {
  const [screen, setScreen] = useState<Screen>("import")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processChatFile = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const text = await readWhatsAppExport(file)
      const parsedMessages = parseWhatsAppChat(text)
      if (parsedMessages.length === 0) {
        throw new Error("No WhatsApp messages were found. Choose the exported ZIP or TXT file.")
      }

      setMessages(parsedMessages)
      setAnalysis(analyzeChat(parsedMessages))
      setSourceName(file.name)
      setScreen("overview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "ChatSense could not process this export.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const handleSharedFile = (event: Event) => {
      const { name, mimeType, base64 } = (event as SharedFileEvent).detail || {}
      if (!base64) return

      try {
        const file = new File([base64ToBuffer(base64)], name || "WhatsApp Chat.zip", {
          type: mimeType || "application/zip",
        })
        void processChatFile(file)
      } catch {
        setError("ChatSense could not read the shared export. Try selecting the ZIP manually.")
      }
    }

    window.addEventListener("chatsense-shared-file", handleSharedFile)
    return () => window.removeEventListener("chatsense-shared-file", handleSharedFile)
  }, [])

  if (screen === "import" || !analysis) {
    return (
      <ImportScreen
        error={error}
        isLoading={isLoading}
        onFileUpload={(file) => void processChatFile(file)}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#f8faf8] text-slate-900">
      <AppHeader
        messageCount={messages.length}
        sourceName={sourceName}
        onImport={() => setScreen("import")}
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            {screen === "overview" && <OverviewScreen analysis={analysis} />}
            {screen === "rhythm" && <RhythmScreen analysis={analysis} />}
            {screen === "people" && <PeopleScreen analysis={analysis} />}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav activeTab={screen} setActiveTab={setScreen} />
    </div>
  )
}

function ImportScreen({
  error,
  isLoading,
  onFileUpload,
}: {
  error: string | null
  isLoading: boolean
  onFileUpload: (file: File) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex h-full flex-col bg-[#f8faf8] p-6">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <MessagesSquare className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">ChatSense</h1>
          <p className="mt-3 max-w-sm text-base leading-6 text-slate-600">
            Local behavioral analytics for your WhatsApp export.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.txt,application/zip,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFileUpload(file)
          }}
        />

        <button
          type="button"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className="flex min-h-48 w-full flex-col items-center justify-center rounded-lg border border-dashed border-emerald-500 bg-white px-6 text-center shadow-sm transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-700" />
              <span className="mt-4 text-lg font-semibold">Analyzing export</span>
              <span className="mt-1 text-sm text-slate-500">Everything stays on this device</span>
            </>
          ) : (
            <>
              <Import className="h-10 w-10 text-emerald-700" />
              <span className="mt-4 text-lg font-semibold">Choose WhatsApp export</span>
              <span className="mt-1 text-sm text-slate-500">ZIP or TXT</span>
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>No upload. No account. Patterns are observations, not proof of intent.</span>
      </div>
    </div>
  )
}

function AppHeader({
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

function OverviewScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { overview, replyDynamics, silenceSummary, insights } = analysis

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow="Imported export" title="What stands out" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="Messages" value={formatNumber(overview.messageCount)} icon={MessagesSquare} />
          <MetricCard label="Active days" value={formatNumber(overview.activeDays)} icon={Activity} />
          <MetricCard label="Median reply" value={formatDuration(replyDynamics.medianReplyMinutes)} icon={Timer} />
          <MetricCard label="Longest silence" value={formatDuration(silenceSummary.longestSilenceMinutes)} icon={Moon} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Observed patterns" title="Useful signals" />
        <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {insights.length > 0 ? (
            insights.map((insight) => <InsightRow key={insight.title} insight={insight} />)
          ) : (
            <p className="px-4 py-5 text-sm text-slate-600">Not enough messages for pattern detection yet.</p>
          )}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Reply probability" title="How quickly replies arrive" />
        <div className="mt-4 space-y-3">
          <ProgressRow label="Within 1 hour" value={replyDynamics.withinOneHourRate} />
          <ProgressRow label="Within 6 hours" value={replyDynamics.withinSixHoursRate} />
          <ProgressRow label="Within 24 hours" value={replyDynamics.withinDayRate} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Based on {formatNumber(replyDynamics.replyCount)} sender-switch replies in the exported history.
        </p>
      </section>

      <section className="border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
        <p>
          Coverage: {formatDate(overview.startedAt)} to {formatDate(overview.endedAt)}. This report describes
          communication patterns in the exported messages only.
        </p>
      </section>
    </div>
  )
}

function RhythmScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { activity, replyDynamics, silenceSummary, threadCount } = analysis

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow="Time series" title="Conversation rhythm" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="Recent trend" value={formatTrend(activity.recentTrend)} icon={trendIcon(activity.recentTrend)} />
          <MetricCard label="Threads" value={formatNumber(threadCount)} icon={MessagesSquare} />
          <MetricCard label="Peak time" value={formatHour(activity.peakHour)} icon={Clock3} />
          <MetricCard label="Night messages" value={`${activity.nightMessageRate}%`} icon={Moon} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Last 30 days in export" title="Daily message volume" />
        <div className="mt-4">
          <MiniBars points={activity.dailyCounts} />
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Across the week" title="Active days" />
        <div className="mt-4 space-y-3">
          {activity.weekdayCounts.map((day) => (
            <ProgressRow
              key={day.label}
              label={day.label.slice(0, 3)}
              value={day.count}
              max={Math.max(...activity.weekdayCounts.map((point) => point.count), 1)}
              valueLabel={formatNumber(day.count)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Silence gaps" title="Unusual pauses" />
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          <DataRow label="Longest observed gap" value={formatDuration(silenceSummary.longestSilenceMinutes)} />
          <DataRow label="Unusual gaps" value={formatNumber(silenceSummary.unusualSilenceCount)} />
          <DataRow label="Chat-specific threshold" value={formatDuration(silenceSummary.unusualSilenceThresholdMinutes)} />
          <DataRow label="Average reply" value={formatDuration(replyDynamics.avgReplyMinutes)} />
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          A pause is flagged only when it is unusually long relative to this chat&apos;s own history.
        </p>
      </section>
    </div>
  )
}

function PeopleScreen({ analysis }: { analysis: ChatAnalysis }) {
  const maxMessages = Math.max(...analysis.participants.map((participant) => participant.messageCount), 1)

  return (
    <div className="space-y-7 px-5 py-5">
      <section>
        <SectionHeading eyebrow={`${analysis.participants.length} participants`} title="Who contributes" />
        <div className="mt-4 space-y-3">
          {analysis.participants.map((participant) => (
            <div key={participant.sender} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-900">{participant.sender}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatNumber(participant.wordCount)} words | {formatNumber(participant.initiationCount)} thread starts
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-800">{participant.messageShare}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${(participant.messageCount / maxMessages) * 100}%` }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>{formatNumber(participant.messageCount)} messages</span>
                <span>median reply {formatDuration(participant.medianReplyMinutes)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Sender switches" title="Who replies to whom" />
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {analysis.replyEdges.length > 0 ? (
            analysis.replyEdges.slice(0, 12).map((edge) => (
              <div key={`${edge.from}-${edge.to}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-slate-800">{edge.from}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate text-slate-600">{edge.to}</span>
                </div>
                <span className="shrink-0 font-semibold text-emerald-800">{formatNumber(edge.count)}</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-5 text-sm text-slate-600">No sender-switch replies were found.</p>
          )}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          A reply edge is counted when one participant sends the next message after another participant.
        </p>
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="min-h-28 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Icon className="h-4 w-4 text-emerald-700" />
      <p className="mt-4 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
    </div>
  )
}

function InsightRow({ insight }: { insight: ObservableInsight }) {
  const styles = {
    watch: { icon: AlertCircle, iconClass: "text-amber-700", label: "Watch" },
    pattern: { icon: Sparkles, iconClass: "text-emerald-700", label: "Pattern" },
    context: { icon: Gauge, iconClass: "text-sky-700", label: "Context" },
  }[insight.tone]
  const Icon = styles.icon

  return (
    <div className="flex gap-3 px-4 py-4">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.iconClass)} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{styles.label}</p>
        <h3 className="mt-1 text-sm font-semibold text-slate-900">{insight.title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">{insight.detail}</p>
      </div>
    </div>
  )
}

function ProgressRow({
  label,
  max = 100,
  value,
  valueLabel,
}: {
  label: string
  max?: number
  value: number
  valueLabel?: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-4 text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-bold text-slate-800">{valueLabel ?? `${value}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }}
        />
      </div>
    </div>
  )
}

function MiniBars({ points }: { points: ActivityPoint[] }) {
  const maxCount = Math.max(...points.map((point) => point.count), 1)
  return (
    <div>
      <div className="flex h-28 items-end gap-1 border-b border-slate-300">
        {points.map((point) => (
          <div
            key={point.label}
            className="min-w-0 flex-1 rounded-t-sm bg-emerald-600"
            style={{ height: `${Math.max(3, (point.count / maxCount) * 100)}%` }}
            title={`${point.label}: ${point.count} messages`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{points.at(0)?.label ?? ""}</span>
        <span>{points.at(-1)?.label ?? ""}</span>
      </div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-bold text-slate-900">{value}</span>
    </div>
  )
}

function BottomNav({
  activeTab,
  setActiveTab,
}: {
  activeTab: Screen
  setActiveTab: (tab: Screen) => void
}) {
  return (
    <nav className="border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-3">
        <NavItem icon={BarChart3} label="Overview" active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
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
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition",
        active ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  )
}

async function readWhatsAppExport(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith(".txt")) return file.text()

  if (fileName.endsWith(".zip") || file.type.includes("zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const files = Object.values(zip.files)
    const chatFile =
      files.find((entry) => !entry.dir && entry.name.toLowerCase().endsWith("_chat.txt")) ??
      files.find((entry) => !entry.dir && entry.name.toLowerCase().includes("whatsapp chat") && entry.name.toLowerCase().endsWith(".txt")) ??
      files.find((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".txt"))

    if (!chatFile) throw new Error("No WhatsApp chat TXT file was found inside this ZIP.")
    return chatFile.async("string")
  }

  throw new Error("Choose the WhatsApp export ZIP or TXT file.")
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

function trendIcon(trend: ChatAnalysis["activity"]["recentTrend"]) {
  if (trend === "rising") return TrendingUp
  if (trend === "falling") return TrendingDown
  return Activity
}

function formatTrend(trend: ChatAnalysis["activity"]["recentTrend"]): string {
  return trend === "not_enough_data" ? "Limited data" : trend[0].toUpperCase() + trend.slice(1)
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour} ${suffix}`
}

function formatDate(value: string): string {
  if (!value) return "No data"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}
