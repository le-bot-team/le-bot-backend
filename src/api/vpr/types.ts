export interface VprEmptyResponse {
  success: true
}

export interface VprErrorResponse {
  success: false
  message: string
}

export type VprGetUsersResponse =
  | VprErrorResponse
  | {
      success: true
      data: {
        user_id: string
        total_persons: number
        total_voices: number
        temporal_voice_count: number
      }[]
    }

export type VprDeleteUserResponse = VprEmptyResponse | VprErrorResponse

export interface VprRecognizeRequest {
  audio_data: string
  threshold?: number
}

export type VprRecognizeResponse =
  | VprErrorResponse
  | {
      success: true
      data: {
        person_id: string
        voice_id: string
        confidence: number
        similarity: number
        processing_time_ms: number
        details: Record<string, unknown>[]
      }
    }

export interface VprRegisterRequest {
  audio_data: string
  is_temporal?: boolean
}

export type VprRegisterResponse =
  | VprErrorResponse
  | {
      success: true
      data: {
        person_id: string
        voice_id: string
        voice_count: number
        registration_time: string
      }
    }

export type VprGetUserPersons =
  | VprErrorResponse
  | {
      success: true
      data: {
        person_id: string
        voice_count: number
        is_temporal: boolean
        expire_date?: string
      }[]
    }

export type VprDeletePersonResponse = VprEmptyResponse | VprErrorResponse

export type VprGetUserPerson =
  | VprErrorResponse
  | {
      success: true
      data: {
        person_id: string
        is_temporal: boolean
        expire_date?: string
        voices: {
          voice_id: string
          feature_vector: number[]
          created_at: string
        }[]
      }
    }

export interface VprUpdatePersonRequest {
  is_temporal: boolean
}

export type VprUpdatePersonResponse = VprEmptyResponse | VprErrorResponse

export interface VprAddVoiceRequest {
  audio_data: string
}

export type VprAddVoiceResponse =
  | VprErrorResponse
  | {
      success: true
      data: {
        person_id: string
        voice_id: string
        voice_count: number
      }
    }

export type VprDeleteVoiceResponse = VprEmptyResponse | VprErrorResponse

export interface VprUpdateVoiceRequest {
  audio_data: string
}

export type VprUpdateVoiceResponse = VprEmptyResponse | VprErrorResponse
