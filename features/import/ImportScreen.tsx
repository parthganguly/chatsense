"use client"

import { useRef } from "react"
import { AlertCircle, Import, Loader2, MessagesSquare, ShieldCheck } from "lucide-react"
import { WHATSAPP_EXPORT_ACCEPT } from "./readWhatsAppExport"

export function ImportScreen({
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
          accept={WHATSAPP_EXPORT_ACCEPT}
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
