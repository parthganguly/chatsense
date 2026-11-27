"use client"

import { useCallback, useState } from "react"
import {
  analyzeChat,
  buildRelationshipRead,
  parseWhatsAppChat,
  type ChatAnalysis,
  type ChatMessage,
  type RelationshipRead,
} from "@chatsense/core"
import { DEMO_EXPORT_NAME, DEMO_EXPORT_TEXT } from "./demoExport"
import { ImportError, isImportError, readWhatsAppExport } from "./readWhatsAppExport"

export type ChatImportState = {
  analysis: ChatAnalysis | null
  relationshipRead: RelationshipRead | null
  error: string | null
  isLoading: boolean
  messages: ChatMessage[]
  sourceName: string
}

export type ChatImportActions = {
  importFile(file: File): Promise<void>
  importDemo(): void
  setError(message: string | null): void
}

export function analyzeImportedText(
  text: string,
  nowMs: number | null = Date.now(),
): { analysis: ChatAnalysis; relationshipRead: RelationshipRead; messages: ChatMessage[] } {
  const messages = parseWhatsAppChat(text)
  if (messages.length === 0) {
    throw new ImportError("No WhatsApp messages were found. Choose the exported ZIP or TXT file.")
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

export const IMPORT_FALLBACK_MESSAGE = "ChatSense could not process this export."

// Only explicitly authored ImportError messages reach the UI; unknown
// reader/engine errors (File API, JSZip, parser, analyzer) get the safe fallback.
export function getImportErrorMessage(error: unknown): string {
  return isImportError(error) ? error.message : IMPORT_FALLBACK_MESSAGE
}

export function useChatImport(onImported?: () => void): ChatImportState & ChatImportActions {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
  const [relationshipRead, setRelationshipRead] = useState<RelationshipRead | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      setError(null)

      try {
        const text = await readWhatsAppExport(file)
        const imported = analyzeImportedText(text)
        setMessages(imported.messages)
        setAnalysis(imported.analysis)
        setRelationshipRead(imported.relationshipRead)
        setSourceName(file.name)
        onImported?.()
      } catch (err) {
        setError(getImportErrorMessage(err))
      } finally {
        setIsLoading(false)
      }
    },
    [onImported],
  )

  // The demo runs the exact same parse/analyze pipeline as a real import; the
  // only differences are the committed synthetic source text and the source
  // label shown in the header.
  const importDemo = useCallback(() => {
    setIsLoading(true)
    setError(null)

    try {
      const imported = analyzeImportedText(DEMO_EXPORT_TEXT)
      setMessages(imported.messages)
      setAnalysis(imported.analysis)
      setRelationshipRead(imported.relationshipRead)
      setSourceName(DEMO_EXPORT_NAME)
      onImported?.()
    } catch (err) {
      setError(getImportErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [onImported])

  return {
    analysis,
    relationshipRead,
    error,
    importFile,
    importDemo,
    isLoading,
    messages,
    setError,
    sourceName,
  }
}
