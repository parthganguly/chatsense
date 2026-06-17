import JSZip from "jszip"

export const WHATSAPP_EXPORT_ACCEPT = ".zip,.txt,application/zip,text/plain"

type ZipTextEntry = {
  dir: boolean
  name: string
  async(format: "string"): Promise<string>
}

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

export async function readWhatsAppExport(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith(".txt")) return file.text()

  if (fileName.endsWith(".zip") || file.type.includes("zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const chatFile = selectWhatsAppTextEntry(Object.values(zip.files) as ZipTextEntry[])

    if (!chatFile) throw new Error("No WhatsApp chat TXT file was found inside this ZIP.")
    return chatFile.async("string")
  }

  throw new Error("Choose the WhatsApp export ZIP or TXT file.")
}
