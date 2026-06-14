export type ChatSenseShareIntentModuleEvents = {
  onIncomingFile: (payload: SharedChatExport) => void
}

export type SharedChatExport = {
  uri: string
  name: string | null
  mimeType: string | null
  size: number | null
  action: "send" | "view"
  deleteAfterRead: boolean
  receivedAt: number
}
