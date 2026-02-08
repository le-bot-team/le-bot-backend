import { Elysia } from 'elysia'

import { buildErrorResponse, buildSuccessResponse } from '@/utils/common'

import type { UpdateProfileInfoReqBody } from './model'
import { getUserProfileById, updateUserProfile } from './repository'

export abstract class Profiles {
  static async getAvatar(userId: string) {
    if (!userId?.length) {
      return buildErrorResponse(400, 'User ID is required')
    }
    const selectedUser = await getUserProfileById(userId)
    if (!selectedUser) {
      return buildErrorResponse(404, 'User not found')
    }
    return buildSuccessResponse({
      id: selectedUser.id,
      avatar: selectedUser.avatar,
      avatarHash: selectedUser.avatarHash,
    })
  }

  static async getProfileInfo(userId: string) {
    if (!userId?.length) {
      return buildErrorResponse(400, 'User ID is required')
    }
    const selectedUser = await getUserProfileById(userId)
    if (!selectedUser) {
      return buildErrorResponse(404, 'User not found')
    }
    return buildSuccessResponse({
      id: selectedUser.id,
      nickname: selectedUser.nickname,
      bio: selectedUser.bio,
      avatarHash: selectedUser.avatarHash,
      region: selectedUser.region,
      createdAt: selectedUser.createdAt,
      updatedAt: selectedUser.updatedAt,
    })
  }

  static async updateProfileInfo(
    userId: string,
    data: UpdateProfileInfoReqBody,
  ) {
    if (!userId?.length) {
      return buildErrorResponse(400, 'User ID is required')
    }

    const updateResult = await updateUserProfile(userId, {
      ...data,
      avatarHash: data.avatar
        ? new Bun.CryptoHasher('blake2b512')
            .update(data.avatar)
            .digest('hex')
        : undefined,
      updatedAt: new Date().toISOString(),
    })

    if (!updateResult.length) {
      return buildErrorResponse(404, 'User not found')
    }

    return buildSuccessResponse()
  }
}

export const profileService = new Elysia({ name: 'profile/service' })
