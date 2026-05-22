"use client"

import { useState, useRef, type ComponentType } from "react"
import Image from "next/image"
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
  TrendingUp,
  Activity,
  Sparkles,
  MessageSquare,
  Circle,
  HelpCircle,
} from "lucide-react"
import { cn } from "@/utils/cn"
import JSZip from "jszip"
import { parseWhatsAppChat } from "@/lib/chat-parser"
import { analyzeChat, type ChatAnalysis } from "@/lib/chat-analyzer"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type Screen = "welcome" | "import" | "dashboard" | "calendar" | "settings"

export default function ChatSenseApp() {
  const [screen, setScreen] = useState<Screen>("welcome")
  const [activeTab, setActiveTab] = useState<Screen>("dashboard")
  const [analysis, setAnalysis] = useState<ChatAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigateToApp = () => {
    setScreen("dashboard")
    setActiveTab("dashboard")
  }

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)

    try {
      let text: string

      // Handle ZIP files
      if (file.name.endsWith('.zip')) {
        const zip = new JSZip()
        const zipContent = await zip.loadAsync(file)

        // Find .txt file in ZIP
        let txtFile: JSZip.JSZipObject | null = null
        for (const [filename, file] of Object.entries(zipContent.files)) {
          if (filename.endsWith('.txt') && !file.dir) {
            txtFile = file
            break
          }
        }

        if (!txtFile) {
          throw new Error('No .txt file found in the ZIP archive. Please ensure your WhatsApp export contains a .txt file.')
        }

        text = await txtFile.async('string')
      } else if (file.name.endsWith('.txt')) {
        // Handle direct .txt files
        text = await file.text()
      } else {
        throw new Error('Please upload a .txt or .zip file exported from WhatsApp.')
      }

      // Parse chat messages
      const parsedMessages = parseWhatsAppChat(text)

      if (parsedMessages.length === 0) {
        throw new Error('No messages found in the chat file. Please check the file format.')
      }

      // Analyze chat
      const chatAnalysis = analyzeChat(parsedMessages)

      // Store results
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
          accept=".txt,.zip"
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
                  Import your chat
                </h2>
                <p className="mt-1 text-slate-500">Tap to select your WhatsApp .txt or .zip file</p>
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

  const moodPattern: ChatAnalysis["moodPattern"] = analysis?.moodPattern || {
    hasCycle: false,
    cycleLength: 0,
    phases: [],
    description: 'Import a chat file to see mood patterns.',
    moodScores: [],
    currentPhase: {
      phase: 'Unknown',
      confidence: 0,
      advice: 'Import a chat file to see mood phase guidance.',
    },
  }

  const conversationInitiators: ChatAnalysis["conversationInitiators"] = analysis?.conversationInitiators || {
    sender1Starts: 0,
    sender2Starts: 0,
    sender1Percentage: 50,
    description: 'Import a chat file to see conversation initiator stats.',
  }

  const sentimentAnalysis: ChatAnalysis["sentimentAnalysis"] = analysis?.sentimentAnalysis || {
    averageSentiment: 0,
    weeklyTrend: [],
    dailyScores: [],
    description: 'Import a chat file to see sentiment analysis.',
    phaseCorrelation: [],
    actionableInsight: '',
  }

  const turningPoints = analysis?.turningPoints || []
  const personaInsights = analysis?.personaInsights || []
  const guidedAdvice = analysis?.guidedAdvice || []

  // Filter: Only show energy peaks if truly actionable (not just "active at 2 PM")
  const showEnergyPeaks = energyPeaks.description &&
    !energyPeaks.description.includes('most active at') &&
    !energyPeaks.description.includes('No activity') &&
    energyPeaks.description.length > 50 // Only show if substantial description

  return (
    <div className="p-6 space-y-6 pb-24">
      <h1 className="font-lora text-4xl font-bold text-slate-800">Insights</h1>

      {/* Cycle Phase Card - Most Important */}
      {moodPattern.currentPhase && moodPattern.currentPhase.phase !== 'Unknown' && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 backdrop-blur-sm border-2 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <TrendingUp className="h-8 w-8 text-purple-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-lora text-xl font-semibold text-slate-800">
                    Predicted Phase: {moodPattern.currentPhase.phase}
                  </h3>
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full">
                    {moodPattern.currentPhase.confidence}% confidence
                  </span>
                </div>
                <p className="text-slate-700 font-medium mb-2">
                  {moodPattern.currentPhase.advice}
                </p>
                {moodPattern.currentPhase.nextPhase && (
                  <p className="text-sm text-slate-600 mt-2">
                    Next phase: <span className="font-semibold">{moodPattern.currentPhase.nextPhase}</span>
                    {moodPattern.currentPhase.nextPhaseDate && ` (${moodPattern.currentPhase.nextPhaseDate})`}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actionable Sentiment Insight */}
      {sentimentAnalysis.actionableInsight && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm border-2 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <Activity className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-lora text-lg font-semibold text-slate-800 mb-2">
                  Mood & Sentiment Guidance
                </h3>
                <p className="text-slate-700 font-medium">
                  {sentimentAnalysis.actionableInsight}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation Starters - Keep if actionable */}
      <InsightCard
        icon={MessageSquare}
        title="Conversation Starters"
        description={conversationInitiators.description}
        color="text-green-500"
        tooltip="Shows who usually initiates conversations each day."
      />

      {/* Persona-Based Insights */}
      {personaInsights.length > 0 && personaInsights[0].persona !== 'unknown' && (
        personaInsights.map((insight, idx) => {
          const personaColors = {
            romantic: 'from-pink-50 to-rose-50 border-pink-200 text-pink-700',
            boss: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-700',
            family: 'from-green-50 to-emerald-50 border-green-200 text-green-700',
            friend: 'from-purple-50 to-violet-50 border-purple-200 text-purple-700',
            unknown: 'from-gray-50 to-slate-50 border-gray-200 text-gray-700',
          }
          const personaIcons = {
            romantic: Heart,
            boss: Activity,
            family: MessageSquare,
            friend: Zap,
            unknown: Circle,
          }
          const Icon = personaIcons[insight.persona]

          return (
            <Card key={idx} className={`bg-gradient-to-r ${personaColors[insight.persona]} backdrop-blur-sm border-2`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Icon className="h-7 w-7 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-lora text-lg font-semibold capitalize">
                        {insight.persona === 'boss' ? 'Professional' : insight.persona} Relationship
                      </h3>
                      {insight.confidence > 0 && (
                        <span className="text-xs bg-white px-2 py-1 rounded-full font-medium">
                          {insight.confidence}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-slate-800 font-medium mb-2">{insight.advice}</p>
                    <p className="text-xs text-slate-600 italic">{insight.context}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      {/* Guided Advice Cards */}
      {guidedAdvice.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-lora text-2xl font-semibold text-slate-800">Guided Advice</h2>
          {guidedAdvice.map((advice, idx) => {
            const timingColors = {
              now: 'border-green-300 bg-green-50',
              soon: 'border-blue-300 bg-blue-50',
              later: 'border-yellow-300 bg-yellow-50',
              wait: 'border-red-300 bg-red-50',
            }
            const timingLabels = {
              now: 'Act Now',
              soon: 'This Week',
              later: 'Soon',
              wait: 'Wait',
            }

            return (
              <Card key={idx} className={`bg-white/70 backdrop-blur-sm border-2 ${timingColors[advice.timing]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-lora text-lg font-semibold text-slate-800">{advice.title}</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      advice.timing === 'now' ? 'bg-green-200 text-green-800' :
                      advice.timing === 'soon' ? 'bg-blue-200 text-blue-800' :
                      advice.timing === 'later' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-red-200 text-red-800'
                    }`}>
                      {timingLabels[advice.timing]}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium mb-2">{advice.advice}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {advice.phase && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        Phase: {advice.phase}
                      </span>
                    )}
                    {advice.mood && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        advice.mood === 'positive' || advice.mood === 'high'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        Mood: {advice.mood}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 italic">{advice.reasoning}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Enhanced Turning Points with Event Types */}
      {turningPoints.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-lora text-lg font-semibold text-slate-700 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Emotional Events & Turning Points
              </h3>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {turningPoints.slice(0, 6).map((point, idx) => {
                const eventTypeColors: Record<string, string> = {
                  'big talk': 'bg-purple-100 text-purple-700',
                  'argument': 'bg-red-100 text-red-700',
                  'reconnection': 'bg-green-100 text-green-700',
                  'conflict resolved': 'bg-blue-100 text-blue-700',
                }

                return (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 border border-slate-200">
                    <Circle className="h-2 w-2 mt-2 text-orange-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-slate-800">{point.date}</span>
                        {point.phase && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {point.phase}
                          </span>
                        )}
                        {point.eventType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${eventTypeColors[point.eventType] || 'bg-gray-100 text-gray-700'}`}>
                            {point.eventType}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 font-medium mb-1">{point.description}</p>
                      {point.context && (
                        <p className="text-xs text-slate-600">{point.context}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Only show relationship summary if not generic */}
      {relationshipSummary.description &&
       !relationshipSummary.description.includes('balanced connection') &&
       !relationshipSummary.description.includes('No messages') && (
        <InsightCard
          icon={Heart}
          title="Relationship Summary"
          description={relationshipSummary.description}
          color="text-pink-500"
        />
      )}

      {/* Only show conversation style if actionable */}
      {conversationStyle.description &&
       !conversationStyle.description.includes('reply time') &&
       !conversationStyle.description.includes('No') && (
        <InsightCard
          icon={MessageCircle}
          title="Conversation Style"
          description={conversationStyle.description}
          color="text-green-500"
        />
      )}

      {/* Only show energy peaks if not generic */}
      {showEnergyPeaks && (
        <InsightCard
          icon={Zap}
          title="Energy Peaks"
          description={energyPeaks.description}
          color="text-yellow-500"
        />
      )}

      {/* Removed all non-actionable charts: Volume Over Time, Reply Time Distribution, Active Hours Heatmap, Sentiment Over Time (without context) */}

      {/* Mood Over Time - Only show if we have actionable cycle context */}
      {moodPattern.moodScores.length > 0 && moodPattern.hasCycle && (() => {
        const moodChartData = moodPattern.moodScores.slice(-30).map(({ date, score }) => ({
          date: date.split('-').slice(1).join('/'), // Format as MM/DD
          score,
        }))

        return moodChartData.length > 0 ? (
          <Card className="bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              <h3 className="font-lora text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Mood Over Time (Cycle-Aware)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Mood Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : null
      })()}
    </div>
  )
}

const InsightCard = ({
  icon: Icon,
  title,
  description,
  color,
  tooltip,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
  tooltip?: string
}) => (
  <Card className="bg-white/70 backdrop-blur-sm">
    <CardContent className="p-4 flex items-start space-x-4">
      <Icon className={`h-8 w-8 mt-1 flex-shrink-0 ${color}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-lora text-lg font-semibold text-slate-700">{title}</h3>
          {tooltip && (
            <div className="group relative">
              <HelpCircle className="h-4 w-4 text-slate-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {tooltip}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">{description}</p>
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

const EventItem = ({ date, title }: { date: string; title: string }) => (
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

const SettingItem = ({ title, description }: { title: string; description: string }) => (
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
  <div className="bg-white/50 backdrop-blur-lg border-t border-slate-200/80 rounded-b-3xl">
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

const NavItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  onClick: () => void
}) => (
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
