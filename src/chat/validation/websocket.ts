import { t } from 'elysia'

export const wsUpdateConfigRequestValidator = t.Object({
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

export const wsInputAudioStreamRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputAudioStream'),
  data: t.Object({
    buffer: t.String(), // Base64 encoded audio data
  }),
})

export const wsInputAudioCompleteRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('inputAudioComplete'),
  data: t.Object({
    buffer: t.String(), // Base64 encoded audio data (最后一个音频片段)
  }),
})

export const wsClearContextRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('clearContext'),
})

export const wsCancelOutputRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('cancelOutput'),
})

export const wsTtsTestRequestValidator = t.Object({
  id: t.String(),
  action: t.Literal('ttsTest'),
  data: t.Object({
    text: t.String(),
  }),
})

export const wsRequestValidator = t.Union([
  wsUpdateConfigRequestValidator,
  wsInputAudioStreamRequestValidator,
  wsInputAudioCompleteRequestValidator,
  wsClearContextRequestValidator,
  wsCancelOutputRequestValidator,
  wsTtsTestRequestValidator
])

export const wsQueryValidator = t.Object({
  token: t.String(),
})
