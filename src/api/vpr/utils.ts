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
  VprCleanupTemporalResponse,
  VprRecognizeRequest,
  VprRegisterRequest,
  VprRelationship,
} from './types'

/**
 * Register user audio with voiceprint features
 * @param audioBase64 Audio file in Base64 format
 * @param userId User unique identifier
 * @param personName Person name
 * @param relationship Relationship to user
 * @param isTemporal Whether the enrollment should be treated as temporal (auto-cleanup)
 */
export async function registerVoice(
  audioBase64: string,
  userId: string,
  personName: string,
  relationship: VprRelationship,
  isTemporal = false,
): Promise<VprRegisterResponse | VprErrorResponse> {
  try {
    const payload: VprRegisterRequest = {
      audio_data: audioBase64,
      user_id: userId,
      person_name: personName,
      relationship: relationship,
      is_temporal: isTemporal,
    }

    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )

    const data = (await response.json()) as
      | VprRegisterResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        `Failed to register voice: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info(`Successfully registered voice for ${personName} (${userId})`)
    return data
  } catch (error) {
    log.error(`Error registering voice: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Recognize user identity from audio
 * @param audioBase64 Audio file in Base64 format
 * @param userId Optional user ID to search within specific user
 * @param threshold Recognition threshold (0.0-1.0, default: 0.6)
 * @param refreshTemporal When true, refreshes matched temporal vectors' TTL to avoid cleanup
 */
export async function recognizeVoice(
  audioBase64: string,
  userId?: string,
  threshold = 0.6,
  refreshTemporal?: boolean,
): Promise<VprRecognizeResponse | VprErrorResponse> {
  try {
    const payload: VprRecognizeRequest = {
      audio_data: audioBase64,
      threshold,
    }
    if (userId) {
      payload.user_id = userId
    }
    if (refreshTemporal !== undefined) {
      payload.refresh_temporal = refreshTemporal
    }

    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/recognize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )

    const data = (await response.json()) as
      | VprRecognizeResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        `Failed to recognize voice: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    const successData = data as VprRecognizeResponse
    log.info(`Voice recognition result: ${successData.message}`)
    return data
  } catch (error) {
    log.error(`Error recognizing voice: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/users`,
      {
        method: 'GET',
      },
    )

    const data = (await response.json()) as VprUsersResponse | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
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
    log.error(`Error getting users: ${error}`)
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
    console.log(`${process.env.VPR_URL}/api/v4/vpr/users/${userId}/persons`)
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/users/${userId}/persons`,
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
    log.error(`Error getting user persons: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/stats/${userId}`,
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
    log.error(`Error getting user stats: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/stats`,
      {
        method: 'GET',
      },
    )

    const data = (await response.json()) as
      | VprGlobalStatsResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
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
    log.error(`Error getting global stats: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/storage/info`,
      {
        method: 'GET',
      },
    )

    const data = (await response.json()) as
      | VprStorageInfoResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
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
    log.error(`Error getting storage info: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/cache/clear`,
      {
        method: 'POST',
      },
    )

    const data = (await response.json()) as
      | VprCacheClearResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        `Failed to clear cache: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info('Cache cleared successfully')
    return data
  } catch (error) {
    log.error(`Error clearing cache: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/users/${userId}`,
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
        `Failed to delete user: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.warn(`User ${userId} and all data deleted`)
    return data
  } catch (error) {
    log.error(`Error deleting user: ${error}`)
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
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v4/vpr/users/${userId}/persons/${personId}`,
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
        `Failed to delete person: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info(`Person ${personId} deleted from user ${userId}`)
    return data
  } catch (error) {
    log.error(`Error deleting person: ${error}`)
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
    const url = new URL(`${process.env.VPR_URL}/api/v4/vpr/cleanup-temporal`)
    if (userId) {
      url.searchParams.set('user_id', userId)
    }

    const response = await Bun.fetch(url, {
      method: 'POST',
    })

    const data = (await response.json()) as
      | VprCleanupTemporalResponse
      | VprErrorResponse

    if (!response.ok) {
      const errorData = data as VprErrorResponse
      log.error(
        `Failed to cleanup temporal vectors: ${errorData.message || response.statusText}`,
      )
      return {
        success: false,
        message: errorData.message || response.statusText,
        error: 'error' in errorData ? errorData.error : undefined,
      }
    }

    log.info(`Temporal cleanup finished (user: ${userId ?? 'all'})`)
    return data
  } catch (error) {
    log.error(`Error cleaning temporal vectors: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Update person information (name, relationship, temporal status)
 * @param userId User ID
 * @param personId Person ID to update
 * @param data Update data
 */
export const updatePersonInfo = async (
  userId: string,
  personId: string,
  data: {
    newName?: string
    newRelationship?: string
    isTemporal?: boolean
  },
): Promise<VprErrorResponse> => {
  log.info(data, `Updating ${userId}'s person info for ${personId}`)
  return {
    success: false,
    message: 'Not implemented yet',
  }
}
