import { Elysia } from 'elysia'

import { VprApi } from '@api/vpr'
import { authService } from '@auth/service'
import { voiceprintService } from '@voiceprint/service'

export const voiceprintRoute = new Elysia({ prefix: '/api/v1/voiceprint' })
  .use(authService)
  .use(voiceprintService)
  .delete(
    '/persons/:personId',
    async ({ params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const result = await new VprApi(userId).deletePerson(params.personId)
      if (!result.success) {
        return {
          success: false,
          message: result.message,
        }
      }
      return {
        success: true,
        data: {
          message: result.message,
        },
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .get(
    '/persons',
    async ({ userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      // const result = await new VprApi(userId).getPersons()
      return {
        success: true,
        data: {
          persons: await new VprApi(userId).getPersons(),
        },
      }
    },
    {
      checkAccessToken: true,
    },
  )
  .post(
    '/register',
    async ({ body, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const result = await new VprApi(userId).register(
        body.audio,
        body.name,
        body.relationship,
        body.is_temporal,
      )
      if (!result.success) {
        return {
          success: false,
          message: result.message,
        }
      }
      return {
        success: true,
        data: {
          message: result.message,
          userId: result.user_id,
          personName: result.person_name,
          voiceId: result.voice_id,
          registrationTime: result.registration_time,
        },
      }
    },
    {
      body: 'registerVoiceprint',
      checkAccessToken: true,
    },
  )
  .put(
    '/persons/:personId',
    async ({ params, userId }) => {
      if (!userId?.length) {
        return { success: false, message: 'Unauthorized' }
      }
      const result = await new VprApi(userId).updatePersonInfo(
        params.personId,
        {},
      )
      if (!result.success) {
        return {
          success: false,
          message: result.message,
        }
      }
      return {
        success: true,
        data: {
          message: result.message,
        },
      }
    },
    {
      checkAccessToken: true,
    },
  )
