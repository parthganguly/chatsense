import JSZip from "jszip"

export const WHATSAPP_EXPORT_ACCEPT = ".zip,.txt,application/zip,text/plain"

const MEBIBYTE = 1024 * 1024

export type WhatsAppExportLimits = {
  /** Largest selected TXT/ZIP file accepted, checked before any bytes are read. Matches the native share cap. */
  maxInputBytes: number
  /** Largest decoded chat text (UTF-16 code units) extracted from a ZIP entry; bounds decompression expansion. */
  maxZipTextLength: number
}

export const DEFAULT_WHATSAPP_EXPORT_LIMITS: WhatsAppExportLimits = {
  maxInputBytes: 50 * MEBIBYTE,
  maxZipTextLength: 50 * MEBIBYTE,
}

export const ZIP_UNREADABLE_MESSAGE = "This ZIP could not be read. Choose the original WhatsApp export ZIP or its TXT file."

// Documented JSZip ZipObject#internalStream surface. The "string" stream is the
// exact pipeline `async("string")` accumulates (including JSZip's own UTF-8
// decoding across chunk boundaries), so counting its chunks preserves output.
type ZipTextStream = {
  on(event: "data", callback: (chunk: string) => void): ZipTextStream
  on(event: "error", callback: (error: unknown) => void): ZipTextStream
  on(event: "end", callback: () => void): ZipTextStream
  pause(): ZipTextStream
  resume(): ZipTextStream
}

type ZipTextEntry = {
  dir: boolean
  name: string
  internalStream(format: "string"): ZipTextStream
}

/**
 * Marks an error whose message was explicitly authored for users. Only these
 * messages are shown in the import UI; any other reader/engine error gets the
 * generic fallback so internal details never surface.
 */
export class ImportError extends Error {
  override name = "ImportError"
}

export function isImportError(error: unknown): error is ImportError {
  return error instanceof ImportError
}

class ExportTooLargeError extends ImportError {}

export function selectWhatsAppTextEntry<TEntry extends { dir: boolean; name: string }>(entries: TEntry[]): TEntry | undefined {
  return (
    entries.find((entry) => !entry.dir && entry.name.toLowerCase().endsWith("_chat.txt")) ??
    entries.find(
      (entry) =>
        !entry.dir &&
        entry.name.toLowerCase().includes("whatsapp chat") &&
        entry.name.toLowerCase().endsWith(".txt"),
    ) ??
    entries.find((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".txt"))
  )
}

export async function readWhatsAppExport(
  file: File,
  limits: WhatsAppExportLimits = DEFAULT_WHATSAPP_EXPORT_LIMITS,
): Promise<string> {
  const fileName = file.name.toLowerCase()
  const isTxt = fileName.endsWith(".txt")
  const isZip = !isTxt && (fileName.endsWith(".zip") || file.type.includes("zip"))

  if (!isTxt && !isZip) throw new ImportError("Choose the WhatsApp export ZIP or TXT file.")
  if (file.size > limits.maxInputBytes) throw new ImportError(fileTooLargeMessage(limits.maxInputBytes))

  if (isTxt) return file.text()

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    throw new ImportError(ZIP_UNREADABLE_MESSAGE)
  }

  const chatFile = selectWhatsAppTextEntry(Object.values(zip.files) as unknown as ZipTextEntry[])
  if (!chatFile) throw new ImportError("No WhatsApp chat TXT file was found inside this ZIP.")

  try {
    return await readZipTextWithLimit(chatFile, limits.maxZipTextLength)
  } catch (error) {
    if (error instanceof ExportTooLargeError) throw new ImportError(error.message)
    throw new ImportError(ZIP_UNREADABLE_MESSAGE)
  }
}

function readZipTextWithLimit(entry: ZipTextEntry, maxLength: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = []
    let length = 0
    let settled = false
    const stream = entry.internalStream("string")

    stream
      .on("data", (chunk) => {
        if (settled) return
        length += chunk.length
        if (length > maxLength) {
          settled = true
          chunks.length = 0
          stream.pause()
          reject(new ExportTooLargeError(zipTextTooLargeMessage(maxLength)))
          return
        }
        chunks.push(chunk)
      })
      .on("error", (error) => {
        if (settled) return
        settled = true
        chunks.length = 0
        reject(error)
      })
      .on("end", () => {
        if (settled) return
        settled = true
        resolve(chunks.join(""))
      })
      .resume()
  })
}

function limitLabel(limit: number): string {
  return `${Math.max(1, Math.floor(limit / MEBIBYTE))} MB`
}

function fileTooLargeMessage(limit: number): string {
  return `This WhatsApp export is too large for local import. Try exporting without media or use a smaller TXT export. Limit: ${limitLabel(limit)}.`
}

// maxZipTextLength counts decoded UTF-16 code units, not bytes, so it is labelled as characters.
function zipTextTooLargeMessage(limit: number): string {
  return `The chat inside this ZIP is too large for local import. Try a shorter export. Limit: ${limit.toLocaleString("en-US")} characters.`
}
