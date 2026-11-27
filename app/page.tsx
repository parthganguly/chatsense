"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { AlertCircle } from "lucide-react"
import { AppHeader } from "@/components/navigation/AppHeader"
import { BottomNav, REPORT_PANEL_ID, tabButtonId } from "@/components/navigation/BottomNav"
import type { ReportTab } from "@/components/navigation/navigationTypes"
import { ChangesScreen } from "@/features/changes/ChangesScreen"
import { ImportScreen } from "@/features/import/ImportScreen"
import { useChatImport } from "@/features/import/useChatImport"
import { OverviewScreen } from "@/features/overview/OverviewScreen"
import { PeopleScreen } from "@/features/people/PeopleScreen"
import { RhythmScreen } from "@/features/rhythm/RhythmScreen"
import { subscribeToSharedFileBridge } from "@/platform/android/sharedFileBridge"

const NO_SCROLL: Record<ReportTab, number> = { overview: 0, changes: 0, rhythm: 0, people: 0 }

// Heading that holds the evidence each hero state points at.
const evidenceHeadingId = (tab: ReportTab) => (tab === "overview" ? "narrative-heading" : `${tab}-narrative-heading`)

export default function ChatSenseApp() {
  const [tab, setTab] = useState<ReportTab>("overview")
  const [evidenceRequest, setEvidenceRequest] = useState<{ tab: ReportTab; count: number } | null>(null)
  const [returnedToImport, setReturnedToImport] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollOffsets = useRef({ ...NO_SCROLL })

  const handleImported = useCallback(() => {
    scrollOffsets.current = { ...NO_SCROLL }
    setEvidenceRequest(null)
    setReturnedToImport(false)
    setTab("overview")
  }, [])
  const { analysis, relationshipRead, error, importFile, importDemo, isLoading, messageCount, setError, clear, sourceName } =
    useChatImport(handleImported)

  useEffect(() => {
    return subscribeToSharedFileBridge({
      onFile: (file) => importFile(file),
      onError: setError,
    })
  }, [importFile, setError])

  // Each tab keeps only its own offset: save the outgoing one, restore the incoming one.
  useLayoutEffect(() => {
    const main = panelRef.current
    if (main) main.scrollTop = scrollOffsets.current[tab]
  }, [tab, analysis])

  useLayoutEffect(() => {
    if (!evidenceRequest) return
    const heading = document.getElementById(evidenceHeadingId(evidenceRequest.tab))
    if (!heading) return
    if (evidenceRequest.tab === "overview") {
      heading.scrollIntoView({ block: "start" })
      heading.focus({ preventScroll: true })
    } else {
      heading.focus()
    }
  }, [evidenceRequest])

  const selectTab = (next: ReportTab) => {
    if (next === tab) return
    if (panelRef.current) scrollOffsets.current[tab] = panelRef.current.scrollTop
    setTab(next)
  }

  const openEvidence = (section: ReportTab) => {
    if (panelRef.current) scrollOffsets.current[tab] = panelRef.current.scrollTop
    if (section !== "overview") scrollOffsets.current[section] = 0
    setTab(section)
    setEvidenceRequest((previous) => ({ tab: section, count: (previous?.count ?? 0) + 1 }))
  }

  const clearChat = () => {
    scrollOffsets.current = { ...NO_SCROLL }
    setEvidenceRequest(null)
    setTab("overview")
    setReturnedToImport(true)
    clear()
  }

  if (!analysis) {
    return (
      <ImportScreen
        error={error}
        isLoading={isLoading}
        focusHeading={returnedToImport}
        onFileUpload={(file) => void importFile(file)}
        onDemoImport={importDemo}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#f8faf8] text-slate-900">
      <AppHeader messageCount={messageCount} sourceName={sourceName} onClear={clearChat} />
      <div id="report-error-alert" role="alert" aria-live="assertive" aria-atomic="true">
        {error && (
          <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss import error"
              className="min-h-[44px] shrink-0 rounded-md px-2 font-semibold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      {/* Tabs precede the panel in DOM order (Tab from a tab enters the panel); BottomNav sits last visually. */}
      <BottomNav activeTab={tab} setActiveTab={selectTab} />
      <main className="min-h-0 flex-1">
        <div
          ref={panelRef}
          id={REPORT_PANEL_ID}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={tabButtonId(tab)}
          className="h-full overflow-y-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-700"
        >
          {tab === "overview" && (
            <OverviewScreen analysis={analysis} relationshipRead={relationshipRead} onOpenEvidence={openEvidence} />
          )}
          {tab === "changes" && <ChangesScreen analysis={analysis} />}
          {tab === "rhythm" && <RhythmScreen analysis={analysis} />}
          {tab === "people" && <PeopleScreen analysis={analysis} />}
        </div>
      </main>
    </div>
  )
}
