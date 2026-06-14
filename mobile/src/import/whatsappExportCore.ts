import { strFromU8, unzipSync } from "fflate"

export type ChatExportKind = "txt" | "zip"

export type ChatImportErrorCode =
  | "empty_file"
  | "malformed_text"
  | "malformed_zip"
  | "no_chat_text"
  | "unsafe_zip_path"
  | "unsupported_file"
  | "unreadable_file"

export class ChatImportError extends Error {
  readonly code: ChatImportErrorCode

  constructor(code: ChatImportErrorCode, message: string) {
    super(message)
    this.name = "ChatImportError"
    this.code = code
  }
}

export interface PickedChatExport {
  uri: string
  name: string
  mimeType?: string
  size?: number
  deleteAfterRead?: boolean
}

export interface ChatExportFileIO {
  readText(uri: string): Promise<string>
  readBytes(uri: string): Promise<Uint8Array>
  delete(uri: string): Promise<void>
}

export async function readChatTextFromPickedExport(
  source: PickedChatExport,
  fileIO: ChatExportFileIO,
): Promise<string> {
  try {
    const kind = detectChatExportKind(source)
    assertNonEmptyFile(source.size)

    if (kind === "txt") {
      return normalizeRawChatText(await fileIO.readText(source.uri))
    }

    return readWhatsAppTextFromZipBytes(await fileIO.readBytes(source.uri))
  } catch (error) {
    if (error instanceof ChatImportError) {
      throw error
    }
    throw new ChatImportError("unreadable_file", "ChatSense could not read this file.")
  } finally {
    if (source.deleteAfterRead) {
      await fileIO.delete(source.uri).catch(() => undefined)
    }
  }
}

export function detectChatExportKind(source: {
  name?: string
  mimeType?: string
}): ChatExportKind {
  const name = source.name?.toLowerCase() ?? ""
  const mimeType = source.mimeType?.toLowerCase() ?? ""

  if (name.endsWith(".txt") || mimeType === "text/plain") {
    return "txt"
  }

  if (
    name.endsWith(".zip") ||
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed"
  ) {
    return "zip"
  }

  if (mimeType === "application/octet-stream" && name.endsWith(".zip")) {
    return "zip"
  }

  throw new ChatImportError(
    "unsupported_file",
    "Choose a WhatsApp chat export as a .txt or .zip file.",
  )
}

export function normalizeRawChatText(text: string): string {
  if (text.trim().length === 0) {
    throw new ChatImportError("empty_file", "This export is empty.")
  }

  if (!looksLikeWhatsAppExport(text)) {
    throw new ChatImportError(
      "malformed_text",
      "No WhatsApp messages were found in this text export.",
    )
  }

  return text
}

export function readWhatsAppTextFromZipBytes(bytes: Uint8Array): string {
  assertNonEmptyFile(bytes.byteLength)

  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(bytes, {
      filter(file) {
        assertSafeZipEntryName(file.name)
        return isTextEntry(file.name)
      },
    })
  } catch (error) {
    if (error instanceof ChatImportError) {
      throw error
    }
    throw new ChatImportError(
      "malformed_zip",
      "This ZIP could not be opened as a WhatsApp export.",
    )
  }

  const chatEntryName = selectWhatsAppTextEntry(Object.keys(entries))
  if (!chatEntryName) {
    throw new ChatImportError(
      "no_chat_text",
      "This ZIP does not contain a WhatsApp chat text export.",
    )
  }

  return normalizeRawChatText(strFromU8(entries[chatEntryName]))
}

export function selectWhatsAppTextEntry(entryNames: string[]): string | null {
  const textEntries = entryNames.filter(isTextEntry)

  return (
    textEntries.find((entryName) => getBaseName(entryName).toLowerCase() === "_chat.txt") ??
    textEntries.find((entryName) =>
      getBaseName(entryName).toLowerCase().startsWith("whatsapp chat"),
    ) ??
    textEntries[0] ??
    null
  )
}

export function assertSafeZipEntryName(name: string): void {
  if (!name || name.includes("\0")) {
    throw unsafeZipPath(name)
  }

  const normalized = name.replace(/\\/g, "/")
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw unsafeZipPath(name)
  }
}

export function assertNonEmptyFile(size: number | undefined): void {
  if (size === 0) {
    throw new ChatImportError("empty_file", "This export is empty.")
  }
}

function isTextEntry(entryName: string): boolean {
  const normalized = entryName.replace(/\\/g, "/")
  return !normalized.endsWith("/") && normalized.toLowerCase().endsWith(".txt")
}

function getBaseName(entryName: string): string {
  return entryName.replace(/\\/g, "/").split("/").at(-1) ?? entryName
}

function looksLikeWhatsAppExport(text: string): boolean {
  return text.split(/\r?\n/).some((line) =>
    /^\[?\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}/.test(line.trim()),
  )
}

function unsafeZipPath(name: string): ChatImportError {
  return new ChatImportError(
    "unsafe_zip_path",
    `This ZIP contains an unsafe entry path: ${name || "(empty)"}.`,
  )
}
