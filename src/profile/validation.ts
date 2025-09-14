import { t } from 'elysia'

export const retrieveProfileInfoValidator = t.Object({
  id: t.BigInt(),
})

export const updateProfileInfoValidator = t.Object({
  id: t.Number(),
  nickname: t.Optional(t.String({ maxLength: 32 })),
  bio: t.Optional(t.String({ maxLength: 512 })),
  avatar: t.Optional(t.String({ format: 'uri' })),
  region: t.Optional(t.String({ maxLength: 16 })),
})
