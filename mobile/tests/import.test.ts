import assert from "assert/strict"

import { strToU8, zipSync } from "fflate"

import {
  ChatImportError,
  assertSafeZipEntryName,
  detectChatExportKind,
  normalizeRawChatText,
  readChatTextFromPickedExport,
  readWhatsAppTextFromZipBytes,
  selectWhatsAppTextEntry,
  type ChatExportFileIO,
} from "../src/import/whatsappExportCore"

const sampleChat = [
  "01/02/2026, 09:00 - Asha: Hey",
  "01/02/2026, 09:03 - Ravi: Hi",
].join("\n")

function makeZip(entries: Record<string, string>): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([name, text]) => [name, strToU8(text)]),
    ),
  )
}

function assertImportError(error: unknown, code: string): void {
  assert(error instanceof ChatImportError)
  assert.equal((error as ChatImportError).code, code)
}

async function main(): Promise<void> {
  assert.equal(detectChatExportKind({ name: "WhatsApp Chat.txt" }), "txt")
  assert.equal(detectChatExportKind({ name: "WhatsApp Chat.zip" }), "zip")
  assert.equal(
    detectChatExportKind({
      name: "export.zip",
      mimeType: "application/octet-stream",
    }),
    "zip",
  )
  assert.throws(
    () => detectChatExportKind({ name: "photo.jpg", mimeType: "image/jpeg" }),
    (error: unknown) => {
      assertImportError(error, "unsupported_file")
      return true
    },
  )

  assert.equal(normalizeRawChatText(sampleChat), sampleChat)
  assert.throws(
    () => normalizeRawChatText("not a chat"),
    (error: unknown) => {
      assertImportError(error, "malformed_text")
      return true
    },
  )

  assert.equal(
    selectWhatsAppTextEntry(["Media/photo.jpg", "_chat.txt", "notes.txt"]),
    "_chat.txt",
  )
  assert.equal(
    selectWhatsAppTextEntry(["Media/photo.jpg", "WhatsApp Chat with Asha.txt"]),
    "WhatsApp Chat with Asha.txt",
  )
  assert.equal(selectWhatsAppTextEntry(["folder/backup.txt"]), "folder/backup.txt")
  assert.equal(selectWhatsAppTextEntry(["image.jpg"]), null)

  assert.doesNotThrow(() => assertSafeZipEntryName("folder/_chat.txt"))
  assert.throws(
    () => assertSafeZipEntryName("../_chat.txt"),
    (error: unknown) => {
      assertImportError(error, "unsafe_zip_path")
      return true
    },
  )
  assert.throws(
    () => assertSafeZipEntryName("C:\\temp\\_chat.txt"),
    (error: unknown) => {
      assertImportError(error, "unsafe_zip_path")
      return true
    },
  )

  assert.equal(
    readWhatsAppTextFromZipBytes(
      makeZip({
        "Media/photo.jpg": "ignored",
        "_chat.txt": sampleChat,
      }),
    ),
    sampleChat,
  )
  assert.throws(
    () =>
      readWhatsAppTextFromZipBytes(
        makeZip({
          "Media/photo.jpg": "ignored",
        }),
      ),
    (error: unknown) => {
      assertImportError(error, "no_chat_text")
      return true
    },
  )
  assert.throws(
    () => readWhatsAppTextFromZipBytes(strToU8("not a zip")),
    (error: unknown) => {
      assertImportError(error, "malformed_zip")
      return true
    },
  )

  const cleanupCalls: string[] = []
  const mockFileIO: ChatExportFileIO = {
    async readText() {
      return sampleChat
    },
    async readBytes() {
      return makeZip({ "_chat.txt": sampleChat })
    },
    async delete(uri: string) {
      cleanupCalls.push(uri)
    },
  }

  assert.equal(
    await readChatTextFromPickedExport(
      {
        uri: "file:///cache/export.txt",
        name: "export.txt",
        size: sampleChat.length,
        deleteAfterRead: true,
      },
      mockFileIO,
    ),
    sampleChat,
  )
  assert.deepEqual(cleanupCalls, ["file:///cache/export.txt"])

  await assert.rejects(
    () =>
      readChatTextFromPickedExport(
        {
          uri: "file:///cache/export.zip",
          name: "export.zip",
          size: 12,
          deleteAfterRead: true,
        },
        {
          ...mockFileIO,
          async readBytes() {
            return strToU8("not a zip")
          },
        },
      ),
    (error: unknown) => {
      assertImportError(error, "malformed_zip")
      return true
    },
  )
  assert.deepEqual(cleanupCalls, [
    "file:///cache/export.txt",
    "file:///cache/export.zip",
  ])

  console.log("Mobile import tests passed.")
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
