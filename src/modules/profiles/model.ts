import { Elysia, t } from 'elysia'

import { buildSuccessRespBody, errorRespBody } from '@/utils/model'

// Request validators
export const retrieveProfileInfoValidator = t.Object({
  id: t.Optional(t.String({ format: 'uuid' })),
})

export const updateProfileInfoValidator = t.Object({
  nickname: t.Optional(t.String({ maxLength: 32 })),
  bio: t.Optional(t.String({ maxLength: 512 })),
  avatar: t.Optional(t.String({ format: 'uri' })),
  region: t.Optional(t.String({ maxLength: 16 })),
})

// Response schemas
export const avatarRespBody = buildSuccessRespBody(
  t.Object({
    id: t.String(),
    avatar: t.Union([t.String(), t.Null()]),
    avatarHash: t.Union([t.String(), t.Null()]),
  }),
)

export const profileInfoRespBody = buildSuccessRespBody(
  t.Object({
    id: t.String(),
    nickname: t.Union([t.String(), t.Null()]),
    bio: t.Union([t.String(), t.Null()]),
    avatarHash: t.Union([t.String(), t.Null()]),
    region: t.Union([t.String(), t.Null()]),
    createdAt: t.Union([t.String(), t.Null()]),
    updatedAt: t.Union([t.String(), t.Null()]),
  }),
)

export const updateProfileRespBody = buildSuccessRespBody()

// TypeScript types
export type RetrieveProfileInfoQuery = typeof retrieveProfileInfoValidator.static
export type UpdateProfileInfoReqBody = typeof updateProfileInfoValidator.static
export type AvatarRespBody = typeof avatarRespBody.static
export type ProfileInfoRespBody = typeof profileInfoRespBody.static
export type UpdateProfileRespBody = typeof updateProfileRespBody.static

// Elysia model plugin
export const profileModel = new Elysia({ name: 'profile/model' }).model({
  retrieveProfileInfo: retrieveProfileInfoValidator,
  updateProfileInfo: updateProfileInfoValidator,
  avatarRespBody,
  profileInfoRespBody,
  updateProfileRespBody,
  errorRespBody,
})
