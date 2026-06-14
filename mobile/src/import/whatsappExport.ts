import * as DocumentPicker from "expo-document-picker"
import { File } from "expo-file-system"

import {
  readChatTextFromPickedExport as readChatTextFromPickedExportWithIO,
  type ChatExportFileIO,
  type PickedChatExport,
} from "./whatsappExportCore"

export {
  ChatImportError,
  assertSafeZipEntryName,
  detectChatExportKind,
  normalizeRawChatText,
  readChatTextFromPickedExport as readChatTextFromPickedExportWithIO,
  readWhatsAppTextFromZipBytes,
  selectWhatsAppTextEntry,
} from "./whatsappExportCore"
export type {
  ChatExportFileIO,
  ChatExportKind,
  ChatImportErrorCode,
  PickedChatExport,
} from "./whatsappExportCore"

export const SUPPORTED_EXPORT_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "text/plain",
] as const

const expoFileIO: ChatExportFileIO = {
  async readText(uri: string) {
    return await new File(uri).text()
  },
  async readBytes(uri: string) {
    return await new File(uri).bytes()
  },
  async delete(uri: string) {
    const file = new File(uri)
    if (file.exists) {
      file.delete()
    }
  },
}

export async function pickChatExport(): Promise<PickedChatExport | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...SUPPORTED_EXPORT_MIME_TYPES],
    multiple: false,
    copyToCacheDirectory: true,
  })

  if (result.canceled) {
    return null
  }

  const asset = result.assets[0]
  if (!asset) {
    return null
  }

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
    deleteAfterRead: true,
  }
}

export async function readChatTextFromPickedExport(
  source: PickedChatExport,
  fileIO: ChatExportFileIO = expoFileIO,
): Promise<string> {
  return readChatTextFromPickedExportWithIO(source, fileIO)
}
