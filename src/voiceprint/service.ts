import { Elysia } from 'elysia'
import {
  recognizeValidator,
  registerValidator,
  updatePersonValidator,
  updateVoiceValidator,
} from '@voiceprint/validation'

export const voiceprintService = new Elysia({ name: 'voiceprint/service' }).model({
  recognize: recognizeValidator,
  register: registerValidator,
  updatePerson: updatePersonValidator,
  updateVoice: updateVoiceValidator,
})
