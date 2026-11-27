"use client"

import { useCallback, useRef, useState } from "react"
import {
  analyzeChat,
  buildRelationshipRead,
  parseWhatsAppChat,
  type ChatAnalysis,
  type ChatMessage,
  type RelationshipRead,
} from "@chatsense/core"
import { DEMO_EXPORT_NAME, DEMO_EXPORT_TEXT } from "./demoExport"
import { readWhatsAppExport } from "./readWhatsAppExport"

// The report is everything the app keeps after an import. Raw messages are
// parsed, analyzed, and dropped; only the count is retained.
type ImportedReport = {
  analysis: ChatAnalysis
  relationshipRead: RelationshipRead
  messageCount: number
  sourceName: string
}

export type ChatImportState = {
  analysis: ChatAnalysis | null
  relationshipRead: RelationshipRead | null
  error: string | null
  isLoading: boolean
  messageCount: number
  sourceName: string
}

export type ChatImportActions = {
  importFile(file: File): Promise<void>
  importDemo(): void
  setError(message: string | null): void
  clear(): void
}

export function analyzeImportedText(
  text: string,
  nowMs: number | null = Date.now(),
): { analysis: ChatAnalysis; relationshipRead: RelationshipRead; messages: ChatMessage[] } {
  const messages = parseWhatsAppChat(text)
  if (messages.length === 0) {
    throw new Error("No WhatsApp messages were found. Choose the exported ZIP or TXT file.")
  }

  const analysis = analyzeChat(messages)
  return {
    analysis,
    // The device clock is supplied here once at import; the core computes the
    // right-censored "quiet so far" from it. Nothing in React calculates.
    relationshipRead: buildRelationshipRead(analysis, { nowMs }),
    messages,
  }
}

export function getImportErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "ChatSense could not process this export."
}

function toReport(text: string, sourceName: string): ImportedReport {
  const imported = analyzeImportedText(text)
  return {
    analysis: imported.analysis,
    relationshipRead: imported.relationshipRead,
    messageCount: imported.messages.length,
    sourceName,
  }
}

export function useChatImport(onImported?: () => void): ChatImportState & ChatImportActions {
  const [report, setReport] = useState<ImportedReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Each import and each clear takes a new ticket. A result whose ticket is no
  // longer current (cleared, or superseded by a newer import) is discarded.
  const ticket = useRef(0)

  const importFile = useCallback(
    async (file: File) => {
      const mine = ++ticket.current
      setIsLoading(true)
      setError(null)

      try {
        const text = await readWhatsAppExport(file)
        if (mine !== ticket.current) return
        setReport(toReport(text, file.name))
        onImported?.()
      } catch (err) {
        if (mine === ticket.current) setError(getImportErrorMessage(err))
      } finally {
        if (mine === ticket.current) setIsLoading(false)
      }
    },
    [onImported],
  )

  // The demo runs the exact same parse/analyze pipeline as a real import; the
  // only differences are the committed synthetic source text and the source
  // label shown in the header.
  const importDemo = useCallback(() => {
    const mine = ++ticket.current
    setIsLoading(true)
    setError(null)

    try {
      setReport(toReport(DEMO_EXPORT_TEXT, DEMO_EXPORT_NAME))
      onImported?.()
    } catch (err) {
      setError(getImportErrorMessage(err))
    } finally {
      if (mine === ticket.current) setIsLoading(false)
    }
  }, [onImported])

  const clear = useCallback(() => {
    ticket.current += 1
    setReport(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    analysis: report?.analysis ?? null,
    relationshipRead: report?.relationshipRead ?? null,
    error,
    importFile,
    importDemo,
    isLoading,
    messageCount: report?.messageCount ?? 0,
    setError,
    clear,
    sourceName: report?.sourceName ?? "",
  }
}
