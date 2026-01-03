import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

import { dbInstance } from '@db/plugin'
import { devices } from '@db/schema'

import { deviceService } from './service'
import { authService } from '@auth/service'

export const deviceRoute = new Elysia({ prefix: '/api/v1/device' })
  .use(authService)
  .use(deviceService)
  .use(dbInstance)
  .get(
    '/mine',
    async ({ userId, db }) => {
      const ownerDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.ownerId, Number(userId)))
      return {
        success: true,
        data: {
          devices: ownerDevices
        },
      }
    },
    {
      checkAccessToken: true,
    },
  )
