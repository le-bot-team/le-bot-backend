import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'

import { authService } from '@/auth/service'
import { db } from '@/database'
import { devices } from '@/database/schema'

import { deviceService } from './service'

export const deviceRoute = new Elysia({ prefix: '/api/v1/device' })
  .use(authService)
  .use(deviceService)
  .get(
    '/mine',
    async ({ userId }) => {
      if (!userId?.length) {
        return {
          success: false,
          message: 'Unauthorized',
        }
      }
      const ownerDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.ownerId, userId))
      return {
        success: true,
        data: {
          devices: ownerDevices,
        },
      }
    },
    {
      checkAccessToken: true,
    },
  )
