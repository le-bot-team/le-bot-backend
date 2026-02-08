/** Client request sent over WebSocket */
export interface ChatRequest {
  user_id: string
  message: string
  person_id?: string | null
  session_id?: string
  context?: Record<string, unknown>
  owner_name?: string
  audio_data?: string
  audio_format?: string
}

/** Server response: start of processing */
export interface ChatStartResponse {
  type: 'start'
  data: {
    content: string
    request_id: string
    has_audio: boolean
    metadata: {
      intent: string
      source: string
    }
  }
}

/** Server response: content chunk */
export interface ChatChunkResponse {
  type: 'chunk'
  data: {
    content: string
    metadata: {
      finished: boolean
    }
  }
}

/** Server response: end of streaming */
export interface ChatEndResponse {
  type: 'end'
  data: {
    content: string
    metadata: {
      response_length: number
      engine: string
      source: string
    }
  }
}

/** Server response: error */
export interface ChatErrorResponse {
  type: 'error'
  data: {
    error: string
  }
}

export type ChatResponse =
  | ChatStartResponse
  | ChatChunkResponse
  | ChatEndResponse
  | ChatErrorResponse
