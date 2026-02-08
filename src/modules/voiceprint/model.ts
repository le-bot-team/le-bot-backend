import { Elysia, t } from 'elysia'

const relationshipEnum = t.Union([
  t.Literal('self'),
  t.Literal('family'),
  t.Literal('friend'),
  t.Literal('colleague'),
  t.Literal('other'),
])

export const recognizeReqBody = t.Object({
  audio: t.String(),
})

export const registerReqBody = t.Object({
  audio: t.String(),
  name: t.String(),
  age: t.Number({ minimum: 0, maximum: 120 }),
  address: t.Optional(t.String()),
  relationship: relationshipEnum,
  isTemporal: t.Optional(t.Boolean()),
})

export const updatePersonReqBody = t.Object({
  name: t.Optional(t.String()),
  relationship: t.Optional(relationshipEnum),
  isTemporal: t.Optional(t.Boolean()),
})

export const addVoiceReqBody = t.Object({
  audio: t.String(),
})

export const updateVoiceReqBody = t.Object({
  audio: t.String(),
})

export type RecognizeReqBody = typeof recognizeReqBody.static
export type RegisterReqBody = typeof registerReqBody.static
export type UpdatePersonReqBody = typeof updatePersonReqBody.static
export type AddVoiceReqBody = typeof addVoiceReqBody.static
export type UpdateVoiceReqBody = typeof updateVoiceReqBody.static

export const voiceprintModel = new Elysia({ name: 'voiceprint/model' }).model({
  recognizeReqBody,
  registerReqBody,
  updatePersonReqBody,
  addVoiceReqBody,
  updateVoiceReqBody,
})
