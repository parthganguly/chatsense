import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import JSZip from "jszip"
import { analyzeChat, parseWhatsAppChat } from "@chatsense/core"
import { analyzeImportedText } from "../features/import/useChatImport"
import { readWhatsAppExport, selectWhatsAppTextEntry } from "../features/import/readWhatsAppExport"
import { nativeSharedFileToFile, sharedFileErrorMessage, subscribeToSharedFileBridge } from "../platform/android/sharedFileBridge"
import {
  SHARED_FILE_AVAILABLE_EVENT,
  SHARED_FILE_ERROR_EVENT,
  type NativeSharedFile,
  type NativeSharedFileError,
  type PendingSharedFileResult,
  type SharedFilePlugin,
} from "../platform/android/nativeSharedFile"

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
  await testNativeSharedFileConversion()
  testAndroidNativeErrorConversion()
  testNativePluginUnavailable()
  await testPendingSharedFileImportAndRelease()
  await testWarmSharedFileImportAndListenerCleanup()
  await testDuplicatePendingAndWarmEventsAreIgnored()
  await testReleaseAfterDownstreamImportFailure()
  testImportOrchestrationUsesCore()
  testNoDuplicateRuntimeImplementations()
  testCoreHasNoPlatformImports()
  testUiDoesNotComputeBehavioralAnalytics()
  testNativeImportBridgeDoesNotUseObsoleteBridge()
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

async function testNativeSharedFileConversion() {
  const convertedUrls: string[] = []
  const fetchedUrls: string[] = []
  const file = await nativeSharedFileToFile(nativeFile("file-1"), {
    convertFileSrc: (uri) => {
      convertedUrls.push(uri)
      return "capacitor://localhost/_capacitor_file_/cache/shared.txt"
    },
    fetchFile: async (url) => {
      fetchedUrls.push(url)
      return new Response(new Blob([sampleChat], { type: "text/plain" }), { status: 200 })
    },
  })

  assert.equal(file.name, "shared.txt")
  assert.equal(file.type, "text/plain")
  assert.equal(await file.text(), sampleChat)
  assert.deepEqual(convertedUrls, ["file:///data/user/0/app/cache/shared.txt"])
  assert.deepEqual(fetchedUrls, ["capacitor://localhost/_capacitor_file_/cache/shared.txt"])
}

function testAndroidNativeErrorConversion() {
  assert.equal(sharedFileErrorMessage({ message: "Native read failed" }), "Native read failed")
  assert.match(sharedFileErrorMessage({ code: "file_too_large" }), /too large/)
  assert.match(sharedFileErrorMessage({ code: "unsupported_file" }), /not supported/)
  assert.match(sharedFileErrorMessage({}), /could not import the shared export/)
}

function testNativePluginUnavailable() {
  const errors: string[] = []
  const unsubscribe = subscribeToSharedFileBridge(
    {
      onFile: () => {
        throw new Error("No file should be delivered without the native plugin.")
      },
      onError: (message) => errors.push(message),
    },
    {
      isPluginAvailable: () => false,
      plugin: null,
    },
  )

  unsubscribe()
  assert.deepEqual(errors, [])
}

async function testPendingSharedFileImportAndRelease() {
  const plugin = new FakeSharedFilePlugin({ file: nativeFile("pending-1"), error: null })
  const files: File[] = []

  subscribeToSharedFileBridge(
    {
      onFile: (file) => {
        files.push(file)
      },
      onError: (message) => {
        throw new Error(message)
      },
    },
    nativeTestDependencies(plugin),
  )
  await flushAsync()

  assert.equal(files.length, 1)
  assert.equal(await files[0].text(), sampleChat)
  assert.deepEqual(plugin.releasedIds, ["pending-1"])
}

async function testWarmSharedFileImportAndListenerCleanup() {
  const plugin = new FakeSharedFilePlugin({ file: null, error: null })
  const files: File[] = []
  const errors: string[] = []
  const unsubscribe = subscribeToSharedFileBridge(
    {
      onFile: (file) => {
        files.push(file)
      },
      onError: (message) => errors.push(message),
    },
    nativeTestDependencies(plugin),
  )
  await flushAsync()

  plugin.emit(SHARED_FILE_AVAILABLE_EVENT, nativeFile("warm-1"))
  plugin.emit(SHARED_FILE_ERROR_EVENT, { message: "Native error" })
  await flushAsync()

  assert.equal(files.length, 1)
  assert.equal(errors[0], "Native error")
  assert.deepEqual(plugin.releasedIds, ["warm-1"])

  unsubscribe()
  plugin.emit(SHARED_FILE_AVAILABLE_EVENT, nativeFile("warm-2"))
  plugin.emit(SHARED_FILE_ERROR_EVENT, { message: "Ignored error" })
  await flushAsync()

  assert.equal(files.length, 1)
  assert.equal(errors.length, 1)
}

async function testDuplicatePendingAndWarmEventsAreIgnored() {
  const duplicate = nativeFile("duplicate-1")
  const plugin = new FakeSharedFilePlugin({ file: duplicate, error: null })
  const files: File[] = []

  subscribeToSharedFileBridge(
    {
      onFile: (file) => {
        files.push(file)
      },
      onError: (message) => {
        throw new Error(message)
      },
    },
    nativeTestDependencies(plugin),
  )
  plugin.emit(SHARED_FILE_AVAILABLE_EVENT, duplicate)
  await flushAsync()

  assert.equal(files.length, 1)
  assert.deepEqual(plugin.releasedIds, ["duplicate-1"])
}

async function testReleaseAfterDownstreamImportFailure() {
  const plugin = new FakeSharedFilePlugin({ file: nativeFile("failure-1"), error: null })
  const errors: string[] = []

  subscribeToSharedFileBridge(
    {
      onFile: async () => {
        throw new Error("downstream import failed")
      },
      onError: (message) => errors.push(message),
    },
    nativeTestDependencies(plugin),
  )
  await flushAsync()

  assert.deepEqual(plugin.releasedIds, ["failure-1"])
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
    ...collectSourceFiles(path.join(root, "features", "dynamics")),
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

function testNativeImportBridgeDoesNotUseObsoleteBridge() {
  const files = [
    path.join(root, "android", "app", "src", "main", "java", "com", "thegreatparthicle", "chatsense", "MainActivity.java"),
    path.join(root, "platform", "android", "sharedFileBridge.ts"),
    path.join(root, "platform", "android", "nativeSharedFile.ts"),
  ]
  const forbidden = /base64|readAllBytes|evaluateJavascript|postDelayed|1200|chatsense-shared-file|chatsense-shared-file-error/i

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8")
    assert.equal(forbidden.test(content), false, `${path.relative(root, file)} still references the obsolete import bridge`)
  }
}

function nativeFile(id: string): NativeSharedFile {
  return {
    id,
    name: "shared.txt",
    mimeType: "text/plain",
    sizeBytes: sampleChat.length,
    uri: "file:///data/user/0/app/cache/shared.txt",
  }
}

function nativeTestDependencies(plugin: FakeSharedFilePlugin) {
  return {
    convertFileSrc: (uri: string) => uri.replace("file://", "capacitor://localhost/_capacitor_file_/"),
    fetchFile: async () => new Response(new Blob([sampleChat], { type: "text/plain" }), { status: 200 }),
    isPluginAvailable: () => true,
    plugin: plugin as unknown as SharedFilePlugin,
  }
}

class FakeSharedFilePlugin {
  releasedIds: string[] = []
  private listeners = new Map<string, Set<(payload: NativeSharedFile | NativeSharedFileError) => void>>()

  constructor(private pending: PendingSharedFileResult) {}

  async addListener(eventName: string, listenerFunc: (payload: NativeSharedFile | NativeSharedFileError) => void) {
    const listeners = this.listeners.get(eventName) ?? new Set<(payload: NativeSharedFile | NativeSharedFileError) => void>()
    listeners.add(listenerFunc)
    this.listeners.set(eventName, listeners)
    return {
      remove: async () => {
        listeners.delete(listenerFunc)
      },
    }
  }

  async getPendingSharedFile() {
    const pending = this.pending
    this.pending = { file: null, error: null }
    return pending
  }

  async releaseSharedFile({ id }: { id: string }) {
    this.releasedIds.push(id)
  }

  emit(eventName: typeof SHARED_FILE_AVAILABLE_EVENT, payload: NativeSharedFile): void
  emit(eventName: typeof SHARED_FILE_ERROR_EVENT, payload: NativeSharedFileError): void
  emit(eventName: string, payload: NativeSharedFile | NativeSharedFileError) {
    for (const listener of this.listeners.get(eventName) ?? []) {
      listener(payload)
    }
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

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

void run()
