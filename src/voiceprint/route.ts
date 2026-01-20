import { Elysia } from 'elysia'

import { VprApi } from '@api/vpr'
import { authService } from '@auth/service'
import { voiceprintService } from '@voiceprint/service'

export const voiceprintRoute = new Elysia({ prefix: '/api/v1/voiceprint' })
  .use(authService)
  .use(voiceprintService)
  .post(
    '/recognize',
    async ({ body, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      return await new VprApi(userId).recognize(body.audio)
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
      return await new VprApi(userId).register(
        body.audio,
        body.name,
        body.relationship,
        body.isTemporal,
      )
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
      return await new VprApi(userId).getPersons()
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
      return await new VprApi(userId).getPerson(params.personId)
    },
    {
      checkAccessToken: true,
    },
  )
  .put(
    '/persons/:personId',
    async ({ params, body, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      return await new VprApi(userId).updatePerson(params.personId, {
        newName: body.name,
        newRelationship: body.relationship,
        isTemporal: body.isTemporal,
      })
    },
    {
      body: 'updatePerson',
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
    async ({ params, body, userId }) => {
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
