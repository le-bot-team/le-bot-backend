import { log } from '@log'

import {
  VprErrorResponse,
  VprRecognizeResponse,
  VprRegisterResponse,
  VprRelationship,
} from './types'
import {
  clearCache,
  cleanupTemporal,
  deletePerson,
  deleteUser,
  getGlobalStats,
  getStorageInfo,
  getUserPersons,
  getUserStats,
  getUsers,
  recognizeVoice,
  registerVoice,
} from './utils'

export class VprApi {
  private readonly _userId: string
  private _defaultThreshold: number

  constructor(userId: bigint, threshold = 0.6) {
    this._userId = userId.toString()
    this._defaultThreshold = threshold
  }

  /**
   * Register a voiceprint for the current user or their contact
   * @param audioFile Audio file (File or Blob)
   * @param personName Name of the person
   * @param relationship Relationship to user (default: "friend")
   * @param isTemporal Whether the enrollment should be treated as temporal (auto-cleanup)
   * @returns Registration result
   */
  async register(
    audioFile: File | Blob,
    personName: string,
    relationship: VprRelationship,
    isTemporal?: boolean,
  ): Promise<VprRegisterResponse | VprErrorResponse> {

    log.info('VPR', `Registering voice for ${personName} (${relationship}) - User: ${this._userId}`)

    const result = await registerVoice(audioFile, this._userId, personName, {
      relationship,
      is_temporal: isTemporal,
    })

    if (result.success) {
      log.info(
        'VPR',
        `Successfully registered ${personName}: ${(result as VprRegisterResponse).voice_id || 'N/A'}`,
      )
    } else {
      log.error('VPR', `Failed to register ${personName}: ${result.message}`)
    }

    return result
  }

  /**
   * Recognize a person from audio
   * @param audioFile Audio file to recognize
   * @param threshold Custom threshold (optional, uses default if not provided)
   * @param refreshTemporal When true, refreshes the temporal feature TTL for matched voices
   * @returns Recognition result
   */
  async recognize(
    audioFile: File | Blob,
    threshold?: number,
    refreshTemporal?: boolean,
  ): Promise<VprRecognizeResponse | VprErrorResponse> {

    const recognitionThreshold = threshold ?? this._defaultThreshold

    log.info(
      'VPR',
      `Recognizing voice for user ${this._userId} with threshold ${recognitionThreshold}`,
    )

    const result = await recognizeVoice(
      audioFile,
      this._userId,
      recognitionThreshold,
      refreshTemporal,
    )

    if (result.success && 'person_name' in result) {
      const recognizeResult = result as VprRecognizeResponse
      log.info(
        'VPR',
        `Recognition successful: ${recognizeResult.person_name} (confidence: ${recognizeResult.confidence?.toFixed(2) || 'N/A'}, similarity: ${recognizeResult.similarity?.toFixed(2) || 'N/A'})`,
      )
    } else {
      log.warn('VPR', `Recognition failed or no match: ${result.message}`)
    }

    return result
  }

  /**
   * Get recognition threshold
   */
  get threshold(): number {
    return this._defaultThreshold
  }

  /**
   * Set recognition threshold
   */
  set threshold(value: number) {
    if (value < 0 || value > 1) {
      log.error('VPR', `Invalid threshold value: ${value}. Must be between 0.0 and 1.0`)
      return
    }
    this._defaultThreshold = value
    log.info('VPR', `Threshold updated to ${value}`)
  }

  /**
   * Get user ID
   */
  get userId(): string {
    return this._userId
  }

  /**
   * Get all persons registered for this user
   */
  async getPersons() {

    return getUserPersons(this._userId)
  }

  /**
   * Get statistics for this user
   */
  async getStats() {

    return getUserStats(this._userId)
  }

  /**
   * Delete a person from this user
   * @param personId Person ID to delete
   */
  async deletePerson(personId: string) {

    return deletePerson(this._userId, personId)
  }

  /**
   * Delete all data for this user (use with extreme caution!)
   */
  async deleteAllData() {

    log.warn('VPR', `Deleting all data for user ${this._userId}`)
    return deleteUser(this._userId)
  }

  /**
   * Cleanup expired temporal vectors
   * @param userId Optional override to target another user; defaults to this instance user
   */
  async cleanupTemporal(userId?: string) {

    return cleanupTemporal(userId ?? this._userId)
  }
}

// Export utility functions for advanced usage
export {
  clearCache,
  cleanupTemporal,
  deleteUser,
  deletePerson,
  getGlobalStats,
  getStorageInfo,
  getUsers,
  getUserPersons,
  getUserStats,
  recognizeVoice,
  registerVoice,
}

// Export types
export type * from './types'
