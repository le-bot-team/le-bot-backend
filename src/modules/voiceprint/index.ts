import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'
import { buildErrorResponse } from '@/utils/common'

import { voiceprintModel } from './model'
import { Voiceprint, voiceprintService } from './service'

export const voiceprintRoute = new Elysia({ prefix: '/api/v1/voiceprint', tags: ['Voiceprint'] })
  .use(authService)
  .use(voiceprintModel)
  .use(voiceprintService)
  .post(
    '/recognize',
    async ({ body, userId }) => {
      try {
        return await Voiceprint.recognize(userId, body.audio)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      body: 'recognizeReqBody',
      checkAccessToken: true,
    },
  )
  .post(
    '/register',
    async ({ body, userId }) => {
      try {
        return await Voiceprint.register(userId, body)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      body: 'registerReqBody',
      checkAccessToken: true,
    },
  )
  .get(
    '/persons',
    async ({ userId }) => {
      try {
        return await Voiceprint.getPersons(userId)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .delete(
    '/persons/:personId',
    async ({ params, userId }) => {
      try {
        return await Voiceprint.deletePerson(userId, params.personId)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .get(
    '/persons/:personId',
    async ({ params, userId }) => {
      try {
        return await Voiceprint.getPerson(userId, params.personId)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .put(
    '/persons/:personId',
    async ({ body, params, userId }) => {
      try {
        return await Voiceprint.updatePerson(userId, params.personId, body)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      body: 'updatePersonReqBody',
      checkAccessToken: true,
    },
  )
  .post(
    '/persons/:person_id/voices/add',
    async ({ body, params, userId }) => {
      try {
        return await Voiceprint.addVoice(userId, params.person_id, body.audio)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      body: 'addVoiceReqBody',
      checkAccessToken: true,
    },
  )
  .delete(
    '/persons/:personId/voices/:voiceId',
    async ({ params, userId }) => {
      try {
        return await Voiceprint.deleteVoice(
          userId,
          params.personId,
          params.voiceId,
        )
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .put(
    '/persons/:personId/voices/:voiceId',
    async ({ body, params, userId }) => {
      try {
        return await Voiceprint.updateVoice(
          userId,
          params.personId,
          params.voiceId,
          body.audio,
        )
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      body: 'updateVoiceReqBody',
      checkAccessToken: true,
    },
  )
