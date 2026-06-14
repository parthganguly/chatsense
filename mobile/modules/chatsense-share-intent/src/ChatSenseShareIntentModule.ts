import { NativeModule, requireNativeModule } from "expo"

import type {
  ChatSenseShareIntentModuleEvents,
  SharedChatExport,
} from "./ChatSenseShareIntent.types"

declare class ChatSenseShareIntentModule extends NativeModule<ChatSenseShareIntentModuleEvents> {
  getInitialFile(): SharedChatExport | null
  clearInitialFile(): void
}

const nativeModule = requireNativeModule<ChatSenseShareIntentModule>("ChatSenseShareIntent")

type EventSubscription = {
  remove(): void
}

export function getInitialSharedFile(): SharedChatExport | null {
  return normalizeSharedFile(nativeModule.getInitialFile())
}

export function clearInitialSharedFile(): void {
  nativeModule.clearInitialFile()
}

export function addIncomingFileListener(
  listener: (payload: SharedChatExport) => void,
): EventSubscription {
  return nativeModule.addListener("onIncomingFile", (payload) => {
    const normalized = normalizeSharedFile(payload)
    if (normalized) {
      listener(normalized)
    }
  })
}

function normalizeSharedFile(payload: SharedChatExport | null): SharedChatExport | null {
  if (!payload?.uri) {
    return null
  }

  return {
    uri: payload.uri,
    name: payload.name ?? "WhatsApp Chat.zip",
    mimeType: payload.mimeType ?? null,
    size: typeof payload.size === "number" ? payload.size : null,
    action: payload.action,
    deleteAfterRead: payload.deleteAfterRead,
    receivedAt: payload.receivedAt,
  }
}

export type { SharedChatExport }
