import { Elysia } from 'elysia'

import {
  recognizeValidator,
  registerValidator,
  updatePersonValidator,
  addVoiceValidator,
  updateVoiceValidator,
} from './model'

export const voiceprintService = new Elysia({
  name: 'voiceprint/service',
}).model({
  recognize: recognizeValidator,
  register: registerValidator,
  updatePerson: updatePersonValidator,
  addVoice: addVoiceValidator,
  updateVoice: updateVoiceValidator,
})
