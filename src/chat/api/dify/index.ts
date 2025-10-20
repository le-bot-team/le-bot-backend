import { log } from '@log'

import { STREAM_DATA_PREFIX } from './constants'
import { DifyEvent } from './types'

export class DifyApi {
  onConversationId: ((conversationId: string) => void) | undefined
  onUpdate: ((text: string) => void) | undefined

  private _abortController: AbortController | undefined

  constructor(
    private readonly _userId: bigint,
    private readonly _nickname: string,
  ) {}

  abort(): void {
    this._abortController?.abort()
    this._abortController = undefined
  }

  async chatMessage(
    conversationId: string,
    query: string,
    isNew: boolean,
  ): Promise<string> {
    this._abortController = new AbortController()

    const response = await Bun.fetch(`${process.env.DIFY_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          name: this._nickname,
          first_chat: isNew.toString(),
        },
        query,
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: this._userId.toString(),
      }),
      signal: this._abortController.signal,
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
    let conversationIdReturned = false
    let fullAnswer = ''
    let finished = false

    try {
      while (!finished) {
        // Check if aborted
        if (this._abortController?.signal.aborted) {
          log.info('[DifyApi] Streaming aborted')
          break
        }

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
            if (!conversationIdReturned && difyEvent.conversation_id.length) {
              log.info(
                `[DifyApi] Conversation ID received: ${difyEvent.conversation_id}`,
              )
              this.onConversationId?.(difyEvent.conversation_id)
              conversationIdReturned = true
            }

            if (
              difyEvent.event === 'node_finished' &&
              difyEvent.data.title === 'casual_conversation'
            ) {
              finished = true
              break
            }

            if (difyEvent.event === 'message') {
              fullAnswer += difyEvent.answer
              this.onUpdate?.(fullAnswer)
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
