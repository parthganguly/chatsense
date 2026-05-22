"use client"

import { useEffect, useState, useRef } from "react"
import Image from "next/image"
import JSZip from "jszip"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  UploadCloud,
  ShieldCheck,
  LayoutGrid,
  CalendarDays,
  Settings,
  Heart,
  MessageCircle,
  Zap,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { parseWhatsAppChat, type ChatMessage } from "@/lib/chat-parser"
import { analyzeChat, type ChatAnalysis } from "@/lib/chat-analyzer"

type Screen = "welcome" | "import" | "dashboard" | "calendar" | "settings"

type SharedFileEvent = CustomEvent<{
  name?: string
  mimeType?: string
  base64?: string
}>

export default function ChatSenseApp() {
  const [screen, setScreen] = useState<Screen>("welcome")
  const [activeTab, setActiveTab] = useState<Screen>("dashboard")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigateToApp = () => {
    setScreen("dashboard")
    setActiveTab("dashboard")
  }

  const processChatFile = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      const text = await readWhatsAppExport(file)
      
      // Parse chat messages
      const parsedMessages = parseWhatsAppChat(text)
      
      if (parsedMessages.length === 0) {
        throw new Error('No messages found in the chat file. Please check the file format.')
      }

      // Analyze chat
      const chatAnalysis = analyzeChat(parsedMessages)

      // Store results
      setMessages(parsedMessages)
      setAnalysis(chatAnalysis)

      // Navigate to dashboard
      navigateToApp()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process chat file.')
      console.error('Error processing chat file:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    await processChatFile(file)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleSharedFile = (event: Event) => {
      const { name, mimeType, base64 } = (event as SharedFileEvent).detail || {}
      if (!base64) return

      try {
        const bytes = base64ToBytes(base64)
        const file = new File([bytes], name || "WhatsApp Chat.zip", {
          type: mimeType || "application/zip",
        })
        void processChatFile(file)
      } catch {
        setError("ChatSense could not read the shared WhatsApp export. Please try selecting the ZIP manually.")
      }
    }

    window.addEventListener("chatsense-shared-file", handleSharedFile)

    return () => {
      window.removeEventListener("chatsense-shared-file", handleSharedFile)
    }
  })

  const renderScreen = () => {
    if (screen === "welcome") {
      return <WelcomeScreen onGetStarted={() => setScreen("import")} />
    }
    if (screen === "import") {
      return (
        <ImportScreen
          onFileUpload={handleFileUpload}
          isLoading={isLoading}
          error={error}
        />
      )
    }

    // Main app view with bottom navigation
    return (
      <div className="flex flex-col h-full">
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === "dashboard" && <DashboardScreen analysis={analysis} />}
              {activeTab === "calendar" && <CalendarScreen />}
              {activeTab === "settings" && <SettingsScreen />}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        {renderScreen()}
      </motion.div>
    </AnimatePresence>
  )
}

async function readWhatsAppExport(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith(".txt")) {
    return file.text()
  }

  if (fileName.endsWith(".zip") || file.type.includes("zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const chatFile = Object.values(zip.files).find((entry) => {
      const name = entry.name.toLowerCase()
      return !entry.dir && name.endsWith(".txt") && name.includes("whatsapp chat")
    }) || Object.values(zip.files).find((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".txt"))

    if (!chatFile) {
      throw new Error("No WhatsApp chat .txt file was found inside this ZIP.")
    }

    return chatFile.async("string")
  }

  throw new Error("Please select the WhatsApp chat export ZIP, or the .txt file inside it.")
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

const WelcomeScreen = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <div className="flex flex-col h-full justify-center items-center text-center p-8 bg-gradient-to-b from-blue-50 to-transparent">
    <motion.h1
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, type: "spring" }}
      className="font-garamond text-6xl font-bold text-slate-800"
    >
      ChatSense
    </motion.h1>
    <motion.p
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-4 font-sans text-base text-slate-600 max-w-xs"
    >
      Decode your WhatsApp chats. Understand moods. Enhance connections.
    </motion.p>
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="mt-12"
    >
      <Button
        onClick={onGetStarted}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full px-10 py-6 text-lg shadow-lg shadow-blue-500/30"
      >
        Get Started
      </Button>
    </motion.div>
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="absolute bottom-8 flex items-center space-x-2 text-slate-500"
    >
      <p className="text-xs">Published by</p>
      <Image src="/logo.png" alt="The Great Parthicle Logo" width={24} height={24} className="bg-black rounded-full" />
      <p className="text-sm font-semibold">The Great Parthicle</p>
    </motion.div>
  </div>
)

const ImportScreen = ({
  onFileUpload,
  isLoading,
  error,
}: {
  onFileUpload: (file: File) => void
  isLoading: boolean
  error: string | null
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const handleCardClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="flex flex-col h-full justify-center items-center text-center p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.txt,application/zip,text/plain"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Card
          onClick={handleCardClick}
          className={cn(
            "w-full border-2 border-dashed border-blue-300 bg-blue-50/50 transition-colors",
            isLoading ? "cursor-wait opacity-60" : "hover:bg-blue-100/50 cursor-pointer"
          )}
        >
          <CardContent className="p-12">
            {isLoading ? (
              <>
                <Loader2 className="mx-auto h-16 w-16 text-blue-500 animate-spin" />
                <h2 className="mt-4 font-lora text-2xl font-semibold text-slate-800">
                  Processing your chat...
                </h2>
                <p className="mt-1 text-slate-500">This may take a moment</p>
              </>
            ) : (
              <>
                <UploadCloud className="mx-auto h-16 w-16 text-blue-500" />
                <h2 className="mt-4 font-lora text-2xl font-semibold text-slate-800">
                  Choose WhatsApp export
                </h2>
                <p className="mt-1 text-slate-500">Tap and pick the ZIP WhatsApp creates</p>
              </>
            )}
          </CardContent>
        </Card>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
          >
            <AlertCircle className="h-5 w-5 mr-2" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
        <div className="mt-6 flex items-center justify-center text-green-700">
          <ShieldCheck className="h-5 w-5 mr-2" />
          <p className="text-sm">Your data stays private. Always.</p>
        </div>
      </motion.div>
    </div>
  )
}

const DashboardScreen = ({ analysis }: { analysis: ChatAnalysis | null }) => {
  // Use default data if no analysis available
  const relationshipSummary = analysis?.relationshipSummary || {
    strength: 0,
    balance: 50,
    description: 'Import a chat file to see relationship insights.',
  }

  const conversationStyle = analysis?.conversationStyle || {
    avgReplyTime: 0,
    quickReplyRate: 0,
    description: 'Import a chat file to see conversation style insights.',
  }

  const energyPeaks = analysis?.energyPeaks || {
    peakHour: 12,
    peakDay: 'Monday',
    description: 'Import a chat file to see activity patterns.',
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="font-lora text-4xl font-bold text-slate-800">Insights</h1>
      <InsightCard
        icon={Heart}
        title="Relationship Summary"
        description={relationshipSummary.description}
        color="text-pink-500"
      />
      <InsightCard
        icon={MessageCircle}
        title="Conversation Style"
        description={conversationStyle.description}
        color="text-green-500"
      />
      <InsightCard
        icon={Zap}
        title="Energy Peaks"
        description={energyPeaks.description}
        color="text-yellow-500"
      />
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardContent className="p-4">
          <h3 className="font-lora text-lg font-semibold text-slate-700 mb-2">Mood Waveform</h3>
          <div className="h-24 overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
              <motion.path
                d="M0,50 C50,20 100,80 150,50 C200,20 250,80 300,50"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const InsightCard = ({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
}) => (
  <Card className="bg-white/70 backdrop-blur-sm">
    <CardContent className="p-4 flex items-start space-x-4">
      <Icon className={`h-8 w-8 mt-1 flex-shrink-0 ${color}`} />
      <div>
        <h3 className="font-lora text-lg font-semibold text-slate-700">{title}</h3>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>
    </CardContent>
  </Card>
)

const CalendarScreen = () => {
  const days = ["S", "M", "T", "W", "T", "F", "S"]
  const dates = Array.from({ length: 35 }, (_, i) => i - 2)
  const highlightedDates = [10, 15, 28]

  return (
    <div className="p-6">
      <h1 className="font-lora text-4xl font-bold text-slate-800 mb-6">Calendar</h1>
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center mb-4">
            <h3 className="font-lora text-xl font-semibold text-slate-700">July 2025</h3>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {days.map((day) => (
              <div key={day} className="font-bold text-sm text-slate-500">
                {day}
              </div>
            ))}
            {dates.map((date) => (
              <div
                key={date}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-full",
                  date < 1 && "text-transparent",
                  highlightedDates.includes(date) && "bg-blue-500 text-white font-bold",
                )}
              >
                {date > 0 && date}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="mt-6 space-y-3">
        <p className="font-lora text-lg font-semibold text-slate-700">Upcoming Events</p>
        <EventItem date="July 10" title="Coffee with Alice" />
        <EventItem date="July 15" title="Project Deadline" />
        <EventItem date="July 28" title="Dinner reservation" />
      </div>
    </div>
  )
}

const EventItem = ({ date, title }) => (
  <Card className="bg-white/70 backdrop-blur-sm">
    <CardContent className="p-3 flex items-center justify-between">
      <div>
        <p className="font-semibold text-slate-700">{title}</p>
        <p className="text-sm text-slate-500">{date}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400" />
    </CardContent>
  </Card>
)

const SettingsScreen = () => (
  <div className="p-6">
    <h1 className="font-lora text-4xl font-bold text-slate-800 mb-6">Settings</h1>
    <Card className="bg-white/70 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4 divide-y divide-slate-200">
        <SettingItem title="Enable Cloud Sync" description="Sync insights across devices (optional)." />
        <SettingItem title="Dark Mode" description="Easier on the eyes at night." />
        <SettingItem title="Notifications" description="Get notified about new insights." />
      </CardContent>
    </Card>
    <div className="mt-6 text-center text-slate-500 text-sm">
      <p>ChatSense v1.0</p>
      <p>Made with ❤️ by The Great Parthicle</p>
    </div>
  </div>
)

const SettingItem = ({ title, description }) => (
  <div className="flex items-center justify-between pt-4 first:pt-0">
    <div>
      <Label htmlFor={title} className="font-semibold text-slate-700 text-base">
        {title}
      </Label>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    <Switch id={title} />
  </div>
)

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: Screen; setActiveTab: (tab: Screen) => void }) => (
  <div className="bg-white/50 backdrop-blur-lg border-t border-slate-200/80 md:rounded-b-3xl pb-[env(safe-area-inset-bottom)]">
    <div className="flex justify-around p-2">
      <NavItem
        icon={LayoutGrid}
        label="Insights"
        isActive={activeTab === "dashboard"}
        onClick={() => setActiveTab("dashboard")}
      />
      <NavItem
        icon={CalendarDays}
        label="Calendar"
        isActive={activeTab === "calendar"}
        onClick={() => setActiveTab("calendar")}
      />
      <NavItem
        icon={Settings}
        label="Settings"
        isActive={activeTab === "settings"}
        onClick={() => setActiveTab("settings")}
      />
    </div>
  </div>
)

const NavItem = ({ icon: Icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center w-20 h-16 rounded-2xl transition-colors duration-300",
      isActive ? "text-blue-500" : "text-slate-500 hover:bg-blue-100/50",
    )}
  >
    <Icon className="h-6 w-6" />
    <span className="text-xs mt-1 font-medium">{label}</span>
    {isActive && <motion.div layoutId="active-indicator" className="h-1 w-8 bg-blue-500 rounded-full mt-1" />}
  </button>
)
