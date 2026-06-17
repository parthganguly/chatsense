"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AppHeader } from "@/components/navigation/AppHeader"
import { BottomNav } from "@/components/navigation/BottomNav"
import type { AppScreen } from "@/components/navigation/navigationTypes"
import { ImportScreen } from "@/features/import/ImportScreen"
import { useChatImport } from "@/features/import/useChatImport"
import { OverviewScreen } from "@/features/overview/OverviewScreen"
import { PeopleScreen } from "@/features/people/PeopleScreen"
import { RhythmScreen } from "@/features/rhythm/RhythmScreen"
import { subscribeToSharedFileBridge } from "@/platform/android/sharedFileBridge"

export default function ChatSenseApp() {
  const [screen, setScreen] = useState<AppScreen>("import")
  const handleImported = useCallback(() => setScreen("overview"), [])
  const { analysis, error, importFile, isLoading, messages, setError, sourceName } = useChatImport(handleImported)

  useEffect(() => {
    return subscribeToSharedFileBridge({
      onFile: (file) => importFile(file),
      onError: setError,
    })
  }, [importFile, setError])

  if (screen === "import" || !analysis) {
    return (
      <ImportScreen
        error={error}
        isLoading={isLoading}
        onFileUpload={(file) => void importFile(file)}
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
