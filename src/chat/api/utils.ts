import { RESPONSES_FOR_UNRECOGNIZED_ASR } from './dify/constants'

export const getResponseForUnrecognizedAsr = () => {
  const randomIndex = Math.floor(
    Math.random() * RESPONSES_FOR_UNRECOGNIZED_ASR.length,
  )
  return RESPONSES_FOR_UNRECOGNIZED_ASR[randomIndex]
}
