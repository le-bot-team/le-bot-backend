import { t } from 'elysia'

export const wsRequestUpdateConfigValidator = t.Object({
  id: t.String(),
  action: t.Literal('updateConfig'),
  data: t.Object({
    conversationId: t.Optional(t.String()),
    location: t.Optional(
      t.Object({
        latitude: t.Number({ minimum: -90, maximum: 90 }),
        longitude: t.Number({ minimum: -180, maximum: 180 }),
      }),
    ),
    outputText: t.Optional(t.Boolean()),
    sampleRate: t.Optional(
      t.Object({
        input: t.Number({ minimum: 8000, maximum: 48000 }),
        output: t.Number({ minimum: 8000, maximum: 48000 }),
      }),
    ),
    speechRate: t.Optional(t.Number({ minimum: -50, maximum: 100 })),
    voiceId: t.Optional(t.String()),
  }),
})

export const wsRequestInputAudioStreamValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputAudioStream'),
  data: t.Object({
    buffer: t.String(), // Base64 encoded audio data
  }),
})

export const wsRequestInputAudioCompleteValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputAudioComplete'),
})

export const wsRequestClearContextValidator = t.Object({
  id: t.String(),
  action: t.Literal('clearContext'),
})

export const wsRequestCancelOutputValidator = t.Object({
  id: t.String(),
  action: t.Literal('cancelOutput'),
})

export const wsRequestValidator = t.Union([
  wsRequestUpdateConfigValidator,
  wsRequestInputAudioStreamValidator,
  wsRequestInputAudioCompleteValidator,
  wsRequestClearContextValidator,
  wsRequestCancelOutputValidator
])

export const wsQueryValidator = t.Object({
  token: t.String(),
})
