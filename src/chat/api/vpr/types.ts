// VPR API Types based on the API documentation

export type VprRelationship = 'self' | 'family' | 'friend' | 'colleague' | 'other'

export interface VprRegisterResponse {
  success: boolean
  message: string
  user_id: string
  person_name: string
  voice_id: string | null
  registration_time: string
}

export interface VprRecognizeRequest {
  file: File | Blob
  user_id?: string
  threshold?: number
}

export interface VprRecognizeResponse {
  success: boolean
  message: string
  user_id?: string
  voice_id?: string
  person_id?: string
  person_name?: string
  is_user?: boolean
  confidence?: number
  similarity?: number
  processing_time_ms?: number
  match_details?: Record<string, unknown>
}

export interface VprPersonInfo {
  person_id: string
  person_name: string
  audio_count: number
  created_at: string
}

export interface VprUserInfo {
  user_id: string
  user_name: string | null
  total_persons: number
  total_audio_features: number
  persons: VprPersonInfo[]
}

export interface VprUsersResponse {
  success: boolean
  users: VprUserInfo[]
  count: number
}

export type VprPersonsResponse = VprPersonInfo[]

export interface VprUserStatsResponse {
  success: boolean
  stats: {
    user_id: string
    user_audio_count: number
    total_persons: number
    total_audio_features: number
    persons_detail: VprPersonInfo[]
    last_updated: string
  }
  message: string
}

export interface VprGlobalStatsResponse {
  success: boolean
  stats: {
    total_users: number
    total_persons: number
    total_audio_features: number
    last_updated: string
    storage_info: {
      storage_type: string
      total_users: number
      base_directory: string
      hnsw_space: string
      collections_per_user: number
    }
    cache_status: {
      cached_users: number
      cache_timeout: number
    }
  }
  message: string
}

export interface VprStorageInfoResponse {
  success: boolean
  storage_info: {
    storage_type: string
    total_users: number
    base_directory: string
    hnsw_space: string
    collections_per_user: number
  }
}

export interface VprCacheClearResponse {
  success: boolean
  message: string
}

export interface VprDeleteUserResponse {
  success: boolean
  message: string
}

export interface VprDeletePersonResponse {
  success: boolean
  message: string
}

export interface VprErrorResponse {
  success: false
  message: string
  error?: string
}

