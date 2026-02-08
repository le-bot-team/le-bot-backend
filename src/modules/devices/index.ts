import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'
import { buildErrorResponse } from '@/utils/common'

import { deviceModel } from './model'
import { Devices, deviceService } from './service'

export const deviceRoute = new Elysia({ prefix: '/api/v1/devices', tags: ['Device'] })
  .use(authService)
  .use(deviceModel)
  .use(deviceService)
  .get(
    '/mine',
    async ({ userId }) => {
      try {
        return await Devices.getOwnerDevices(userId)
      } catch (e) {
        return buildErrorResponse(500, (e as Error).message)
      }
    },
    {
      resolveAccessToken: true,
      response: {
        200: 'ownerDevicesRespBody',
        500: 'errorRespBody',
      },
    },
  )
