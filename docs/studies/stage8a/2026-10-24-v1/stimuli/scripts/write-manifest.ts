/**
 * Stage 8A study stimuli: write manifest.json and SHA256SUMS for stimuli/.
 *
 * Run last, from the repo root, after generate-fixtures.ts and capture.ts:
 *   npx tsx docs/studies/stage8a/2026-10-24-v1/stimuli/scripts/write-manifest.ts
 */
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = process.cwd()
const STIMULI = path.join(ROOT, "docs", "studies", "stage8a", "2026-10-24-v1", "stimuli")

const sha256 = (data: Buffer | string) => createHash("sha256").update(data).digest("hex")
const fileSha = (file: string) => sha256(readFileSync(file))
const run = (command: string, args: string[]) => execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim()

function walk(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((name) => {
      const full = path.join(dir, name)
      return statSync(full).isDirectory() ? walk(full) : [full]
    })
    .sort()
}

// Built static app: per-file manifest plus a digest over it.
const buildId = readFileSync(path.join(ROOT, ".next", "BUILD_ID"), "utf8").trim()
assert.ok(readFileSync(path.join(ROOT, "out", "index.html"), "utf8").includes(buildId), "out/ is not from this build")
const outLines = walk(path.join(ROOT, "out")).map((file) => `${fileSha(file)}  ${path.relative(path.join(ROOT, "out"), file)}`)
writeFileSync(path.join(STIMULI, "build", "out-file-manifest.txt"), outLines.join("\n") + "\n")

const cards = JSON.parse(readFileSync(path.join(STIMULI, "expected", "cards.json"), "utf8"))
const capture = JSON.parse(readFileSync(path.join(STIMULI, "verification", "capture-run.json"), "utf8"))
const rel = (file: string) => path.relative(STIMULI, file)

const perCard = cards.map((card: Record<string, unknown>) => {
  const read = JSON.parse(readFileSync(path.join(STIMULI, card.expectedRead as string), "utf8"))
  const captured = capture.cards.find((entry: { id: string }) => entry.id === card.id)
  const captureFiles = walk(path.join(STIMULI, "captures")).filter((file) => path.basename(file).startsWith(`${card.id}.`))
  const text = readFileSync(path.join(STIMULI, "captures", `${card.id}.card.innerText.txt`), "utf8")
  return {
    ...card,
    expectedConfidenceLabel: read.confidenceLabel,
    expectedHeadline: read.headline,
    renderedInnerTextSha256: sha256(text),
    renderedInnerText: text,
    computedBorder: captured.computedBorder,
    mobileCardBox: captured.mobileCardBox,
    mobileCardFitsFirstScreen: captured.mobileCardFitsFirstScreen,
    mobileFullPageViewport: captured.mobileFullPageViewport,
    desktopCardBox: captured.desktopCardBox,
    textContrast: captured.contrast,
    textAssertions: captured.textAssertions,
    captures: captureFiles.map((file) => ({ file: rel(file), sha256: fileSha(file) })),
  }
})

const manifest = {
  study: "ChatSense Stage 8A comprehension study, stimulus record v1 (issue #29, mandate 6364672064)",
  producedBy: "Opus 5.5 (claude-opus-5-5) via native Claude Code, technical capture consultant to Astra",
  status: "STIMULI CAPTURED FROM REAL BUILD; visually inspected by the capturing agent",
  baseCommit: run("git", ["rev-parse", "HEAD"]),
  branch: run("git", ["rev-parse", "--abbrev-ref", "HEAD"]),
  productSourceClean: run("git", ["status", "--porcelain", "--", ".", ":(exclude)docs/studies"]) === "",
  packageLockSha256: fileSha(path.join(ROOT, "package-lock.json")),
  install: "npm ci --ignore-scripts --no-audit --no-fund",
  build: {
    command: "NEXT_TELEMETRY_DISABLED=1 npm run build (next build, output: export)",
    nextBuildId: buildId,
    outFileCount: outLines.length,
    outManifest: "build/out-file-manifest.txt",
    outManifestSha256: sha256(outLines.join("\n") + "\n"),
  },
  environment: {
    node: process.version,
    npm: run("npm", ["-v"]),
    os: `${os.type()} ${os.release()} ${os.arch()} (macOS ${run("sw_vers", ["-productVersion"])})`,
    browser: capture.browser,
    playwright: capture.playwright,
    locale: capture.locale,
    timezone: capture.timezone,
    colorScheme: capture.colorScheme,
    viewports: capture.viewports,
  },
  captureTimestamp: capture.captureTimestamp,
  serve: `${capture.baseUrl} via node_modules/http-server/bin/http-server out -a 127.0.0.1 -c-1 (stopped after capture)`,
  route: capture.route,
  importPath: capture.importPath,
  clock: "Playwright page.clock.setFixedTime(frozenNowMs) before page.goto, asserted via Date.now() before import; per-card value below",
  scripts: walk(path.join(STIMULI, "scripts")).map((file) => ({ file: rel(file), sha256: fileSha(file) })),
  studyPresentationRecommendation:
    "captures/<id>.desktop-1280x1000.card.png is the 100%-native (DPR 1) single-frame card; <id>.desktop-1280x1000@2x.card.png is the identical layout at DPR 2 for HiDPI displays. Mobile 390x844 card also fits the first screen for all five cards.",
  displayDeviations: [
    "State accent border: RelationshipReadCard combines border-slate-200 with a state border colour. In the built CSS, border-amber-600 and border-cyan-600 precede border-slate-200 and lose; border-violet-600 and border-slate-300 follow and win on all four sides. Rendered: pattern_change and unusual_silence show a plain grey border (no accent), carried_contact cards (c2, c3) show a full violet outline, insufficient shows slate-300. The visible frame therefore differs between carried-contact cards and the others (computedBorder per card).",
    "Limitation line (text-slate-400 on white, 11px) measures 2.56:1 contrast, below WCAG AA 4.5:1; evidence/staleness lines are 4.76:1 at 11-12px.",
    "Desktop 1280x1000 renders the app as a centred ~384px phone frame; the card is 344 CSS px wide, so the DPR 1 card image is small (11-12px text).",
    "Header shows the upload file name; all five use the identical neutral name 'WhatsApp Chat with Synthetic Example.txt' (truncated in the header). Fixture bytes are unchanged.",
    "Whole-page mobile context: the app scrolls inside <main>, so Playwright fullPage equals the viewport; *.mobile-390xH.full-page.png grows only viewport height (width 390, DPR 3) so <main> no longer scrolls. Bottom nav is fixed at the bottom of that tall frame.",
    "Whole-page context also shows the pre-existing 'What to notice' takeaway and summary below the hero; their emphasis can differ from the hero (e.g. c1 hero = reply-time change, takeaway = maintenance lean; c4 hero = current quiet, takeaway = starts/restarts lean). Card-only images avoid this.",
    "Copy observations (rendered exactly, not altered): c1 summary/evidence use ISO date ranges ('between 2026-04-01 to 2026-04-14 and ...') while the staleness line uses 'May 7, 2026'; c3 summary reads 'while restarts after pauses and follow-ups before a reply and turn share stayed close to even'; c2/c3 summaries name 4 measures but evidence shows 3 (cap of three; turn share omitted); c2/c3 show 'Following up before a reply: 0% ...'.",
  ],
  cards: perCard,
}

writeFileSync(path.join(STIMULI, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")

const sums = walk(STIMULI)
  .filter((file) => path.basename(file) !== "SHA256SUMS")
  .map((file) => `${fileSha(file)}  ${rel(file)}`)
writeFileSync(path.join(STIMULI, "SHA256SUMS"), sums.join("\n") + "\n")
console.log(`manifest.json written; SHA256SUMS covers ${sums.length} files; manifest sha256 ${fileSha(path.join(STIMULI, "manifest.json"))}`)
