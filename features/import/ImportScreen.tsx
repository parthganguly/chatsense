"use client"

import { useRef, type ReactNode } from "react"
import {
  AlertCircle,
  Eye,
  EyeOff,
  Import,
  ListOrdered,
  Loader2,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import {
  ONBOARDING_CANNOT_TELL,
  ONBOARDING_DEMO,
  ONBOARDING_EXPORT_STEPS,
  ONBOARDING_PRIVACY,
  ONBOARDING_PROMISE,
  ONBOARDING_WHAT_YOU_SEE,
} from "./onboardingCopy"
import { WHATSAPP_EXPORT_ACCEPT } from "./readWhatsAppExport"

export function ImportScreen({
  error,
  isLoading,
  onFileUpload,
  onDemoImport,
}: {
  error: string | null
  isLoading: boolean
  onFileUpload: (file: File) => void
  onDemoImport: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="h-full overflow-y-auto bg-[#f8faf8]">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-5 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <header>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <MessagesSquare className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">ChatSense</h1>
          <p className="mt-2 max-w-sm text-base leading-6 text-slate-600">{ONBOARDING_PROMISE}</p>
        </header>

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

        <section aria-label="Import actions">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed border-emerald-500 bg-white px-6 py-6 text-center shadow-sm transition hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-9 w-9 animate-spin text-emerald-700" />
                <span className="mt-3 text-lg font-semibold">Analyzing export</span>
                <span className="mt-1 text-sm text-slate-500">Everything stays on this device</span>
              </>
            ) : (
              <>
                <Import className="h-9 w-9 text-emerald-700" />
                <span className="mt-3 text-lg font-semibold">Choose WhatsApp export</span>
                <span className="mt-1 text-sm text-slate-500">ZIP or TXT</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onDemoImport}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
          >
            <Sparkles className="h-4 w-4 text-emerald-700" aria-hidden="true" />
            {ONBOARDING_DEMO.button}
          </button>
          <p className="mt-2 text-center text-xs leading-5 text-slate-500">{ONBOARDING_DEMO.note}</p>

          {error && (
            <div className="mt-4 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </section>

        <OnboardingCard icon={<Eye className="h-4 w-4 text-emerald-700" aria-hidden="true" />} title={ONBOARDING_WHAT_YOU_SEE.title}>
          <p className="text-sm leading-6 text-slate-600">{ONBOARDING_WHAT_YOU_SEE.intro}</p>
          <ul className="mt-3 space-y-1.5">
            {ONBOARDING_WHAT_YOU_SEE.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2 text-sm leading-5 text-slate-600">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                <span className="min-w-0">{bullet}</span>
              </li>
            ))}
          </ul>
        </OnboardingCard>

        <OnboardingCard icon={<EyeOff className="h-4 w-4 text-amber-700" aria-hidden="true" />} title={ONBOARDING_CANNOT_TELL.title}>
          {ONBOARDING_CANNOT_TELL.lines.map((line) => (
            <p key={line} className="mt-1 text-sm leading-6 text-slate-600 first:mt-0">
              {line}
            </p>
          ))}
        </OnboardingCard>

        <OnboardingCard icon={<ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />} title={ONBOARDING_PRIVACY.title}>
          {ONBOARDING_PRIVACY.lines.map((line) => (
            <p key={line} className="mt-1 text-sm leading-6 text-slate-600 first:mt-0">
              {line}
            </p>
          ))}
        </OnboardingCard>

        <OnboardingCard icon={<ListOrdered className="h-4 w-4 text-emerald-700" aria-hidden="true" />} title={ONBOARDING_EXPORT_STEPS.title}>
          <ol className="space-y-1.5">
            {ONBOARDING_EXPORT_STEPS.steps.map((step, index) => (
              <li key={step} className="flex gap-2 text-sm leading-5 text-slate-600">
                <span className="w-4 shrink-0 font-semibold text-emerald-800">{index + 1}.</span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs leading-5 text-slate-500">{ONBOARDING_EXPORT_STEPS.note}</p>
        </OnboardingCard>

        <footer className="flex items-center gap-2 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          <span>No upload. No account. Patterns are observations, not proof of intent.</span>
        </footer>
      </div>
    </div>
  )
}

function OnboardingCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        {icon}
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}
