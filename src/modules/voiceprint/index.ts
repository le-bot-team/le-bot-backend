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
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      body: 'recognizeReqBody',
      resolveAccessToken: true,
      response: {
        200: 'recognizeRespBody',
        400: 'errorRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .post(
    '/register',
    async ({ body, userId }) => {
      try {
        return await Voiceprint.register(userId, body)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      body: 'registerReqBody',
      resolveAccessToken: true,
      response: {
        200: 'registerRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .get(
    '/persons',
    async ({ userId }) => {
      try {
        return await Voiceprint.getPersons(userId)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      resolveAccessToken: true,
      response: {
        200: 'personsRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .delete(
    '/persons/:personId',
    async ({ params, userId }) => {
      try {
        return await Voiceprint.deletePerson(userId, params.personId)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      resolveAccessToken: true,
      response: {
        200: 'deletePersonRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .get(
    '/persons/:personId',
    async ({ params, userId }) => {
      try {
        return await Voiceprint.getPerson(userId, params.personId)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      resolveAccessToken: true,
      response: {
        200: 'personRespBody',
        400: 'errorRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .put(
    '/persons/:personId',
    async ({ body, params, userId }) => {
      try {
        return await Voiceprint.updatePerson(userId, params.personId, body)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      body: 'updatePersonReqBody',
      resolveAccessToken: true,
      response: {
        200: 'updatePersonRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .post(
    '/persons/:personId/voices/add',
    async ({ body, params, userId }) => {
      try {
        return await Voiceprint.addVoice(userId, params.personId, body.audio)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      body: 'addVoiceReqBody',
      resolveAccessToken: true,
      response: {
        200: 'addVoiceRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .delete(
    '/persons/:personId/voices/:voiceId',
    async ({ params, userId }) => {
      try {
        return await Voiceprint.deleteVoice(userId, params.personId, params.voiceId)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      resolveAccessToken: true,
      response: {
        200: 'deleteVoiceRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .put(
    '/persons/:personId/voices/:voiceId',
    async ({ body, params, userId }) => {
      try {
        return await Voiceprint.updateVoice(userId, params.personId, params.voiceId, body.audio)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      body: 'updateVoiceReqBody',
      resolveAccessToken: true,
      response: {
        200: 'updateVoiceRespBody',
        400: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
