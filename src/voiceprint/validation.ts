import { t } from 'elysia'

const relationshipEnum = t.Union([
  t.Literal('self'),
  t.Literal('family'),
  t.Literal('friend'),
  t.Literal('colleague'),
  t.Literal('other'),
])

export const recognizeValidator = t.Object({
  audio: t.String(),
})

export const registerValidator = t.Object({
  audio: t.String(),
  name: t.String(),
  age: t.Number({ minimum: 0, maximum: 120 }),
  address: t.Optional(t.String()),
  relationship: relationshipEnum,
  isTemporal: t.Optional(t.Boolean()),
})

export const updatePersonValidator = t.Object({
  name: t.Optional(t.String()),
  relationship: t.Optional(relationshipEnum),
  isTemporal: t.Optional(t.Boolean()),
})

export const addVoiceValidator = t.Object({
  audio: t.String(),
})

export const updateVoiceValidator = t.Object({
  audio: t.String(),
})
