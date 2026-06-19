import {
  convertNativeFileUri,
  isSharedFilePluginAvailable,
  SHARED_FILE_AVAILABLE_EVENT,
  SHARED_FILE_ERROR_EVENT,
  SharedFile,
  type NativeSharedFile,
  type NativeSharedFileError,
  type SharedFilePlugin,
} from "./nativeSharedFile"

export type SharedFileBridgeHandlers = {
  onFile(file: File): void | Promise<void>
  onError(message: string): void
}

export type SharedFileBridgeDependencies = {
  convertFileSrc?: (uri: string) => string
  fetchFile?: (url: string) => Promise<Response>
  fileCtor?: typeof File
  isPluginAvailable?: () => boolean
  plugin?: SharedFilePlugin | null
}

type RemovableListener = {
  remove(): Promise<void>
}

const DEFAULT_IMPORT_NAME = "WhatsApp Chat.zip"

export function sharedFileErrorMessage(error: NativeSharedFileError): string {
  if (error.message) {
    return error.message
  }

  switch (error.code) {
    case "file_too_large":
      return "This WhatsApp export is too large for local import. Try exporting without media or use a smaller TXT export."
    case "unsupported_file":
      return "This file type is not supported. Share the WhatsApp export ZIP or TXT file."
    case "missing_uri":
    case "copy_failed":
    case "file_unavailable":
      return "ChatSense could not access the shared export. Try selecting the ZIP manually."
    default:
      return "ChatSense could not import the shared export. Try selecting the ZIP manually."
  }
}

export async function nativeSharedFileToFile(
  sharedFile: NativeSharedFile,
  dependencies: SharedFileBridgeDependencies = {},
): Promise<File> {
  const convertFileSrc = dependencies.convertFileSrc ?? convertNativeFileUri
  const fetchFile = dependencies.fetchFile ?? fetch
  const FileCtor = dependencies.fileCtor ?? File
  const response = await fetchFile(convertFileSrc(sharedFile.uri))

  if (!response.ok) {
    throw new Error("file_unavailable")
  }

  const blob = await response.blob()
  return new FileCtor([blob], sharedFile.name || DEFAULT_IMPORT_NAME, {
    type: sharedFile.mimeType || blob.type || "application/zip",
  })
}

export function subscribeToSharedFileBridge(
  handlers: SharedFileBridgeHandlers,
  dependencies: SharedFileBridgeDependencies = {},
): () => void {
  const isAvailable = dependencies.isPluginAvailable ?? isSharedFilePluginAvailable
  const plugin = dependencies.plugin === undefined ? (isAvailable() ? SharedFile : null) : dependencies.plugin

  if (!plugin) {
    return () => {}
  }

  const deliveredIds = new Set<string>()
  const listenerHandles: RemovableListener[] = []
  let disposed = false

  const trackListener = (handlePromise: Promise<RemovableListener>) => {
    void handlePromise.then((handle) => {
      if (disposed) {
        void handle.remove()
      } else {
        listenerHandles.push(handle)
      }
    }).catch(() => {
      if (!disposed) {
        handlers.onError("ChatSense could not listen for Android shared files. Try selecting the ZIP manually.")
      }
    })
  }

  const handleNativeError = (error: NativeSharedFileError | null | undefined) => {
    if (!disposed && error) {
      handlers.onError(sharedFileErrorMessage(error))
    }
  }

  const releaseSharedFile = async (id: string) => {
    try {
      await plugin.releaseSharedFile({ id })
    } catch {
      // The cached file is best-effort cleanup; stale startup cleanup handles missed releases.
    }
  }

  const handleNativeFile = async (sharedFile: NativeSharedFile | null | undefined) => {
    if (disposed || !sharedFile?.id || deliveredIds.has(sharedFile.id)) {
      return
    }

    deliveredIds.add(sharedFile.id)

    try {
      const file = await nativeSharedFileToFile(sharedFile, dependencies)
      if (!disposed) {
        await handlers.onFile(file)
      }
    } catch (error) {
      if (!disposed) {
        handlers.onError(error instanceof Error ? sharedFileErrorMessage({ code: error.message }) : sharedFileErrorMessage({}))
      }
    } finally {
      await releaseSharedFile(sharedFile.id)
    }
  }

  trackListener(plugin.addListener(SHARED_FILE_AVAILABLE_EVENT, (sharedFile) => {
    void handleNativeFile(sharedFile)
  }))
  trackListener(plugin.addListener(SHARED_FILE_ERROR_EVENT, handleNativeError))

  void plugin.getPendingSharedFile()
    .then((pending) => {
      handleNativeError(pending.error)
      void handleNativeFile(pending.file)
    })
    .catch(() => {
      if (!disposed) {
        handlers.onError("ChatSense could not check Android shared files. Try selecting the ZIP manually.")
      }
    })

  return () => {
    disposed = true
    for (const handle of listenerHandles.splice(0)) {
      void handle.remove()
    }
  }
}
