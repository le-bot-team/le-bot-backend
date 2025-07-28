import { log } from '@log'

import { DifyStreamMessage } from './types'

export class DifyApi {
  onMessage: ((segment: string) => void) | undefined

  constructor(
    private readonly _baseUrl: string,
    private readonly _userId: bigint,
  ) {}

  async chatMessage(
    conversationId: string,
    query: string,
    inputs: Record<string, string> = {},
  ): Promise<string> {
    const response = await fetch(`${this._baseUrl}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: this._userId.toString(),
      }),
    })

    if (!response.ok || !response.body) {
      const errorBody = await response.json()
      throw new Error(
        `ChatMessage HTTP error! status: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorBody)}`,
      )
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullAnswer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue
          }
          try {
            const jsonStr = trimmedLine.substring(6)
            const data: DifyStreamMessage = JSON.parse(jsonStr)
            if (data.event === 'message' && data.answer) {
              fullAnswer += data.answer
              this.onMessage?.(data.answer)

              log.debug(`Received message chunk: ${data.answer}`)
            }
          } catch (parseError) {
            log.warn(
              `Failed to parse streaming data: ${trimmedLine}`,
              parseError,
            )
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return fullAnswer
  }
}
