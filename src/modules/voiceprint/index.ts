import { and, eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

import { VprApi } from '@/api/vpr'
import { authService } from '@/modules/auth/service'
import { db } from '@/database'
import { persons } from '@/database/schema'
import { log } from '@/log'

import { voiceprintService } from './service'

export const voiceprintRoute = new Elysia({ prefix: '/api/v1/voiceprint' })
  .use(authService)
  .use(voiceprintService)
  .post(
    '/recognize',
    async ({ body, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const vprApi = new VprApi(userId)
      const result = await vprApi.recognize(body.audio)
      if (!result.success) {
        return result
      }
      const selectPerson = (
        await db
          .select()
          .from(persons)
          .where(eq(persons.id, result.data.person_id))
          .limit(1)
      )[0]
      if (!selectPerson) {
        // Remove person_id since person not found in DB
        await vprApi.deletePerson(result.data.person_id)
        return { success: false, message: 'Person not found in database' }
      }
      return {
        success: true,
        data: {
          ...result.data,
          name: selectPerson.name,
          age: selectPerson.age,
          address: selectPerson.address,
          relationship: selectPerson.relationship,
          metadata: selectPerson.metadata,
        },
      }
    },
    {
      body: 'recognize',
      checkAccessToken: true,
    },
  )
  .post(
    '/register',
    async ({ body, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const vprApi = new VprApi(userId)
      const result = await vprApi.register(body.audio, body.isTemporal)
      if (!result.success) {
        return result
      }

      const insertResult = await db
        .insert(persons)
        .values({
          id: result.data.person_id,
          userId: userId,
          name: body.name,
          age: body.age,
          address: body.address,
          relationship: body.relationship,
        })
        .returning()
      if (!insertResult.length) {
        // Rollback VPR person creation
        await vprApi.deletePerson(result.data.person_id)
        return {
          success: false,
          message: 'Failed to create person in database',
        }
      }

      return result
    },
    {
      body: 'register',
      checkAccessToken: true,
    },
  )
  .get(
    '/persons',
    async ({ userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const vprApi = new VprApi(userId)
      const result = await vprApi.getPersons()
      if (!result.success) {
        return result
      }
      const selectPersonsResult = await db
        .select()
        .from(persons)
        .where(eq(persons.userId, userId))
      if (!selectPersonsResult.length) {
        // Remove user from VPR since no persons found in DB
        await vprApi.deleteUser()
        return { success: false, message: 'No persons found in database' }
      }
      return {
        success: true,
        data: result.data
          .map((person) => {
            const selectPerson = selectPersonsResult.find(
              (selectPerson) => selectPerson.id === person.person_id,
            )
            if (!selectPerson) {
              // Remove person from VPR since not found in DB
              vprApi
                .deletePerson(person.person_id)
                .catch((error) => log.warn(error))
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
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .delete(
    '/persons/:personId',
    async ({ params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      return await new VprApi(userId).deletePerson(params.personId)
    },
    {
      checkAccessToken: true,
    },
  )
  .get(
    '/persons/:personId',
    async ({ params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const vprApi = new VprApi(userId)
      const result = await vprApi.getPerson(params.personId)
      if (!result.success) {
        return result
      }
      const selectPerson = (
        await db
          .select()
          .from(persons)
          .where(
            and(eq(persons.userId, userId), eq(persons.id, params.personId)),
          )
      )[0]
      if (!selectPerson) {
        // Remove person from VPR since not found in DB
        await vprApi.deletePerson(params.personId)
        return { success: false, message: 'Person not found in database' }
      }

      return {
        success: true,
        data: {
          ...result.data,
          name: selectPerson.name,
          age: selectPerson.age,
          address: selectPerson.address,
          relationship: selectPerson.relationship,
          metadata: selectPerson.metadata,
        },
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .put(
    '/persons/:personId',
    async ({ body, params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }

      let failedMessage = ''

      const updatePayload: Record<string, unknown> = {}
      if (body.name !== undefined) {
        updatePayload['name'] = body.name
      }
      if (body.relationship !== undefined) {
        updatePayload['relationship'] = body.relationship
      }
      if (Object.keys(updatePayload).length) {
        const insertResult = await db
          .update(persons)
          .set(updatePayload)
          .where(
            and(eq(persons.id, params.personId), eq(persons.userId, userId)),
          )
          .returning()
        if (!insertResult.length) {
          failedMessage += 'Failed to update person metadata in database'
        }
      }

      if (body.isTemporal !== undefined) {
        const result = await new VprApi(userId).updatePerson(params.personId, {
          isTemporal: body.isTemporal,
        })
        if (!result.success) {
          failedMessage = failedMessage?.length
            ? `${failedMessage}\n${result.message}`
            : result.message
        }
      }

      return failedMessage?.length
        ? { success: false, message: failedMessage }
        : { success: true }
    },
    {
      body: 'updatePerson',
      checkAccessToken: true,
    },
  )
  .post(
    '/persons/:person_id/voices/add',
    async ({ body, params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      return await new VprApi(userId).addVoice(params.person_id, body.audio)
    },
    {
      body: 'addVoice',
      checkAccessToken: true,
    },
  )
  .delete(
    '/persons/:personId/voices/:voiceId',
    async ({ params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      return await new VprApi(userId).deleteVoice(
        params.personId,
        params.voiceId,
      )
    },
    {
      checkAccessToken: true,
    },
  )
  .put(
    '/persons/:personId/voices/:voiceId',
    async ({ body, params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      return await new VprApi(userId).updateVoice(
        params.personId,
        params.voiceId,
        {
          audio_data: body.audio,
        },
      )
    },
    {
      body: 'updateVoice',
      checkAccessToken: true,
    },
  )
