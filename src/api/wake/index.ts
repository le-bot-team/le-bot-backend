import { log } from '@/log'

import type { WakeRequest, WakeResponse } from './types'

export class WakeApi {
  onUpdate: ((text: string) => void) | undefined
  onComplete: ((text: string) => void) | undefined

  private _isAborted = false
  private _resolveWake: ((answer: string) => void) | undefined
  private _rejectWake: ((error: Error) => void) | undefined

  constructor(
    private readonly _userId: string,
    private readonly _nickname: string,
  ) {}

  abort(): void {
    this._isAborted = true

    if (this._rejectWake) {
      this._rejectWake(new DOMException('Wake request aborted', 'AbortError'))
      this._resolveWake = undefined
      this._rejectWake = undefined
    }
  }

  async wakeResponse(personId?: string | null, message?: string): Promise<string> {
    this._isAborted = false

    return new Promise<string>((resolve, reject) => {
      this._resolveWake = resolve
      this._rejectWake = reject

      const wakeApiUrl = Bun.env.CHAT_API_URL
      const url = `${wakeApiUrl}/api/wake/response`

      log.info({ url, personId, message }, '[WakeApi] Sending wake request')

      const request: WakeRequest = {
        user_id: this._userId,
        person_id: personId || null,
        message: message || undefined,
        owner_name: this._nickname,
      }

      let fullAnswer = ''

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
          }

          if (!response.body) {
            throw new Error('No response body')
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()

          while (true) {
            if (this._isAborted) {
              reader.cancel()
              break
            }

            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value, { stream: true })
            const lines = text.split('\n').filter((line) => line.trim())

            for (const line of lines) {
              try {
                const data: WakeResponse = JSON.parse(line)
                this._handleResponse(data, fullAnswer, (newAnswer) => {
                  fullAnswer = newAnswer
                })
              } catch {
                // Skip non-JSON lines
              }
            }
          }

          if (this._resolveWake) {
            log.debug({ fullAnswer }, '[WakeApi] Stream finished, resolving promise')
            this._resolveWake(fullAnswer)
            this._resolveWake = undefined
            this._rejectWake = undefined
          }
        })
        .catch((error) => {
          log.error(error, '[WakeApi] Request failed')
          if (this._rejectWake) {
            this._rejectWake(error)
            this._resolveWake = undefined
            this._rejectWake = undefined
          }
        })
    })
  }

  private _handleResponse(
    response: WakeResponse,
    currentAnswer: string,
    updateAnswer: (answer: string) => void,
  ): void {
    switch (response.type) {
      case 'start': {
        log.info(
          {
            requestId: response.data.request_id,
            personId: response.data.metadata?.person_id,
            timeOfDay: response.data.metadata?.time_of_day,
          },
          '[WakeApi] Stream started',
        )
        break
      }

      case 'chunk': {
        const newAnswer = currentAnswer + response.data.content
        updateAnswer(newAnswer)
        this.onUpdate?.(newAnswer)
        break
      }

      case 'complete': {
        log.info(
          {
            status: response.data.metadata?.status,
            requiresInput: response.data.metadata?.requires_input,
          },
          '[WakeApi] Stream completed',
        )
        this.onComplete?.(response.data.content)
        break
      }

      case 'error': {
        log.error({ error: response.data.error }, '[WakeApi] Server error')
        break
      }
    }
  }
}
