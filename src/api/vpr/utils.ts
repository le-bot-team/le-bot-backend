import { log } from '@log'

import {
  VprDeletePersonResponse,
  VprDeleteUserResponse,
  VprDeleteVoiceResponse,
  VprGetUserPersons,
  VprGetUsersResponse,
  VprRecognizeRequest,
  VprRecognizeResponse,
  VprRegisterRequest,
  VprRegisterResponse,
  VprUpdatePersonRequest,
  VprUpdatePersonResponse,
  VprUpdateVoiceRequest,
  VprUpdateVoiceResponse,
} from './types'

/**
 * Get all registered users
 */
export const getUsers = async (): Promise<VprGetUsersResponse> => {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users`,
      {
        method: 'GET',
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to get users (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error getting users: ${error}`)
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
): Promise<VprDeleteUserResponse> {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to delete user (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error deleting user: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Recognize user identity from audio
 * @param userId User ID
 * @param payload Recognition payload
 */
export const recognize = async (
  userId: string,
  payload: VprRecognizeRequest,
): Promise<VprRecognizeResponse> => {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/recognize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to recognize voice (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error recognizing voice: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Register user audio with voiceprint features
 * @param userId User ID
 * @param payload Registration payload
 */
export const register = async (
  userId: string,
  payload: VprRegisterRequest,
): Promise<VprRegisterResponse> => {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to register voice (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error registering voice: ${error}`)
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
export const getPersons = async (
  userId: string,
): Promise<VprGetUserPersons> => {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/persons`,
      {
        method: 'GET',
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to get user persons (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error getting user persons: ${error}`)
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
): Promise<VprDeletePersonResponse> {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/persons/${personId}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to delete person (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error deleting person: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Update a person's metadata
 * @param userId User ID
 * @param personId Person ID
 * @param payload Update payload
 */
export async function updatePerson(
  userId: string,
  personId: string,
  payload: VprUpdatePersonRequest,
): Promise<VprUpdatePersonResponse> {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/persons/${personId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to update person (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error updating person: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Delete a voice feature for a user
 * @param userId User ID
 * @param voiceId Voice ID
 */
export async function deleteVoice(
  userId: string,
  voiceId: string,
): Promise<VprDeleteVoiceResponse> {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/voices/${voiceId}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to delete voice (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error deleting voice: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Update a voice feature for a user
 * @param userId User ID
 * @param voiceId Voice ID
 * @param payload Update payload (metadata and/or audio)
 */
export async function updateVoice(
  userId: string,
  voiceId: string,
  payload: VprUpdateVoiceRequest,
): Promise<VprUpdateVoiceResponse> {
  try {
    const response = await Bun.fetch(
      `${process.env.VPR_URL}/api/v1/vpr/users/${userId}/voices/${voiceId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) {
      console.error(response)
      return {
        success: false,
        message: `Failed to update voice (${response.statusText}): ${await response.text()}`,
      }
    }

    return JSON.parse(await response.text())
  } catch (error) {
    log.error(`Error updating voice: ${error}`)
    return {
      success: false,
      message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
