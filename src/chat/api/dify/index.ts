import { log } from '@log'

import { STREAM_DATA_PREFIX } from './constants'
import { DifyEvent } from './types'

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

    log.info({ status: response.status }, '[DifyApi] Streaming answer started')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullAnswer = ''
    let finished = false

    try {
      while (!finished) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith(STREAM_DATA_PREFIX)) {
            continue
          }
          try {
            const difyEvent: DifyEvent = JSON.parse(
              trimmedLine.substring(STREAM_DATA_PREFIX.length),
            )
            if (
              difyEvent.event === 'node_finished' &&
              difyEvent.data.title === 'casual_conversation'
            ) {
              finished = true
              break
            }

            if (difyEvent.event === 'message') {
              fullAnswer += difyEvent.answer
              this.onMessage?.(difyEvent.answer)
              log.debug(`[DifyApi] Received message chunk: ${difyEvent.answer}`)
            }
          } catch (parseError) {
            log.warn(
              `[DifyApi] Failed to parse streaming data: ${trimmedLine}`,
              parseError,
            )
          }
        }

        if (finished) {
          log.info(
            `[DifyApi] Finished streaming answer for conversation ${conversationId}`,
          )
          break
        }
      }
    } finally {
      reader.releaseLock()
    }

    log.info({ fullAnswer }, '[DifyApi] Streaming answer finished')

    return fullAnswer
  }
}
