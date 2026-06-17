import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"

export const SHARED_FILE_PLUGIN_NAME = "SharedFile"
export const SHARED_FILE_AVAILABLE_EVENT = "sharedFileAvailable"
export const SHARED_FILE_ERROR_EVENT = "sharedFileError"

export type NativeSharedFile = {
  id: string
  name: string
  mimeType?: string | null
  sizeBytes?: number | null
  uri: string
}

export type NativeSharedFileError = {
  code?: string
  errorType?: string
  message?: string
  name?: string | null
}

export type PendingSharedFileResult = {
  file?: NativeSharedFile | null
  error?: NativeSharedFileError | null
}

export type SharedFilePlugin = {
  addListener(
    eventName: typeof SHARED_FILE_AVAILABLE_EVENT,
    listenerFunc: (file: NativeSharedFile) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: typeof SHARED_FILE_ERROR_EVENT,
    listenerFunc: (error: NativeSharedFileError) => void,
  ): Promise<PluginListenerHandle>
  getPendingSharedFile(): Promise<PendingSharedFileResult>
  releaseSharedFile(options: { id: string }): Promise<void>
}

export const SharedFile = registerPlugin<SharedFilePlugin>(SHARED_FILE_PLUGIN_NAME)

export function isSharedFilePluginAvailable(): boolean {
  return Capacitor.isPluginAvailable(SHARED_FILE_PLUGIN_NAME)
}

export function convertNativeFileUri(uri: string): string {
  return Capacitor.convertFileSrc(uri)
}
