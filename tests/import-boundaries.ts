import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import JSZip from "jszip"
import { analyzeChat, parseWhatsAppChat } from "@chatsense/core"
import { analyzeImportedText } from "../features/import/useChatImport"
import { readWhatsAppExport, selectWhatsAppTextEntry } from "../features/import/readWhatsAppExport"
import {
  SHARED_FILE_ERROR_EVENT,
  SHARED_FILE_EVENT,
  sharedFileErrorMessage,
  sharedFilePayloadToFile,
  subscribeToSharedFileBridge,
} from "../platform/android/sharedFileBridge"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sampleChat = [
  "13/06/2026, 09:00 - Alice: Morning",
  "13/06/2026, 09:03 - Bob: Morning!",
  "13/06/2026, 09:06 - Alice: Coffee later?",
  "13/06/2026, 09:20 - Bob: Yes",
].join("\n")

async function run() {
  await testCorePackageImport()
  await testTxtImport()
  await testZipSelection()
  await testZipWithoutTxtFailure()
  await testUnsupportedFileFailure()
  await testAndroidSharedFileConversion()
  testAndroidNativeErrorConversion()
  await testListenerCleanup()
  testImportOrchestrationUsesCore()
  testNoDuplicateRuntimeImplementations()
  testCoreHasNoPlatformImports()
  testUiDoesNotComputeBehavioralAnalytics()
  console.log("Import and boundary tests passed.")
}

async function testCorePackageImport() {
  const messages = parseWhatsAppChat(sampleChat)
  assert.equal(messages.length, 4)
  assert.equal(analyzeChat(messages).overview.messageCount, 4)
}

async function testTxtImport() {
  const file = new File([sampleChat], "WhatsApp Chat.txt", { type: "text/plain" })
  assert.equal(await readWhatsAppExport(file), sampleChat)
}

async function testZipSelection() {
  const fallback = { dir: false, name: "notes.txt" }
  const preferred = { dir: false, name: "WhatsApp Chat with Alice.txt" }
  assert.equal(selectWhatsAppTextEntry([fallback, preferred]), preferred)

  const zip = new JSZip()
  zip.file("notes.txt", "ignore me")
  zip.file("WhatsApp Chat with Alice.txt", sampleChat)
  const file = new File([toArrayBuffer(await zip.generateAsync({ type: "uint8array" }))], "export.zip", {
    type: "application/zip",
  })
  assert.equal(await readWhatsAppExport(file), sampleChat)
}

async function testZipWithoutTxtFailure() {
  const zip = new JSZip()
  zip.file("image.jpg", "not a chat")
  const file = new File([toArrayBuffer(await zip.generateAsync({ type: "uint8array" }))], "export.zip", {
    type: "application/zip",
  })
  await assert.rejects(readWhatsAppExport(file), /No WhatsApp chat TXT file/)
}

async function testUnsupportedFileFailure() {
  const file = new File(["{}"], "export.json", { type: "application/json" })
  await assert.rejects(readWhatsAppExport(file), /Choose the WhatsApp export ZIP or TXT file/)
}

async function testAndroidSharedFileConversion() {
  const file = sharedFilePayloadToFile({
    base64: Buffer.from(sampleChat, "utf8").toString("base64"),
    mimeType: "text/plain",
    name: "shared.txt",
  })

  assert.ok(file)
  assert.equal(file.name, "shared.txt")
  assert.equal(file.type, "text/plain")
  assert.equal(await file.text(), sampleChat)
}

function testAndroidNativeErrorConversion() {
  assert.equal(sharedFileErrorMessage({ message: "Native read failed" }), "Native read failed")
  assert.match(sharedFileErrorMessage({}), /could not read the shared export/)
}

async function testListenerCleanup() {
  const target = new EventTarget()
  const files: File[] = []
  const errors: string[] = []
  const unsubscribe = subscribeToSharedFileBridge(
    {
      onFile: (file) => files.push(file),
      onError: (message) => errors.push(message),
    },
    target,
  )

  target.dispatchEvent(customEvent(SHARED_FILE_EVENT, {
    base64: Buffer.from(sampleChat, "utf8").toString("base64"),
    mimeType: "text/plain",
    name: "shared.txt",
  }))
  target.dispatchEvent(customEvent(SHARED_FILE_ERROR_EVENT, { message: "Native error" }))

  assert.equal(files.length, 1)
  assert.equal(errors.length, 1)
  assert.equal(await files[0].text(), sampleChat)
  assert.equal(errors[0], "Native error")

  unsubscribe()
  target.dispatchEvent(customEvent(SHARED_FILE_EVENT, {
    base64: Buffer.from("after cleanup", "utf8").toString("base64"),
    mimeType: "text/plain",
    name: "ignored.txt",
  }))
  target.dispatchEvent(customEvent(SHARED_FILE_ERROR_EVENT, { message: "Ignored error" }))

  assert.equal(files.length, 1)
  assert.equal(errors.length, 1)
}

function testImportOrchestrationUsesCore() {
  const imported = analyzeImportedText(sampleChat)
  assert.equal(imported.messages.length, 4)
  assert.equal(imported.analysis.overview.messageCount, 4)
}

function testNoDuplicateRuntimeImplementations() {
  const obsoleteFiles = ["chat-parser.ts", "chat-analyzer.ts", "contract.ts", "parity.ts"].map((file) =>
    path.join(root, "lib", file),
  )
  obsoleteFiles.forEach((file) => assert.equal(fs.existsSync(file), false, `${file} should not exist`))
}

function testCoreHasNoPlatformImports() {
  const files = collectSourceFiles(path.join(root, "packages", "chatsense-core", "src"))
  const forbidden = /\b(from\s+["'](?:react|next|@capacitor|node:|fs|path)|window\.|document\.|localStorage|FileReader|Blob|Android|Python)\b/

  for (const file of files) {
    const content = stripComments(fs.readFileSync(file, "utf8"))
    assert.equal(forbidden.test(content), false, `${path.relative(root, file)} imports or references platform APIs`)
  }
}

function testUiDoesNotComputeBehavioralAnalytics() {
  const files = [
    path.join(root, "app", "page.tsx"),
    ...collectSourceFiles(path.join(root, "components", "analytics")),
    ...collectSourceFiles(path.join(root, "components", "navigation")),
    ...collectSourceFiles(path.join(root, "features", "overview")),
    ...collectSourceFiles(path.join(root, "features", "rhythm")),
    ...collectSourceFiles(path.join(root, "features", "people")),
    ...collectSourceFiles(path.join(root, "platform", "android")),
    path.join(root, "utils", "formatting.ts"),
  ]
  const forbidden = /\b(parseWhatsAppChat|analyzeChat)\b/

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8")
    assert.equal(forbidden.test(content), false, `${path.relative(root, file)} should not compute behavioral analytics`)
  }
}

function collectSourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return []

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : []
  })
}

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1")
}

function customEvent<T>(type: string, detail: T): Event {
  if (typeof CustomEvent !== "undefined") return new CustomEvent(type, { detail })

  const event = new Event(type) as CustomEvent<T>
  Object.defineProperty(event, "detail", { value: detail })
  return event
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

void run()
