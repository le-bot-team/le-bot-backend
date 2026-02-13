import { log } from '@/log'

import type { ChatRequest, ChatResponse } from './types'

export class ChatApi {
  onConversationId: ((conversationId: string) => void) | undefined
  onUpdate: ((text: string) => void) | undefined

  private _ws: WebSocket | undefined
  private _isAborted = false
  private _resolveChat: ((answer: string) => void) | undefined
  private _rejectChat: ((error: Error) => void) | undefined

  constructor(
    private readonly _userId: string,
    private readonly _nickname: string,
  ) {}

  abort(): void {
    this._isAborted = true

    // Reject current chat promise with AbortError
    if (this._rejectChat) {
      this._rejectChat(new DOMException('Chat aborted', 'AbortError'))
      this._resolveChat = undefined
      this._rejectChat = undefined
    }

    // Force-terminate WebSocket
    if (this._ws) {
      this._ws.onopen = null
      this._ws.onclose = null
      this._ws.onmessage = null
      this._ws.close()
      this._ws = undefined
    }
  }

  async chatMessage(
    conversationId: string,
    timeZone: string,
    query: string,
    isNew: boolean,
    personId?: string,
  ): Promise<string> {
    this._isAborted = false

    return new Promise<string>((resolve, reject) => {
      this._resolveChat = resolve
      this._rejectChat = reject

      const chatApiUrl = Bun.env.CHAT_API_URL?.replace(/^http/, 'ws')
      const wsUrl = `${chatApiUrl}/api/chat/chat/${personId || 'default'}`

      log.info({ wsUrl, personId }, '[ChatApi] Connecting to chat WebSocket')

      this._ws = new WebSocket(wsUrl)

      let fullAnswer = ''

      this._ws.onclose = () => {
        if (this._ws) {
          this._ws.onopen = null
          this._ws.onclose = null
          this._ws.onmessage = null
          this._ws = undefined
        }
        // If promise not yet settled, resolve with partial answer
        if (this._resolveChat) {
          this._resolveChat(fullAnswer)
          this._resolveChat = undefined
          this._rejectChat = undefined
        }
      }

      this._ws.onerror = () => {
        log.error('[ChatApi] WebSocket connection error')
      }

      this._ws.onopen = () => {
        if (this._isAborted) return

        const request: ChatRequest = {
          user_id: this._userId,
          message: query,
          person_id: personId || null,
          session_id: conversationId || undefined,
          owner_name: this._nickname,
        }

        log.info(
          { userId: this._userId, personId, hasSession: !!conversationId },
          '[ChatApi] Sending chat message',
        )
        this._ws?.send(JSON.stringify(request))
      }

      this._ws.onmessage = (event) => {
        if (this._isAborted) return

        try {
          const response: ChatResponse = JSON.parse(
            typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data),
          )

          switch (response.type) {
            case 'start': {
              const requestId = response.data.request_id
              log.info(
                { requestId, intent: response.data.metadata?.intent },
                '[ChatApi] Stream started',
              )
              // Use request_id as session identifier if no conversationId was provided
              if (!conversationId && requestId) {
                this.onConversationId?.(requestId)
              }
              break
            }

            case 'chunk': {
              fullAnswer += response.data.content
              this.onUpdate?.(fullAnswer)
              break
            }

            case 'end': {
              log.info(
                {
                  fullAnswer,
                  responseLength: response.data.metadata?.response_length,
                  engine: response.data.metadata?.engine,
                },
                '[ChatApi] Stream ended',
              )
              if (this._resolveChat) {
                this._resolveChat(fullAnswer)
                this._resolveChat = undefined
                this._rejectChat = undefined
              }
              this._ws?.close()
              break
            }

            case 'error': {
              const errorMsg = response.data.error
              log.error({ error: errorMsg }, '[ChatApi] Server error received')
              if (this._rejectChat) {
                this._rejectChat(new Error(errorMsg))
                this._resolveChat = undefined
                this._rejectChat = undefined
              }
              this._ws?.close()
              break
            }
          }
        } catch (e) {
          log.warn(e as Error, '[ChatApi] Failed to parse message')
        }
      }
    })
  }
}
