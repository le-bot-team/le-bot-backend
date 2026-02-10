import { Elysia } from 'elysia'

import { VprApi } from '@/api/vpr'
import { log } from '@/log'
import { buildErrorResponse, buildSuccessResponse } from '@/utils/common'

import type { RegisterReqBody, UpdatePersonReqBody } from './model'
import {
  deletePersonByUserAndId,
  getPersonByUserAndId,
  getPersonsByUserId,
  insertPerson,
  updatePerson,
} from './repository'

export abstract class Voiceprint {
  static async recognize(userId: string, audio: string) {
    const vprApi = new VprApi(userId)
    const result = await vprApi.recognize(audio)
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }
    const selectPerson = await getPersonByUserAndId(userId, result.data.person_id)
    if (!selectPerson) {
      // Remove person from VPR since not found in DB for this user
      await vprApi.deletePerson(result.data.person_id)
      return buildErrorResponse(404, 'Person not found in database')
    }
    return buildSuccessResponse({
      ...result.data,
      name: selectPerson.name,
      age: selectPerson.age,
      address: selectPerson.address,
      relationship: selectPerson.relationship,
      metadata: selectPerson.metadata,
    })
  }

  static async register(userId: string, data: RegisterReqBody) {
    const vprApi = new VprApi(userId)
    const result = await vprApi.register(data.audio, data.isTemporal)
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }

    const insertResult = await insertPerson({
      id: result.data.person_id,
      userId: userId,
      name: data.name,
      age: data.age,
      address: data.address,
      relationship: data.relationship,
    })
    if (!insertResult.length) {
      // Rollback VPR person creation
      await vprApi.deletePerson(result.data.person_id)
      return buildErrorResponse(500, 'Failed to create person in database')
    }

    return buildSuccessResponse(result.data)
  }

  static async getPersons(userId: string) {
    const vprApi = new VprApi(userId)
    const result = await vprApi.getPersons()
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }
    const selectPersonsResult = await getPersonsByUserId(userId)
    return buildSuccessResponse(
      result.data
        .map((person) => {
          const selectPerson = selectPersonsResult.find(
            (selectPerson) => selectPerson.id === person.person_id,
          )
          if (!selectPerson) {
            // Remove orphaned person from VPR since not found in DB
            vprApi.deletePerson(person.person_id).catch((error) => log.warn(error))
            return undefined
          }
          return {
            ...person,
            name: selectPerson.name,
            age: selectPerson.age,
            address: selectPerson.address,
            relationship: selectPerson.relationship,
            metadata: selectPerson.metadata,
          }
        })
        .filter((person) => person !== undefined),
    )
  }

  static async deletePerson(userId: string, personId: string) {
    const person = await getPersonByUserAndId(userId, personId)
    if (!person) {
      return buildErrorResponse(404, 'Person not found')
    }
    await deletePersonByUserAndId(userId, personId)
    const vprApi = new VprApi(userId)
    const result = await vprApi.deletePerson(personId)
    if (!result.success) {
      log.warn(`Failed to delete person ${personId} from VPR: ${result.message}`)
    }
    return buildSuccessResponse()
  }

  static async getPerson(userId: string, personId: string) {
    const vprApi = new VprApi(userId)
    const result = await vprApi.getPerson(personId)
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }
    const selectPerson = await getPersonByUserAndId(userId, personId)
    if (!selectPerson) {
      // Remove person from VPR since not found in DB
      await vprApi.deletePerson(personId)
      return buildErrorResponse(404, 'Person not found in database')
    }

    return buildSuccessResponse({
      ...result.data,
      name: selectPerson.name,
      age: selectPerson.age,
      address: selectPerson.address,
      relationship: selectPerson.relationship,
      metadata: selectPerson.metadata,
    })
  }

  static async updatePerson(userId: string, personId: string, data: UpdatePersonReqBody) {
    let failedMessage = ''

    const updatePayload: Parameters<typeof updatePerson>[2] = {}
    if (data.name !== undefined) {
      updatePayload.name = data.name
    }
    if (data.relationship !== undefined) {
      updatePayload.relationship = data.relationship
    }
    if (Object.keys(updatePayload).length) {
      const updateResult = await updatePerson(userId, personId, updatePayload)
      if (!updateResult.length) {
        failedMessage += 'Failed to update person metadata in database'
      }
    }

    if (data.isTemporal !== undefined) {
      const result = await new VprApi(userId).updatePerson(personId, {
        isTemporal: data.isTemporal,
      })
      if (!result.success) {
        failedMessage = failedMessage?.length
          ? `${failedMessage}\n${result.message}`
          : result.message
      }
    }

    if (failedMessage?.length) {
      return buildErrorResponse(400, failedMessage)
    }
    return buildSuccessResponse()
  }

  static async addVoice(userId: string, personId: string, audio: string) {
    const result = await new VprApi(userId).addVoice(personId, audio)
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }
    return buildSuccessResponse(result.data)
  }

  static async deleteVoice(userId: string, personId: string, voiceId: string) {
    const result = await new VprApi(userId).deleteVoice(personId, voiceId)
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }
    return buildSuccessResponse()
  }

  static async updateVoice(userId: string, personId: string, voiceId: string, audio: string) {
    const result = await new VprApi(userId).updateVoice(personId, voiceId, {
      audio_data: audio,
    })
    if (!result.success) {
      return buildErrorResponse(400, result.message)
    }
    return buildSuccessResponse()
  }
}

export const voiceprintService = new Elysia({ name: 'voiceprint/service' })
