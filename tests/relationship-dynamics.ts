import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { analyzeChat, parseWhatsAppChat, type RelationshipDynamics } from "@chatsense/core"

function fixture(name: string): string {
  return readFileSync(path.join(process.cwd(), "fixtures", "whatsapp", `${name}.txt`), "utf8")
}

function dynamicsForFixture(name: string): RelationshipDynamics {
  return analyzeChat(parseWhatsAppChat(fixture(name))).relationshipDynamics
}

function participant(dynamics: RelationshipDynamics, sender: string) {
  const result = dynamics.participantSummaries.find((item) => item.sender === sender)
  assert.ok(result, `Expected participant ${sender}`)
  return result
}

function change(
  dynamics: RelationshipDynamics,
  comparison: "earlyLate" | "recentPrior",
  metric: string,
  sender: string | null,
) {
  const result = dynamics[comparison].changes.find((item) => item.metric === metric && item.sender === sender)
  assert.ok(result, `Expected ${comparison} change ${metric} for ${sender ?? "export"}`)
  return result
}

function run() {
  testCompleteStage4FixtureMatrixExists()
  testAdaptiveWindowsAndEvidencePeriods()
  testConversationalTurnsAndBoundaries()
  testReconnectionsFollowUpsAndOpenTurns()
  testEvidenceSafeMetricChanges()
  testUiLabelsAreStage4Accurate()
  testDynamicsAreSemanticContentIndependent()
  console.log("Relationship dynamics tests passed.")
}

function testCompleteStage4FixtureMatrixExists() {
  const fixtureNames = readdirSync(path.join(process.cwd(), "fixtures", "whatsapp"))
    .filter((name) => name.startsWith("stage4_") && name.endsWith(".txt"))
    .sort()

  assert.deepEqual(fixtureNames, [
    "stage4_balanced_then_one_sided.txt",
    "stage4_exact_boundaries.txt",
    "stage4_final_open_turn.txt",
    "stage4_followup_15_min_boundary.txt",
    "stage4_group_reply_edges.txt",
    "stage4_increasing_initiation.txt",
    "stage4_insufficient_export.txt",
    "stage4_multi_reconnectors.txt",
    "stage4_partial_final_window.txt",
    "stage4_reply_slowdown.txt",
    "stage4_same_sender_burst_turn.txt",
    "stage4_six_hour_thread_boundary.txt",
  ])
}

function testAdaptiveWindowsAndEvidencePeriods() {
  const dynamics = dynamicsForFixture("stage4_balanced_then_one_sided")

  assert.equal(dynamics.windowSizeDays, 7)
  assert.equal(dynamics.adaptiveWindows.length, 6)
  assert.deepEqual(
    dynamics.adaptiveWindows.map((bucket) => [bucket.start, bucket.end, bucket.partial, bucket.eligible]),
    [
      ["2026-03-01", "2026-03-07", false, true],
      ["2026-03-08", "2026-03-14", false, true],
      ["2026-03-15", "2026-03-21", false, true],
      ["2026-03-22", "2026-03-28", false, true],
      ["2026-03-29", "2026-04-04", false, true],
      ["2026-04-05", "2026-04-06", true, true],
    ],
  )
  assert.deepEqual(
    dynamics.adaptiveWindows.map((bucket) => [bucket.messageCount, bucket.activeDays, bucket.threadCount]),
    [
      [21, 3, 3],
      [21, 3, 3],
      [21, 3, 3],
      [21, 3, 3],
      [21, 3, 3],
      [20, 2, 2],
    ],
  )
  assert.equal(dynamics.earlyLate.available, true)
  assert.deepEqual(dynamics.earlyLate.earlierPeriod.windowIndices, [0, 1])
  assert.deepEqual(dynamics.earlyLate.laterPeriod.windowIndices, [4, 5])
  assert.equal(dynamics.recentPrior.available, true)
  assert.deepEqual(dynamics.recentPrior.earlierPeriod.windowIndices, [4])
  assert.deepEqual(dynamics.recentPrior.laterPeriod.windowIndices, [5])

  const partial = dynamicsForFixture("stage4_partial_final_window")
  assert.deepEqual(partial.adaptiveWindows.map((bucket) => bucket.partial), [false, true])
  assert.equal(partial.adaptiveWindows[0].end, "2026-07-13")
  assert.equal(partial.adaptiveWindows[1].start, "2026-07-14")
  assert.equal(partial.adaptiveWindows[1].end, "2026-07-15")
}

function testConversationalTurnsAndBoundaries() {
  const burst = dynamicsForFixture("stage4_same_sender_burst_turn")
  assert.equal(burst.turns.length, 2)
  assert.equal(burst.turns[0].sender, "Asha")
  assert.equal(burst.turns[0].messageCount, 3)
  assert.equal(burst.turns[0].startsThread, true)
  assert.equal(burst.turns[1].sender, "Ravi")
  assert.equal(burst.turns[1].startsThread, false)

  const sixHour = dynamicsForFixture("stage4_six_hour_thread_boundary")
  assert.equal(sixHour.turns.length, 3)
  assert.equal(sixHour.turns[1].sender, "Asha")
  assert.equal(sixHour.turns[1].startsThread, true)
  assert.equal(sixHour.adaptiveWindows[0].threadCount, 2)

  const exact = dynamicsForFixture("stage4_exact_boundaries")
  assert.equal(exact.turns.length, 3)
  assert.deepEqual(exact.turns.map((turn) => turn.startsThread), [true, true, true])
  assert.equal(exact.adaptiveWindows[0].reconnectionCount, 1)
}

function testReconnectionsFollowUpsAndOpenTurns() {
  const followUpBoundary = dynamicsForFixture("stage4_followup_15_min_boundary")
  const ashaBoundary = participant(followUpBoundary, "Asha")
  assert.equal(ashaBoundary.followUpCount, 1)
  assert.equal(ashaBoundary.followUpRelevantTurnCount, 1)
  assert.equal(ashaBoundary.followUpRate, 100)
  assert.equal(ashaBoundary.medianFollowUpDelayMinutes, 15)

  const exact = dynamicsForFixture("stage4_exact_boundaries")
  assert.equal(participant(exact, "Asha").followUpCount, 1)
  assert.equal(participant(exact, "Ravi").reconnectionCount, 1)
  assert.equal(participant(exact, "Ravi").medianSubsequentThreadDurationMinutes, 15)

  const reconnectors = dynamicsForFixture("stage4_multi_reconnectors")
  assert.equal(reconnectors.pauseSummary.longPauseCount, 3)
  assert.deepEqual(
    reconnectors.pauseSummary.reconnectingParticipants.map((item) => item.sender).sort(),
    ["Asha", "Priya", "Ravi"],
  )

  const open = dynamicsForFixture("stage4_final_open_turn")
  assert.equal(open.turns.at(-1)?.openAtExportEnd, true)
  assert.equal(open.turns.at(-1)?.sender, "Asha")
}

function testEvidenceSafeMetricChanges() {
  const slowdown = dynamicsForFixture("stage4_reply_slowdown")
  assert.equal(slowdown.earlyLate.available, true)

  const raviReply = change(slowdown, "earlyLate", "median_reply_minutes", "Ravi")
  assert.equal(raviReply.evidenceState, "sufficient")
  assert.equal(raviReply.direction, "slower")
  assert.equal(raviReply.notable, true)
  assert.equal(raviReply.earlierSampleSize >= 5, true)
  assert.equal(raviReply.laterSampleSize >= 5, true)

  const ashaReconnections = change(slowdown, "earlyLate", "reconnection_share", "Asha")
  assert.equal(ashaReconnections.evidenceState, "insufficient")
  assert.equal(ashaReconnections.direction, "unavailable")
  assert.equal(ashaReconnections.notable, false)

  const tiny = dynamicsForFixture("stage4_insufficient_export")
  assert.equal(tiny.earlyLate.available, false)
  assert.equal(tiny.recentPrior.available, false)
  assert.match(tiny.earlyLate.unavailableReason ?? "", /Requires 4 eligible windows/)
}

function testUiLabelsAreStage4Accurate() {
  const overview = readFileSync(path.join(process.cwd(), "features", "overview", "OverviewScreen.tsx"), "utf8")
  const rhythm = readFileSync(path.join(process.cwd(), "features", "rhythm", "RhythmScreen.tsx"), "utf8")
  const people = readFileSync(path.join(process.cwd(), "features", "people", "PeopleScreen.tsx"), "utf8")
  const changes = readFileSync(path.join(process.cwd(), "features", "changes", "ChangesScreen.tsx"), "utf8")
  const nav = readFileSync(path.join(process.cwd(), "components", "navigation", "BottomNav.tsx"), "utf8")

  assert.match(overview, /Historical reply timing/)
  assert.doesNotMatch(overview, /Reply probability/)
  assert.match(rhythm, /Messages by weekday/)
  assert.match(rhythm, /Pauses and restarts/)
  assert.match(rhythm, /latest gap percentile/i)
  assert.match(people, /Who keeps contact moving/)
  assert.match(people, /Sender-switch edges in group exports are approximate/)
  assert.match(changes, /Early versus late/)
  assert.match(changes, /Recent versus prior/)
  assert.match(changes, /not proof of motive or relationship status/)
  assert.match(nav, /Changes/)
}

function testDynamicsAreSemanticContentIndependent() {
  const original = dynamicsForFixture("stage4_balanced_then_one_sided")
  const rewrittenText = rewriteContentPreservingWordCounts(fixture("stage4_balanced_then_one_sided"))
  const rewritten = analyzeChat(parseWhatsAppChat(rewrittenText)).relationshipDynamics

  assert.deepEqual(projectContentIndependentFields(rewritten), projectContentIndependentFields(original))
}

function rewriteContentPreservingWordCounts(text: string): string {
  return text.replace(/: (.*)$/gm, (_match, content: string) => {
    const words = content.trim().split(/\s+/).filter(Boolean)
    return `: ${words.map((_, index) => `token${index}`).join(" ")}`
  })
}

function projectContentIndependentFields(dynamics: RelationshipDynamics) {
  return {
    windowSizeDays: dynamics.windowSizeDays,
    windows: dynamics.adaptiveWindows.map((bucket) => ({
      start: bucket.start,
      end: bucket.end,
      partial: bucket.partial,
      eligible: bucket.eligible,
      messageCount: bucket.messageCount,
      activeDays: bucket.activeDays,
      turnCount: bucket.turnCount,
      threadCount: bucket.threadCount,
      reconnectionCount: bucket.reconnectionCount,
    })),
    turns: dynamics.turns.map((turn) => ({
      sender: turn.sender,
      startMessageIndex: turn.startMessageIndex,
      endMessageIndex: turn.endMessageIndex,
      messageCount: turn.messageCount,
      durationMinutes: turn.durationMinutes,
      startsThread: turn.startsThread,
      openAtExportEnd: turn.openAtExportEnd,
    })),
    participants: dynamics.participantSummaries.map((item) => ({
      sender: item.sender,
      turnCount: item.turnCount,
      turnShare: item.turnShare,
      medianReplyMinutes: item.medianReplyMinutes,
      replySampleCount: item.replySampleCount,
      threadStarts: item.threadStarts,
      threadStartShare: item.threadStartShare,
      reconnectionCount: item.reconnectionCount,
      reconnectionShare: item.reconnectionShare,
      followUpCount: item.followUpCount,
      followUpRelevantTurnCount: item.followUpRelevantTurnCount,
      followUpRate: item.followUpRate,
    })),
    pauseSummary: dynamics.pauseSummary,
    earlyLate: dynamics.earlyLate,
    recentPrior: dynamics.recentPrior,
  }
}

run()
