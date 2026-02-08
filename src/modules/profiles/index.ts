import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'
import { buildErrorResponse } from '@/utils/common'

import { profileModel } from './model'
import { Profiles, profileService } from './service'

export const profileRoute = new Elysia({ prefix: '/api/v1/profiles', tags: ['Profile'] })
  .use(authService)
  .use(profileModel)
  .use(profileService)
  .get(
    '/avatar',
    async ({ query: { id }, userId }) => {
      try {
        return await Profiles.getAvatar(id ?? userId)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      query: 'retrieveProfileInfo',
      resolveAccessToken: true,
      response: {
        200: 'avatarRespBody',
        400: 'errorRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .get(
    '/info',
    async ({ query: { id }, userId }) => {
      try {
        return await Profiles.getProfileInfo(id ?? userId)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      query: 'retrieveProfileInfo',
      resolveAccessToken: true,
      response: {
        200: 'profileInfoRespBody',
        400: 'errorRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
  .put(
    '/info',
    async ({ body, userId }) => {
      try {
        return await Profiles.updateProfileInfo(userId, body)
      } catch (error) {
        return buildErrorResponse(500, (error as Error).message)
      }
    },
    {
      body: 'updateProfileInfo',
      resolveAccessToken: true,
      response: {
        200: 'updateProfileRespBody',
        400: 'errorRespBody',
        404: 'errorRespBody',
        500: 'errorRespBody',
      },
    },
  )
