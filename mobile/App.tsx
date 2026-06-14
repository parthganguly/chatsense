import { useCallback, useEffect, useReducer, useRef } from "react"
import { StatusBar as ExpoStatusBar } from "expo-status-bar"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native"
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import {
  analyzeChat,
  formatDuration,
  parseWhatsAppChat,
  type ActivityPoint,
  type ChatAnalysis,
  type ObservableInsight,
  type ParticipantInsight,
  type ReplyEdge,
} from "@chatsense/core"

import {
  ChatImportError,
  pickChatExport,
  readChatTextFromPickedExport,
  type PickedChatExport,
} from "./src/import/whatsappExport"
import { appReducer, initialAppState, type ImportPhase, type Screen } from "./src/state/appState"
import {
  addIncomingFileListener,
  clearInitialSharedFile,
  getInitialSharedFile,
  type SharedChatExport,
} from "./modules/chatsense-share-intent/src/ChatSenseShareIntentModule"

const tabs: Array<{ screen: Exclude<Screen, "import">; label: string }> = [
  { screen: "overview", label: "Overview" },
  { screen: "rhythm", label: "Rhythm" },
  { screen: "people", label: "People" },
  { screen: "privacy", label: "Privacy" },
]

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  )
}

function AppContent() {
  const [state, dispatch] = useReducer(appReducer, initialAppState)
  const lastIncomingKeyRef = useRef<string | null>(null)
  const session = state.session

  const analyzePickedExport = useCallback(async (picked: PickedChatExport) => {
    dispatch({ type: "file_reading" })
    const text = await readChatTextFromPickedExport(picked)

    dispatch({ type: "analysis_started" })
    await yieldToNative()

    const messages = parseWhatsAppChat(text)
    if (messages.length === 0) {
      throw new ChatImportError(
        "malformed_text",
        "No WhatsApp messages were found in this export.",
      )
    }

    dispatch({
      type: "analysis_succeeded",
      session: {
        sourceName: picked.name,
        messages,
        analysis: analyzeChat(messages),
      },
    })
  }, [])

  const importChatExport = useCallback(async () => {
    dispatch({ type: "import_started" })
    try {
      const picked = await pickChatExport()
      if (!picked) {
        dispatch({ type: "import_canceled" })
        return
      }

      await analyzePickedExport(picked)
    } catch (error) {
      dispatch({
        type: "analysis_failed",
        error:
          error instanceof Error
            ? error.message
          : "ChatSense could not process this export.",
      })
    }
  }, [analyzePickedExport])

  const processIncomingExport = useCallback(
    async (incoming: SharedChatExport) => {
      const incomingKey = `${incoming.uri}|${incoming.receivedAt}`
      if (incomingKey === lastIncomingKeyRef.current) {
        return
      }
      lastIncomingKeyRef.current = incomingKey

      dispatch({ type: "import_started" })
      try {
        await analyzePickedExport({
          uri: incoming.uri,
          name: incoming.name ?? "WhatsApp Chat.zip",
          mimeType: incoming.mimeType ?? undefined,
          size: incoming.size ?? undefined,
          deleteAfterRead: incoming.deleteAfterRead,
        })
        clearInitialSharedFile()
      } catch (error) {
        clearInitialSharedFile()
        dispatch({
          type: "analysis_failed",
          error:
            error instanceof Error
              ? error.message
              : "ChatSense could not process the shared export.",
        })
      }
    },
    [analyzePickedExport],
  )

  useEffect(() => {
    const initialFile = getInitialSharedFile()
    if (initialFile) {
      void processIncomingExport(initialFile)
    }

    const subscription = addIncomingFileListener((incomingFile) => {
      void processIncomingExport(incomingFile)
    })

    return () => {
      subscription.remove()
    }
  }, [processIncomingExport])

  if (state.screen === "import" || !session) {
    return (
      <AppShell>
        <ImportScreen
          error={state.error}
          importPhase={state.importPhase}
          hasPreviousSession={Boolean(session)}
          onImport={() => void importChatExport()}
          onResume={() => dispatch({ type: "navigate", screen: "overview" })}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header
        sourceName={session.sourceName}
        messageCount={session.messages.length}
        onImport={() => void importChatExport()}
        onReset={() => dispatch({ type: "reset" })}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {state.screen === "overview" && <OverviewScreen analysis={session.analysis} />}
        {state.screen === "rhythm" && <RhythmScreen analysis={session.analysis} />}
        {state.screen === "people" && <PeopleScreen analysis={session.analysis} />}
        {state.screen === "privacy" && <PrivacyScreen />}
      </ScrollView>
      <BottomNav
        activeScreen={state.screen}
        onNavigate={(screen) => dispatch({ type: "navigate", screen })}
      />
    </AppShell>
  )
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <View style={styles.app}>{children}</View>
    </SafeAreaView>
  )
}

function ImportScreen({
  error,
  hasPreviousSession,
  importPhase,
  onImport,
  onResume,
}: {
  error: string | null
  hasPreviousSession: boolean
  importPhase: ImportPhase
  onImport: () => void
  onResume: () => void
}) {
  const isBusy = importPhase === "picking" || importPhase === "reading" || importPhase === "analyzing"

  return (
    <View style={styles.importRoot}>
      <View style={styles.brandBlock}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>CS</Text>
        </View>
        <Text style={styles.appTitle}>ChatSense</Text>
        <Text style={styles.appSubtitle}>
          Local WhatsApp behavioral analytics. Import an exported .txt or .zip file.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose WhatsApp chat export"
        disabled={isBusy}
        onPress={onImport}
        style={({ pressed }) => [
          styles.importButton,
          pressed && !isBusy ? styles.pressed : null,
          isBusy ? styles.disabled : null,
        ]}
      >
        {isBusy ? (
          <>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.importTitle}>{importStatusLabel(importPhase)}</Text>
            <Text style={styles.importHint}>No upload. Temporary picker copies are deleted after reading.</Text>
          </>
        ) : (
          <>
            <Text style={styles.importSymbol}>+</Text>
            <Text style={styles.importTitle}>Choose WhatsApp export</Text>
            <Text style={styles.importHint}>Supports raw .txt and .zip exports</Text>
          </>
        )}
      </Pressable>

      {hasPreviousSession && !isBusy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Return to current analysis"
          onPress={onResume}
          style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.secondaryButtonText}>Return to current analysis</Text>
        </Pressable>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Import failed</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.privacyStrip}>
        <Text style={styles.privacyStripText}>
          Everything is analyzed on this device. Patterns are observations, not proof of hidden intent.
        </Text>
      </View>
    </View>
  )
}

function Header({
  messageCount,
  onImport,
  onReset,
  sourceName,
}: {
  messageCount: number
  onImport: () => void
  onReset: () => void
  sourceName: string
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitleBlock}>
        <Text style={styles.headerTitle}>ChatSense</Text>
        <Text numberOfLines={1} style={styles.headerSubtitle}>
          {formatNumber(messageCount)} messages from {sourceName}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Import another chat export"
          onPress={onImport}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.iconButtonText}>Import</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear current analysis"
          onPress={onReset}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.iconButtonText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  )
}

function OverviewScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { overview, replyDynamics, silenceSummary, insights } = analysis

  return (
    <View style={styles.screen}>
      <SectionHeading eyebrow="Imported export" title="What stands out" />
      <View style={styles.metricGrid}>
        <MetricTile label="Messages" value={formatNumber(overview.messageCount)} accent="teal" />
        <MetricTile label="Participants" value={formatNumber(overview.participantCount)} accent="blue" />
        <MetricTile label="Active days" value={formatNumber(overview.activeDays)} accent="amber" />
        <MetricTile label="Total words" value={formatNumber(overview.totalWords)} accent="slate" />
        <MetricTile
          label="Avg messages / day"
          value={formatNumber(overview.avgMessagesPerActiveDay)}
          accent="teal"
        />
        <MetricTile
          label="Median reply"
          value={formatDuration(replyDynamics.medianReplyMinutes)}
          accent="blue"
        />
      </View>

      <SectionHeading eyebrow="Observed patterns" title="Useful signals" />
      <View style={styles.listBlock}>
        {insights.length > 0 ? (
          insights.map((insight) => <InsightRow key={insight.title} insight={insight} />)
        ) : (
          <Text style={styles.emptyText}>Not enough messages for pattern detection yet.</Text>
        )}
      </View>

      <SectionHeading eyebrow="Reply rhythm" title="How quickly replies arrive" />
      <View style={styles.stack}>
        <ProgressRow label="Within 1 hour" value={replyDynamics.withinOneHourRate} />
        <ProgressRow label="Within 6 hours" value={replyDynamics.withinSixHoursRate} />
        <ProgressRow label="Within 24 hours" value={replyDynamics.withinDayRate} />
      </View>
      <Text style={styles.caption}>
        Based on {formatNumber(replyDynamics.replyCount)} sender-switch replies in the exported history.
      </Text>

      <View style={styles.noteBlock}>
        <Text style={styles.noteText}>
          Coverage: {formatDate(overview.startedAt)} to {formatDate(overview.endedAt)}. Longest silence:
          {" "}
          {formatDuration(silenceSummary.longestSilenceMinutes)}.
        </Text>
      </View>
    </View>
  )
}

function RhythmScreen({ analysis }: { analysis: ChatAnalysis }) {
  const { activity, replyDynamics, silenceSummary, threadCount } = analysis

  return (
    <View style={styles.screen}>
      <SectionHeading eyebrow="Time series" title="Conversation rhythm" />
      <View style={styles.metricGrid}>
        <MetricTile label="Recent trend" value={formatTrend(activity.recentTrend)} accent="teal" />
        <MetricTile label="Threads" value={formatNumber(threadCount)} accent="blue" />
        <MetricTile label="Peak hour" value={formatHour(activity.peakHour)} accent="amber" />
        <MetricTile label="Peak weekday" value={activity.peakDay || "No data"} accent="slate" />
      </View>

      <SectionHeading eyebrow="Last 30 days in export" title="Daily message volume" />
      <MiniBars points={activity.dailyCounts} />

      <SectionHeading eyebrow="Across the week" title="Active days" />
      <View style={styles.stack}>
        {activity.weekdayCounts.map((day) => (
          <ProgressRow
            key={day.label}
            label={day.label.slice(0, 3)}
            max={Math.max(...activity.weekdayCounts.map((point) => point.count), 1)}
            value={day.count}
            valueLabel={formatNumber(day.count)}
          />
        ))}
      </View>

      <SectionHeading eyebrow="Silence gaps" title="Unusual pauses" />
      <View style={styles.listBlock}>
        <DataRow label="Longest observed gap" value={formatDuration(silenceSummary.longestSilenceMinutes)} />
        <DataRow label="Unusual gaps" value={formatNumber(silenceSummary.unusualSilenceCount)} />
        <DataRow
          label="Chat-specific threshold"
          value={formatDuration(silenceSummary.unusualSilenceThresholdMinutes)}
        />
        <DataRow label="Average reply" value={formatDuration(replyDynamics.avgReplyMinutes)} />
        <DataRow label="Night message rate" value={`${activity.nightMessageRate}%`} />
      </View>
      <Text style={styles.caption}>
        A pause is flagged only when it is unusually long relative to this chat's own history.
      </Text>
    </View>
  )
}

function PeopleScreen({ analysis }: { analysis: ChatAnalysis }) {
  const maxMessages = Math.max(
    ...analysis.participants.map((participant) => participant.messageCount),
    1,
  )

  return (
    <View style={styles.screen}>
      <SectionHeading
        eyebrow={`${analysis.participants.length} participants`}
        title="Who contributes"
      />
      <View style={styles.stack}>
        {analysis.participants.map((participant) => (
          <ParticipantCard
            key={participant.sender}
            maxMessages={maxMessages}
            participant={participant}
          />
        ))}
      </View>

      <SectionHeading eyebrow="Sender switches" title="Who replies to whom" />
      <View style={styles.listBlock}>
        {analysis.replyEdges.length > 0 ? (
          analysis.replyEdges
            .slice(0, 12)
            .map((edge) => <ReplyEdgeRow key={`${edge.from}-${edge.to}`} edge={edge} />)
        ) : (
          <Text style={styles.emptyText}>No sender-switch replies were found.</Text>
        )}
      </View>
      <Text style={styles.caption}>
        A reply edge is counted when one participant sends the next message after another participant.
      </Text>
    </View>
  )
}

function PrivacyScreen() {
  return (
    <View style={styles.screen}>
      <SectionHeading eyebrow="Local-only" title="Privacy and limits" />
      <View style={styles.listBlock}>
        <PrivacyRow title="No upload" detail="ChatSense analyzes the selected export on this device." />
        <PrivacyRow title="No account" detail="There is no sign-in, cloud sync, or analytics SDK." />
        <PrivacyRow
          title="No persistent chat storage"
          detail="Imported content is kept in memory for the current app session only."
        />
        <PrivacyRow
          title="No diagnosis"
          detail="Reply delays and imbalance are observed communication patterns, not proof of intent or mental health."
        />
        <PrivacyRow
          title="Python stays offline"
          detail="The research package is not bundled into the Android runtime."
        />
      </View>
      <View style={styles.noteBlock}>
        <Text style={styles.noteText}>
          Closing or clearing the app removes the current in-memory analysis. Re-import the export to analyze it again.
        </Text>
      </View>
    </View>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

function MetricTile({
  accent,
  label,
  value,
}: {
  accent: "amber" | "blue" | "slate" | "teal"
  label: string
  value: string
}) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.accentLine, accentStyles[accent]]} />
      <Text numberOfLines={2} adjustsFontSizeToFit style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function InsightRow({ insight }: { insight: ObservableInsight }) {
  const tone = insight.tone === "watch" ? styles.watchTone : insight.tone === "pattern" ? styles.patternTone : styles.contextTone
  return (
    <View style={styles.insightRow}>
      <View style={[styles.toneDot, tone]} />
      <View style={styles.flex}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <Text style={styles.insightDetail}>{insight.detail}</Text>
      </View>
    </View>
  )
}

function ParticipantCard({
  maxMessages,
  participant,
}: {
  maxMessages: number
  participant: ParticipantInsight
}) {
  return (
    <View style={styles.participantCard}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={styles.participantName}>
            {participant.sender}
          </Text>
          <Text style={styles.participantMeta}>
            {formatNumber(participant.wordCount)} words | {formatNumber(participant.initiationCount)} thread starts
          </Text>
        </View>
        <Text style={styles.shareText}>{participant.messageShare}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(2, (participant.messageCount / maxMessages) * 100)}%` as DimensionValue,
            },
          ]}
        />
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.metaText}>{formatNumber(participant.messageCount)} messages</Text>
        <Text style={styles.metaText}>median reply {formatDuration(participant.medianReplyMinutes)}</Text>
      </View>
    </View>
  )
}

function ReplyEdgeRow({ edge }: { edge: ReplyEdge }) {
  return (
    <View style={styles.edgeRow}>
      <Text numberOfLines={1} style={styles.edgeName}>
        {edge.from}
      </Text>
      <Text style={styles.edgeArrow}>{"->"}</Text>
      <Text numberOfLines={1} style={styles.edgeNameMuted}>
        {edge.to}
      </Text>
      <Text style={styles.edgeCount}>{formatNumber(edge.count)}</Text>
    </View>
  )
}

function PrivacyRow({ detail, title }: { detail: string; title: string }) {
  return (
    <View style={styles.privacyRow}>
      <Text style={styles.privacyTitle}>{title}</Text>
      <Text style={styles.privacyDetail}>{detail}</Text>
    </View>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
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
  const width = `${Math.max(0, Math.min(100, (value / max) * 100))}%` as DimensionValue
  return (
    <View>
      <View style={styles.rowBetween}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{valueLabel ?? `${value}%`}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width }]} />
      </View>
    </View>
  )
}

function MiniBars({ points }: { points: ActivityPoint[] }) {
  const maxCount = Math.max(...points.map((point) => point.count), 1)

  return (
    <View style={styles.barBlock}>
      <View style={styles.barChart}>
        {points.map((point) => (
          <View key={point.label} style={styles.barSlot}>
            <View
              accessibilityLabel={`${point.label}: ${point.count} messages`}
              style={[
                styles.bar,
                { height: `${Math.max(4, (point.count / maxCount) * 100)}%` },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.metaText}>{points.at(0)?.label ?? ""}</Text>
        <Text style={styles.metaText}>{points.at(-1)?.label ?? ""}</Text>
      </View>
    </View>
  )
}

function BottomNav({
  activeScreen,
  onNavigate,
}: {
  activeScreen: Screen
  onNavigate: (screen: Exclude<Screen, "import">) => void
}) {
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, 10)

  return (
    <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
      {tabs.map((tab) => {
        const active = activeScreen === tab.screen
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.screen}
            onPress={() => onNavigate(tab.screen)}
            style={({ pressed }) => [
              styles.navItem,
              active ? styles.navItemActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.navText, active ? styles.navTextActive : null]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function importStatusLabel(phase: ImportPhase): string {
  if (phase === "picking") return "Opening file picker"
  if (phase === "reading") return "Reading export"
  if (phase === "analyzing") return "Analyzing behavior"
  return "Preparing import"
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
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

function yieldToNative(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const accentStyles = StyleSheet.create({
  amber: { backgroundColor: "#d97706" },
  blue: { backgroundColor: "#2563eb" },
  slate: { backgroundColor: "#475569" },
  teal: { backgroundColor: "#0f766e" },
})

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8faf8",
  },
  app: {
    flex: 1,
    backgroundColor: "#f8faf8",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  importRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  brandBlock: {
    marginBottom: 34,
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    marginBottom: 16,
    width: 48,
  },
  logoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  appTitle: {
    color: "#0f172a",
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: 0,
  },
  appSubtitle: {
    color: "#475569",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 360,
  },
  importButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#0f766e",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 188,
    padding: 22,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.76,
  },
  importSymbol: {
    color: "#0f766e",
    fontSize: 44,
    fontWeight: "300",
    lineHeight: 48,
  },
  importTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 14,
    textAlign: "center",
  },
  importHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  secondaryButtonText: {
    color: "#0f766e",
    fontSize: 14,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "800",
  },
  errorText: {
    color: "#7f1d1d",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  privacyStrip: {
    borderColor: "#dbe6e1",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 28,
    paddingTop: 16,
  },
  privacyStripText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  header: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    alignItems: "center",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  iconButtonText: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "800",
  },
  screen: {
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  sectionHeading: {
    gap: 4,
    marginTop: 4,
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricTile: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 112,
    padding: 14,
    width: "48%",
  },
  accentLine: {
    borderRadius: 999,
    height: 3,
    marginBottom: 18,
    width: 34,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: 0,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  listBlock: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  insightRow: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  toneDot: {
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  watchTone: {
    backgroundColor: "#d97706",
  },
  patternTone: {
    backgroundColor: "#0f766e",
  },
  contextTone: {
    backgroundColor: "#2563eb",
  },
  insightTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  insightDetail: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    padding: 14,
  },
  stack: {
    gap: 13,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  progressValue: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
  },
  progressTrack: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    height: 8,
    marginTop: 7,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#0f766e",
    borderRadius: 999,
    height: "100%",
  },
  caption: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  noteBlock: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  noteText: {
    color: "#1e3a8a",
    fontSize: 12,
    lineHeight: 18,
  },
  dataRow: {
    alignItems: "center",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dataLabel: {
    color: "#475569",
    flex: 1,
    fontSize: 13,
  },
  dataValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
  },
  barBlock: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  barChart: {
    alignItems: "flex-end",
    borderBottomColor: "#cbd5e1",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 3,
    height: 130,
  },
  barSlot: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    minWidth: 4,
  },
  bar: {
    backgroundColor: "#0f766e",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    width: "100%",
  },
  participantCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  participantName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  participantMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  shareText: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "800",
  },
  metaText: {
    color: "#64748b",
    fontSize: 11,
  },
  edgeRow: {
    alignItems: "center",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  edgeName: {
    color: "#0f172a",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  edgeNameMuted: {
    color: "#475569",
    flex: 1,
    fontSize: 13,
  },
  edgeArrow: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
  },
  edgeCount: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "800",
  },
  privacyRow: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  privacyTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
  },
  privacyDetail: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  bottomNav: {
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e8f0",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 62,
  },
  navItemActive: {
    backgroundColor: "#ecfdf5",
  },
  navText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
  },
  navTextActive: {
    color: "#0f766e",
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
})
