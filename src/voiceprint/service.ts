import { Elysia } from 'elysia'
import { registerVoiceprintValidator } from '@voiceprint/validation'

export const voiceprintService = new Elysia({ name: 'voiceprint/service' }).model({
  registerVoiceprint: registerVoiceprintValidator,
})
