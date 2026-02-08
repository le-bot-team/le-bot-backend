import { Elysia, t } from 'elysia'

import { buildSuccessRespBody, errorRespBody } from '@/utils/model'

// Shared enums
const relationshipEnum = t.Union([
  t.Literal('self'),
  t.Literal('family'),
  t.Literal('friend'),
  t.Literal('colleague'),
  t.Literal('other'),
])

// Request body schemas
const recognizeReqBody = t.Object({
  audio: t.String(),
})

const registerReqBody = t.Object({
  audio: t.String(),
  name: t.String(),
  age: t.Number({ minimum: 0, maximum: 120 }),
  address: t.Optional(t.String()),
  relationship: relationshipEnum,
  isTemporal: t.Optional(t.Boolean()),
})

const updatePersonReqBody = t.Object({
  name: t.Optional(t.String()),
  relationship: t.Optional(relationshipEnum),
  isTemporal: t.Optional(t.Boolean()),
})

const addVoiceReqBody = t.Object({
  audio: t.String(),
})

const updateVoiceReqBody = t.Object({
  audio: t.String(),
})

// DB person fields (nullable per schema)
const personDbFields = {
  name: t.Nullable(t.String()),
  age: t.Nullable(t.Number()),
  address: t.Nullable(t.String()),
  relationship: t.Nullable(relationshipEnum),
  metadata: t.Nullable(t.Unknown()),
}

// Response body schemas
const recognizeRespBody = buildSuccessRespBody(
  t.Object({
    person_id: t.String(),
    voice_id: t.String(),
    confidence: t.Number(),
    similarity: t.Number(),
    processing_time_ms: t.Number(),
    details: t.Array(t.Unknown()),
    ...personDbFields,
  }),
)

const registerRespBody = buildSuccessRespBody(
  t.Object({
    person_id: t.String(),
    voice_id: t.String(),
    voice_count: t.Number(),
    registration_time: t.String(),
  }),
)

const personsRespBody = buildSuccessRespBody(
  t.Array(
    t.Object({
      person_id: t.String(),
      voice_count: t.Number(),
      is_temporal: t.Boolean(),
      expire_date: t.Optional(t.String()),
      ...personDbFields,
    }),
  ),
)

const personRespBody = buildSuccessRespBody(
  t.Object({
    person_id: t.String(),
    is_temporal: t.Boolean(),
    expire_date: t.Optional(t.String()),
    voices: t.Array(
      t.Object({
        voice_id: t.String(),
        feature_vector: t.Array(t.Number()),
        created_at: t.String(),
      }),
    ),
    ...personDbFields,
  }),
)

const addVoiceRespBody = buildSuccessRespBody(
  t.Object({
    person_id: t.String(),
    voice_id: t.String(),
    voice_count: t.Number(),
  }),
)

const deletePersonRespBody = buildSuccessRespBody()
const updatePersonRespBody = buildSuccessRespBody()
const deleteVoiceRespBody = buildSuccessRespBody()
const updateVoiceRespBody = buildSuccessRespBody()

// TypeScript types
export type RegisterReqBody = typeof registerReqBody.static
export type UpdatePersonReqBody = typeof updatePersonReqBody.static

// Elysia model plugin
export const voiceprintModel = new Elysia({ name: 'voiceprint/model' }).model({
  recognizeReqBody,
  registerReqBody,
  updatePersonReqBody,
  addVoiceReqBody,
  updateVoiceReqBody,
  recognizeRespBody,
  registerRespBody,
  personsRespBody,
  personRespBody,
  addVoiceRespBody,
  deletePersonRespBody,
  updatePersonRespBody,
  deleteVoiceRespBody,
  updateVoiceRespBody,
  errorRespBody,
})
