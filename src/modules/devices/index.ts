import { Elysia } from 'elysia'

import { authService } from '@/modules/auth/service'

import { deviceModel } from './model'
import { Devices, deviceService } from './service'

export const deviceRoute = new Elysia({ prefix: '/api/v1/devices', tags: ['Device'] })
  .use(authService)
  .use(deviceModel)
  .use(deviceService)
  .get('/mine', async ({ userId }) => await Devices.getOwnerDevices(userId), {
    resolveAccessToken: true,
    response: {
      200: 'ownerDevicesRespBody',
      500: 'errorRespBody',
    },
  })
