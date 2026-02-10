/** Wake API request body */
export interface WakeRequest {
  user_id: string
  person_id?: string | null
  message?: string
  owner_name?: string
  context?: Record<string, unknown>
}

/** Wake API response: start of processing */
export interface WakeStartResponse {
  type: 'start'
  data: {
    content: string
    request_id: string
    source: 'wake_response'
    metadata: {
      person_id?: string
      timestamp: string
      time_of_day: string
    }
  }
}

/** Wake API response: content chunk */
export interface WakeChunkResponse {
  type: 'chunk'
  data: {
    content: string
    metadata: {
      is_appended_question: boolean
    }
  }
}

/** Wake API response: complete */
export interface WakeCompleteResponse {
  type: 'complete'
  data: {
    content: string
    metadata: {
      status: string
      requires_input: boolean
      user_id: string
    }
  }
}

/** Wake API response: error */
export interface WakeErrorResponse {
  type: 'error'
  data: {
    error: string
  }
}

export type WakeResponse =
  | WakeStartResponse
  | WakeChunkResponse
  | WakeCompleteResponse
  | WakeErrorResponse
