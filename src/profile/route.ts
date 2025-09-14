import { dbInstance } from '@db/plugin'
import { userProfiles, users } from '@db/schema'
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
        .where(eq(userProfiles.id, id))
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
        .where(eq(userProfiles.id, body.id))
      if (!selectedUsersResult.length) {
        return {
          success: false,
          message: 'User not found',
        }
      }

      let updateBuilder = db.update(userProfiles).set({}).where(eq(userProfiles.id, body.id))

      if (body.nickname !== undefined) {
        updateBuilder = updateBuilder.set({ nickname: body.nickname })
      }
      if (body.bio !== undefined) {
        updateBuilder.set({ bio: body.bio })
      }
      if (body.avatar !== undefined) {
        updateBuilder.set({
          avatar: body.avatar,
          avatarHash: new Bun.CryptoHasher('blake2b512')
            .update(body.avatar)
            .digest('hex'),
        })
      }

      const updateResult = await updateBuilder
        .returning({ id: users.id })
      if (!updateResult.length) {
        return {
          success: false,
          message: 'Failed to update password',
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
