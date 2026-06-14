import { NativeModule, registerWebModule } from "expo"

import type {
  ChatSenseShareIntentModuleEvents,
  SharedChatExport,
} from "./ChatSenseShareIntent.types"

class ChatSenseShareIntentModule extends NativeModule<ChatSenseShareIntentModuleEvents> {}

type EventSubscription = {
  remove(): void
}

registerWebModule(ChatSenseShareIntentModule, "ChatSenseShareIntent")

export function getInitialSharedFile(): SharedChatExport | null {
  return null
}

export function clearInitialSharedFile(): void {}

export function addIncomingFileListener(): EventSubscription {
  return {
    remove() {},
  }
}

export type { SharedChatExport }
