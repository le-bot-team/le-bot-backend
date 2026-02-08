import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'
import { buildErrorResponse } from '@/utils/common'

import { Devices, deviceService } from './service'

export const deviceRoute = new Elysia({ prefix: '/api/v1/devices', tags: ['Device'] })
  .use(authService)
  .use(deviceService)
  .get(
    '/mine',
    async ({ userId }) => {
      try {
        return await Devices.getOwnerDevices(userId)
      } catch (error) {
        return buildErrorResponse(
          500,
          error instanceof Error ? error.message : 'Internal server error',
        )
      }
    },
    {
      checkAccessToken: true,
      response: {
        200: 'ownerDevicesResp',
        500: 'errorResp',
      },
    },
  )
