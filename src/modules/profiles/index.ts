import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'

import { profileModel } from './model'
import { Profiles, profileService } from './service'

export const profileRoute = new Elysia({ prefix: '/api/v1/profiles', tags: ['Profile'] })
  .use(authService)
  .use(profileModel)
  .use(profileService)
  .get('/avatar', async ({ query: { id }, userId }) => await Profiles.getAvatar(id ?? userId), {
    query: 'retrieveProfileInfo',
    resolveAccessToken: true,
    response: {
      200: 'avatarRespBody',
      400: 'errorRespBody',
      404: 'errorRespBody',
      500: 'errorRespBody',
    },
  })
  .get('/info', async ({ query: { id }, userId }) => await Profiles.getProfileInfo(id ?? userId), {
    query: 'retrieveProfileInfo',
    resolveAccessToken: true,
    response: {
      200: 'profileInfoRespBody',
      400: 'errorRespBody',
      404: 'errorRespBody',
      500: 'errorRespBody',
    },
  })
  .put('/info', async ({ body, userId }) => await Profiles.updateProfileInfo(userId, body), {
    body: 'updateProfileInfo',
    resolveAccessToken: true,
    response: {
      200: 'updateProfileRespBody',
      400: 'errorRespBody',
      404: 'errorRespBody',
      500: 'errorRespBody',
    },
  })
