export type ImportResult<TAnalysis, TMessage> = {
  analysis: TAnalysis
  messages: TMessage[]
}

export type ImportedChatSource = {
  file: File
  sourceName: string
}
