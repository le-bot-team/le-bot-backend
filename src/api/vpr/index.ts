import { log } from '@log'

import {
  VprRecognizeResponse,
  VprRegisterResponse,
  VprRelationship,
  VprUpdateVoiceRequest,
} from 'src/api/vpr/types'
import {
  deletePerson,
  deleteVoice,
  getPerson,
  getPersons,
  recognize,
  register,
  updatePerson,
  updateVoice,
} from 'src/api/vpr/utils'

export class VprApi {
  private readonly _userId: string
  private _recognitionThreshold: number

  constructor(userId: string, threshold = 0.3) {
    this._userId = userId
    this._recognitionThreshold = threshold
  }

  /**
   * Get recognition threshold
   */
  get threshold(): number {
    return this._recognitionThreshold
  }

  /**
   * Set recognition threshold
   */
  set threshold(value: number) {
    if (value < 0 || value > 1) {
      log.error(
        `Invalid threshold value: ${value}. Must be between 0.0 and 1.0`,
      )
      return
    }
    this._recognitionThreshold = value
    log.info(`Threshold updated to ${value}`)
  }

  /**
   * Recognize a person from audio
   * @param audioBase64 Audio file in Base64 format
   * @returns Recognition result
   */
  async recognize(audioBase64: string): Promise<VprRecognizeResponse> {
    log.debug(
      `Recognizing voice for user ${this._userId} with threshold ${this._recognitionThreshold}`,
    )

    const result = await recognize(this._userId, {
      audio_data: audioBase64,
      threshold: this._recognitionThreshold,
    })

    if (result.success) {
      log.info(
        {
          confidence: result.data.confidence.toFixed(2),
          similarity: result.data.similarity.toFixed(2),
        },
        `Recognition successful: ${result.data.person_name}`,
      )
    } else {
      log.warn(`Recognition failed or no match: ${result.message}`)
    }

    return result
  }

  /**
   * Register a voiceprint for the current user or their contact
   * @param audioBase64 Audio file in Base64 format
   * @param personName Name of the person
   * @param relationship Relationship to user (default: "friend")
   * @param isTemporal Whether the enrollment should be treated as temporal (auto-cleanup)
   * @returns Registration result
   */
  async register(
    audioBase64: string,
    personName = '',
    relationship: VprRelationship = 'other',
    isTemporal = true,
  ): Promise<VprRegisterResponse> {
    log.debug(
      `Registering voice for ${personName} (${relationship}) - User: ${this._userId}`,
    )

    const result = await register(this._userId, {
      audio_data: audioBase64,
      person_name: personName,
      relationship,
      is_temporal: isTemporal,
    })

    if (result.success) {
      log.debug(
        `Successfully registered ${personName}(person_id: ${result.data.person_id}, voice_id: ${result.data.voice_id})`,
      )
    } else {
      log.error(`Failed to register ${personName}: ${result.message}`)
    }

    return result
  }

  /**
   * Get all persons registered for this user
   */
  async getPersons() {
    return getPersons(this._userId)
  }

  /**
   * Delete a person from this user
   * @param personId Person ID to delete
   */
  async deletePerson(personId: string) {
    return deletePerson(this._userId, personId)
  }

  /**
   * Get a person's details by ID
   * @param personId Person ID to retrieve
   */
  async getPerson(personId: string) {
    return getPerson(this._userId, personId)
  }

  /**
   * Update a person's metadata (name, relationship, temporal status)
   * @param personId Person ID to update
   * @param data Update data
   */
  async updatePerson(
    personId: string,
    data: {
      newName?: string
      newRelationship?: VprRelationship
      isTemporal?: boolean
    },
  ) {
    log.info(data, `Updating person info for ${personId}`)
    if (
      !data.newName?.length &&
      !data.newRelationship &&
      data.isTemporal === undefined
    ) {
      log.warn(`No update data provided for person ${personId}`)
      return
    }
    return await updatePerson(this._userId, personId, {
      person_name: data.newName,
      relationship: data.newRelationship,
      is_temporal: data.isTemporal,
    })
  }

  /**
   * Delete a voice by ID
   * @param personId Person ID owning the voice
   * @param voiceId Voice ID to delete
   */
  async deleteVoice(personId: string, voiceId: string) {
    return deleteVoice(this._userId, personId, voiceId)
  }

  /**
   * Update a voice by ID
   * @param personId Person ID owning the voice
   * @param voiceId Voice ID to update
   * @param payload Update data
   */
  async updateVoice(
    personId: string,
    voiceId: string,
    payload: VprUpdateVoiceRequest,
  ) {
    return updateVoice(this._userId, personId, voiceId, payload)
  }
}
