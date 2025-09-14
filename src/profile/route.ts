import { dbInstance } from '@db/plugin'
import { userProfiles } from '@db/schema'
import { eq } from 'drizzle-orm'
import Elysia from 'elysia'

import { profileService } from './service'
import {
  retrieveProfileInfoValidator,
  updateProfileInfoValidator,
} from './validation'

export const profileRoute = new Elysia({ prefix: '/api/v1/profile' })
  .use(profileService)
  .use(dbInstance)
  .get(
    '/info',
    async ({ query: { id }, db }) => {
      const selectedUsersResult = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, Number(id)))
      if (!selectedUsersResult.length) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      const selectedUser = selectedUsersResult[0]
      return {
        success: true,
        data: {
          id: selectedUser.id,
          nickname: selectedUser.nickname,
          bio: selectedUser.bio,
          avatarHash: selectedUser.avatarHash,
          region: selectedUser.region,
          createdAt: selectedUser.createdAt,
          updatedAt: selectedUser.updatedAt,
        },
      }
    },
    {
      query: retrieveProfileInfoValidator,
    },
  )
  .put(
    '/info',
    async ({ body, db }) => {
      const selectedUsersResult = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, Number(body.id)))
      if (!selectedUsersResult.length) {
        return {
          success: false,
          message: 'User not found',
        }
      }

      const updateResult = await db
        .update(userProfiles)
        .set({
          ...body,
          avatarHash: body.avatar
            ? new Bun.CryptoHasher('blake2b512')
                .update(body.avatar)
                .digest('hex')
            : undefined,
          updatedAt: Date.now(),
        })
        .where(eq(userProfiles.id, body.id))
        .returning({ id: userProfiles.id })

      if (!updateResult.length) {
        return {
          success: false,
          message: 'Failed to update profile',
        }
      }

      return {
        success: true,
      }
    },
    {
      body: updateProfileInfoValidator,
    },
  )
