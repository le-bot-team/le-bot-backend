import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'

import { voiceprintModel } from './model'
import { Voiceprint, voiceprintService } from './service'

export const voiceprintRoute = new Elysia({ prefix: '/api/v1/voiceprint', tags: ['Voiceprint'] })
  .use(authService)
  .use(voiceprintModel)
  .use(voiceprintService)
  .post('/recognize', async ({ body, userId }) => await Voiceprint.recognize(userId, body.audio), {
    body: 'recognizeReqBody',
    resolveAccessToken: true,
    response: {
      200: 'recognizeRespBody',
      400: 'errorRespBody',
      404: 'errorRespBody',
      500: 'errorRespBody',
    },
  })
  .post('/register', async ({ body, userId }) => await Voiceprint.register(userId, body), {
    body: 'registerReqBody',
    resolveAccessToken: true,
    response: {
      200: 'registerRespBody',
      400: 'errorRespBody',
      500: 'errorRespBody',
    },
  })
  .get('/persons', async ({ userId }) => await Voiceprint.getPersons(userId), {
    resolveAccessToken: true,
    response: {
      200: 'personsRespBody',
      400: 'errorRespBody',
      500: 'errorRespBody',
    },
  })
  .delete(
    '/persons/:personId',
    async ({ params, userId }) => await Voiceprint.deletePerson(userId, params.personId),
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
    async ({ params, userId }) => await Voiceprint.getPerson(userId, params.personId),
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
    async ({ body, params, userId }) =>
      await Voiceprint.updatePerson(userId, params.personId, body),
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
    async ({ body, params, userId }) =>
      await Voiceprint.addVoice(userId, params.personId, body.audio),
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
    async ({ params, userId }) =>
      await Voiceprint.deleteVoice(userId, params.personId, params.voiceId),
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
    async ({ body, params, userId }) =>
      await Voiceprint.updateVoice(userId, params.personId, params.voiceId, body.audio),
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
