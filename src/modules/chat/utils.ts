const RESPONSES_FOR_UNRECOGNIZED_ASR = [
  '抱歉，我没听清楚，请您再重复一遍好吗？',
  '信号有点模糊，可以麻烦您重新说一次吗？',
  '刚才的声音好像被风吹走了～ 能再描述一遍您的需求吗？',
  '我好像戴了隔音耳塞… 请大声一点或靠近麦克风说话吧！',
  '您的声音好像被吞掉了，请重新说一遍吧！',
  '抱歉，我暂时无法解析您的语音，可以稍后重试吗？',
  '当前识别结果为空，建议您调整说话方式再试一次～',
  '我好像没接收到信号，请确认麦克风是否开启？',
  '语音内容过于简短，需要更完整的表达才能帮您哦！',
  '抱歉，我没听清楚，请您再说一遍好吗？',
  '信号有点模糊，可以麻烦您重新说一次吗？',
  '刚才的声音好像被风吹走了～ 能再描述一遍吗？',
  '我好像没接收到信号，请确认麦克风是否开启？',
]

export const getResponseForUnrecognizedAsr = (): string => {
  const randomIndex = Math.floor(Math.random() * RESPONSES_FOR_UNRECOGNIZED_ASR.length)
  return RESPONSES_FOR_UNRECOGNIZED_ASR[randomIndex] ?? '抱歉，我没听清楚，请您再重复一遍好吗？'
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
