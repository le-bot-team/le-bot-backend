import { Elysia, t } from 'elysia'

// WebSocket request validators
const wsUpdateConfigRequestValidator = t.Object({
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
    timezone: t.Optional(t.String()),
    voiceId: t.Optional(t.String()),
  }),
})

const wsInputAudioStreamRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputAudioStream'),
  data: t.Object({
    buffer: t.String(),
  }),
})

const wsInputAudioCompleteRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputAudioComplete'),
  data: t.Object({
    buffer: t.String(),
  }),
})

const wsClearContextRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('clearContext'),
})

const wsCancelOutputRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('cancelOutput'),
})

const wsInputWakeAudioRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputWakeAudio'),
  data: t.Object({
    buffer: t.String(),
  }),
})

const wsRequestValidator = t.Union([
  wsUpdateConfigRequestValidator,
  wsInputAudioStreamRequestValidator,
  wsInputAudioCompleteRequestValidator,
  wsInputWakeAudioRequestValidator,
  wsClearContextRequestValidator,
  wsCancelOutputRequestValidator,
])

const wsQueryValidator = t.Object({
  token: t.String(),
})

// Elysia model plugin
export const chatModel = new Elysia({ name: 'chat.model' }).model({
  wsRequest: wsRequestValidator,
  wsQuery: wsQueryValidator,
})

// TypeScript type exports (derived from validators for use by other files)
export type WsRequest = typeof wsRequestValidator.static
export type WsUpdateConfigRequest = typeof wsUpdateConfigRequestValidator.static
