import type { ChatAnalysis, ChatMessage } from "@chatsense/core"

export type Screen = "import" | "overview" | "rhythm" | "people" | "privacy"
export type ImportPhase = "idle" | "picking" | "reading" | "analyzing" | "error" | "complete"

export interface AnalysisSession {
  sourceName: string
  messages: ChatMessage[]
  analysis: ChatAnalysis
}

export interface AppState {
  screen: Screen
  importPhase: ImportPhase
  error: string | null
  session: AnalysisSession | null
}

export type AppAction =
  | { type: "navigate"; screen: Screen }
  | { type: "import_started" }
  | { type: "import_canceled" }
  | { type: "file_reading" }
  | { type: "analysis_started" }
  | { type: "analysis_succeeded"; session: AnalysisSession }
  | { type: "analysis_failed"; error: string }
  | { type: "reset" }

export const initialAppState: AppState = {
  screen: "import",
  importPhase: "idle",
  error: null,
  session: null,
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "navigate":
      return {
        ...state,
        screen: action.screen,
      }
    case "import_started":
      return {
        ...state,
        screen: "import",
        importPhase: "picking",
        error: null,
      }
    case "import_canceled":
      return {
        ...state,
        importPhase: state.session ? "complete" : "idle",
      }
    case "file_reading":
      return {
        ...state,
        importPhase: "reading",
        error: null,
      }
    case "analysis_started":
      return {
        ...state,
        importPhase: "analyzing",
        error: null,
      }
    case "analysis_succeeded":
      return {
        screen: "overview",
        importPhase: "complete",
        error: null,
        session: action.session,
      }
    case "analysis_failed":
      return {
        ...state,
        screen: "import",
        importPhase: "error",
        error: action.error,
      }
    case "reset":
      return initialAppState
    default:
      return state
  }
}
