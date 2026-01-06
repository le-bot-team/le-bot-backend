import { t } from 'elysia'

export const registerVoiceprintValidator = t.Object({
  audio: t.String(),
  name: t.String(),
  relationship: t.Union([
    t.Literal('self'),
    t.Literal('family'),
    t.Literal('friend'),
    t.Literal('colleague'),
    t.Literal('other'),
  ]),
  is_temporal: t.Optional(t.Boolean()),
})
