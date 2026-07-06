"use client"

import { useCallback, useState } from "react"
import {
  analyzeChat,
  parseWhatsAppChat,
  type ChatAnalysis,
  type ChatMessage,
} from "@chatsense/core"
import { DEMO_EXPORT_NAME, DEMO_EXPORT_TEXT } from "./demoExport"
import { readWhatsAppExport } from "./readWhatsAppExport"

export type ChatImportState = {
  analysis: ChatAnalysis | null
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

export function analyzeImportedText(text: string): { analysis: ChatAnalysis; messages: ChatMessage[] } {
  const messages = parseWhatsAppChat(text)
  if (messages.length === 0) {
    throw new Error("No WhatsApp messages were found. Choose the exported ZIP or TXT file.")
  }

  return {
    analysis: analyzeChat(messages),
    messages,
  }
}

export function getImportErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "ChatSense could not process this export."
}

export function useChatImport(onImported?: () => void): ChatImportState & ChatImportActions {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
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
    error,
    importFile,
    importDemo,
    isLoading,
    messages,
    setError,
    sourceName,
  }
}
