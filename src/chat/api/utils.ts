import { RESPONSES_FOR_UNRECOGNIZED_ASR } from './dify/constants'

export const getResponseForUnrecognizedAsr = () => {
  const randomIndex = Math.floor(
    Math.random() * RESPONSES_FOR_UNRECOGNIZED_ASR.length,
  )
  return RESPONSES_FOR_UNRECOGNIZED_ASR[randomIndex]
}

export const isValidTimezone = (timezone: string) => {
  try {
    // Attempt to create an Intl.DateTimeFormat object with the given timezone.
    // If the timezone is invalid, this will throw a RangeError.
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true // Timezone is valid
  } catch (error) {
    if (error instanceof RangeError) {
      return false // Invalid timezone
    }
    throw error // Re-throw other types of errors
  }
}
