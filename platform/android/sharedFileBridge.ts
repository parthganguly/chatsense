export const SHARED_FILE_EVENT = "chatsense-shared-file"
export const SHARED_FILE_ERROR_EVENT = "chatsense-shared-file-error"

export type SharedFilePayload = {
  base64?: string
  mimeType?: string | null
  name?: string | null
}

export type SharedFileErrorPayload = {
  code?: string
  errorType?: string
  message?: string
  name?: string | null
}

export type SharedFileBridgeHandlers = {
  onFile(file: File): void
  onError(message: string): void
}

export function sharedFilePayloadToFile(payload: SharedFilePayload): File | null {
  if (!payload.base64) return null

  return new File([base64ToBuffer(payload.base64)], payload.name || "WhatsApp Chat.zip", {
    type: payload.mimeType || "application/zip",
  })
}

export function sharedFileErrorMessage(payload: SharedFileErrorPayload): string {
  return payload.message || "ChatSense could not read the shared export. Try selecting the ZIP manually."
}

export function subscribeToSharedFileBridge(
  handlers: SharedFileBridgeHandlers,
  target: Pick<EventTarget, "addEventListener" | "removeEventListener"> = window,
): () => void {
  const handleSharedFile = (event: Event) => {
    const file = sharedFilePayloadToFile((event as CustomEvent<SharedFilePayload>).detail || {})
    if (file) handlers.onFile(file)
  }

  const handleNativeError = (event: Event) => {
    handlers.onError(sharedFileErrorMessage((event as CustomEvent<SharedFileErrorPayload>).detail || {}))
  }

  target.addEventListener(SHARED_FILE_EVENT, handleSharedFile)
  target.addEventListener(SHARED_FILE_ERROR_EVENT, handleNativeError)

  return () => {
    target.removeEventListener(SHARED_FILE_EVENT, handleSharedFile)
    target.removeEventListener(SHARED_FILE_ERROR_EVENT, handleNativeError)
  }
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}
