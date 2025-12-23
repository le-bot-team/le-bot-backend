import { log } from '@log'

import {
  VprCacheClearResponse,
  VprDeletePersonResponse,
  VprDeleteUserResponse,
  VprErrorResponse,
  VprGlobalStatsResponse,
  VprPersonsResponse,
  VprRecognizeResponse,
  VprRegisterResponse,
  VprStorageInfoResponse,
  VprUserStatsResponse,
  VprUsersResponse,
  VprRegisterOptions,
  VprCleanupTemporalResponse,
} from './types'

/**
 * Register user audio with voiceprint features
 * @param file Audio file (supported formats: .wav, .mp3, .flac, .m4a, .ogg, .aac)
 * @param userId User unique identifier
 * @param personName Person name
 * @param options Optional relationship label and temporal enrollment flag
 */
export async function registerVoice(
  file: File | Blob,
  userId: string,
  personName: string,
  options?: VprRegisterOptions,
): Promise<VprRegisterResponse | VprErrorResponse> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)
    formData.append('person_name', personName)
    if (options?.relationship) {
      formData.append('relationship', options.relationship)
    }
    if (typeof options?.is_temporal === 'boolean') {
      formData.append('is_temporal', String(options.is_temporal))
    }

    const response = await fetch(`${process.env.VPR_BASE_URL}/register`, {
      method: 'POST',
      body: formData,
    })

    const data = (await response.json()) as
      | VprRegisterResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to register voice: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info(
      'VPR',
      `Successfully registered voice for ${personName} (${userId})`,
    )
    return data
  } catch (error) {
    log.error('VPR', `Error registering voice: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Recognize user identity from audio
 * @param file Audio file
 * @param userId Optional user ID to search within specific user
 * @param threshold Recognition threshold (0.0-1.0, default: 0.6)
 * @param refreshTemporal When true, refreshes matched temporal vectors' TTL to avoid cleanup
 */
export async function recognizeVoice(
  file: File | Blob,
  userId?: string,
  threshold = 0.6,
  refreshTemporal?: boolean,
): Promise<VprRecognizeResponse | VprErrorResponse> {
  try {
    const formData = new FormData()
    formData.append('file', file)
    if (userId) {
      formData.append('user_id', userId)
    }
    formData.append('threshold', threshold.toString())
    if (typeof refreshTemporal === 'boolean') {
      formData.append('refresh_temporal', String(refreshTemporal))
    }

    const response = await fetch(`${process.env.VPR_BASE_URL}/recognize`, {
      method: 'POST',
      body: formData,
    })

    const data = (await response.json()) as
      | VprRecognizeResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to recognize voice: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    const successData = data as VprRecognizeResponse
    log.info('VPR', `Voice recognition result: ${successData.message}`)
    return data
  } catch (error) {
    log.error('VPR', `Error recognizing voice: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get all registered users
 */
export async function getUsers(): Promise<VprUsersResponse | VprErrorResponse> {
  try {
    const response = await fetch(`${process.env.VPR_BASE_URL}/users`, {
      method: 'GET',
    })

    const data = (await response.json()) as VprUsersResponse | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to get users: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    return data
  } catch (error) {
    log.error('VPR', `Error getting users: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get all persons for a specific user
 * @param userId User ID
 */
export async function getUserPersons(
  userId: string,
): Promise<VprPersonsResponse | VprErrorResponse> {
  try {
    const response = await fetch(
      `${process.env.VPR_BASE_URL}/users/${userId}/persons`,
      {
        method: 'GET',
      },
    )

    const data = (await response.json()) as
      | VprPersonsResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to get user persons: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    return data
  } catch (error) {
    log.error('VPR', `Error getting user persons: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get user statistics
 * @param userId User ID
 */
export async function getUserStats(
  userId: string,
): Promise<VprUserStatsResponse | VprErrorResponse> {
  try {
    const response = await fetch(
      `${process.env.VPR_BASE_URL}/stats/${userId}`,
      {
        method: 'GET',
      },
    )

    const data = (await response.json()) as
      | VprUserStatsResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to get user stats: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    return data
  } catch (error) {
    log.error('VPR', `Error getting user stats: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get global statistics
 */
export async function getGlobalStats(): Promise<
  VprGlobalStatsResponse | VprErrorResponse
> {
  try {
    const response = await fetch(`${process.env.VPR_BASE_URL}/stats`, {
      method: 'GET',
    })

    const data = (await response.json()) as
      | VprGlobalStatsResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to get global stats: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    return data
  } catch (error) {
    log.error('VPR', `Error getting global stats: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Get storage information
 */
export async function getStorageInfo(): Promise<
  VprStorageInfoResponse | VprErrorResponse
> {
  try {
    const response = await fetch(`${process.env.VPR_BASE_URL}/storage/info`, {
      method: 'GET',
    })

    const data = (await response.json()) as
      | VprStorageInfoResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to get storage info: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    return data
  } catch (error) {
    log.error('VPR', `Error getting storage info: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Clear memory cache
 */
export async function clearCache(): Promise<
  VprCacheClearResponse | VprErrorResponse
> {
  try {
    const response = await fetch(`${process.env.VPR_BASE_URL}/cache/clear`, {
      method: 'POST',
    })

    const data = (await response.json()) as
      | VprCacheClearResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to clear cache: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info('VPR', 'Cache cleared successfully')
    return data
  } catch (error) {
    log.error('VPR', `Error clearing cache: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Delete user and all associated data (use with caution)
 * @param userId User ID
 */
export async function deleteUser(
  userId: string,
): Promise<VprDeleteUserResponse | VprErrorResponse> {
  try {
    const response = await fetch(
      `${process.env.VPR_BASE_URL}/users/${userId}`,
      {
        method: 'DELETE',
      },
    )

    const data = (await response.json()) as
      | VprDeleteUserResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to delete user: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.warn('VPR', `User ${userId} and all data deleted`)
    return data
  } catch (error) {
    log.error('VPR', `Error deleting user: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Delete a person and all their audio from a user
 * @param userId User ID
 * @param personId Person ID
 */
export async function deletePerson(
  userId: string,
  personId: string,
): Promise<VprDeletePersonResponse | VprErrorResponse> {
  try {
    const response = await fetch(
      `${process.env.VPR_BASE_URL}/users/${userId}/persons/${personId}`,
      {
        method: 'DELETE',
      },
    )

    const data = (await response.json()) as
      | VprDeletePersonResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to delete person: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info('VPR', `Person ${personId} deleted from user ${userId}`)
    return data
  } catch (error) {
    log.error('VPR', `Error deleting person: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Manually cleanup expired temporal vectors
 * @param userId Optional user ID to limit cleanup scope
 */
export async function cleanupTemporal(
  userId?: string,
): Promise<VprCleanupTemporalResponse | VprErrorResponse> {
  try {
    const url = new URL(`${process.env.VPR_BASE_URL}/cleanup-temporal`)
    if (userId) {
      url.searchParams.set('user_id', userId)
    }

    const response = await fetch(url, {
      method: 'POST',
    })

    const data = (await response.json()) as
      | VprCleanupTemporalResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        'VPR',
        `Failed to cleanup temporal vectors: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info('VPR', `Temporal cleanup finished (user: ${userId ?? 'all'})`)
    return data
  } catch (error) {
    log.error('VPR', `Error cleaning temporal vectors: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
