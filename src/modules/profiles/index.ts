import { eq } from 'drizzle-orm'
import { BunSQLDatabase } from 'drizzle-orm/bun-sql'
import Elysia from 'elysia'

import { authService } from '@/modules/auth/service'
import { db } from '@/database'
import { userProfiles } from '@/database/schema'

import {
  retrieveProfileInfoValidator,
  updateProfileInfoValidator,
} from './model'
import { profileService } from './service'

const getUserProfileById = async (db: BunSQLDatabase, id: string) => {
  const selectedUsersResult = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, id))
  if (!selectedUsersResult.length) {
    return
  }
  return selectedUsersResult[0]
}

export const profileRoute = new Elysia({ prefix: '/api/v1/profiles' })
  .use(authService)
  .use(profileService)
  .get(
    '/avatar',
    async ({ query: { id }, userId }) => {
      const targetId = id ?? userId
      if (!targetId?.length) {
        return {
          success: false,
          message: 'User ID is required',
        }
      }
      const selectedUser = await getUserProfileById(db, targetId)
      if (!selectedUser) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      return {
        success: true,
        data: {
          id: selectedUser.id,
          avatar: selectedUser.avatar,
          avatarHash: selectedUser.avatarHash,
        },
      }
    },
    {
      query: retrieveProfileInfoValidator,
      checkAccessToken: true,
    },
  )
  .get(
    '/info',
    async ({ query: { id }, userId }) => {
      const targetId = id ?? userId
      if (!targetId?.length) {
        return {
          success: false,
          message: 'User ID is required',
        }
      }
      const selectedUser = await getUserProfileById(db, targetId)
      if (!selectedUser) {
        return {
          success: false,
          message: 'User not found',
        }
      }
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
      checkAccessToken: true,
    },
  )
  .put(
    '/info',
    async ({ body, userId }) => {
      if (!userId?.length) {
        return {
          success: false,
          message: 'User ID is required',
        }
      }
      const selectedUsersResult = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))
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
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userProfiles.id, userId))
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
      checkAccessToken: true,
    },
  )
