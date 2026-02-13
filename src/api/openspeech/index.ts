import { log } from '@/log'

import {
  CompressionType,
  MessageFlagType,
  MessageType,
  ResponseType,
  SerializationType,
  TtsEventType,
} from './types'
import {
  createAsrRequestData,
  createTtsRequestData,
  parseResponseMessage,
  serializeRequestMessage,
} from './utils'

export class AsrApi {
  private _connectionPromise?: Promise<boolean>
  private _isReady = false
  private _sequenceNumber = 1
  private _utteranceNumber = 0
  private _ws: WebSocket | undefined

  onFinish: ((recognized: string) => void) | undefined
  onUpdate: ((text: string) => void) | undefined

  constructor(
    private readonly _connectId: string,
    private readonly _userId: string,
    private readonly _deviceId: string,
  ) {}

  /**
   * One-shot ASR: recognize a complete audio buffer and return the text.
   * This creates a temporary connection, sends all audio, waits for result, and closes.
   */
  static async recognizeOnce(
    userId: string,
    deviceId: string,
    audioBase64: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const connectId = Bun.randomUUIDv7()
      let recognizedText = ''
      let isResolved = false

      const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream', {
        headers: {
          'X-Api-Access-Key': Bun.env.OPENSPEECH_ACCESS_TOKEN,
          'X-Api-App-Key': Bun.env.OPENSPEECH_APP_ID,
          'X-Api-Resource-Id': 'volc.seedasr.sauc.duration',
          'X-Api-Connect-Id': connectId,
        },
      })

      const cleanup = () => {
        ws.onopen = null
        ws.onclose = null
        ws.onmessage = null
        ws.close()
      }

      // Set timeout for the entire operation
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          cleanup()
          reject(new Error('ASR recognition timeout'))
        }
      }, 30000)

      ws.onclose = () => {
        clearTimeout(timeout)
        if (!isResolved) {
          isResolved = true
          // If we have some recognized text, return it; otherwise reject
          if (recognizedText.length > 0) {
            resolve(recognizedText)
          } else {
            reject(new Error('ASR connection closed without result'))
          }
        }
        cleanup()
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        if (!isResolved) {
          isResolved = true
          cleanup()
          reject(new Error('ASR WebSocket error'))
        }
      }

      ws.onopen = () => {
        // Send initial request
        ws.send(
          serializeRequestMessage(
            MessageType.fullClientRequest,
            MessageFlagType.positiveSequence,
            SerializationType.none,
            CompressionType.gzip,
            1,
            [createAsrRequestData(userId, deviceId)],
          ),
        )
      }

      let sequenceNumber = 2
      let isReadyToSend = false

      ws.onmessage = (event) => {
        try {
          const message = parseResponseMessage(event.data.buffer)

          if (message.responseType === ResponseType.errorResponse) {
            log.warn({ message }, '[AsrApi.recognizeOnce] Error response')
            clearTimeout(timeout)
            if (!isResolved) {
              isResolved = true
              cleanup()
              reject(new Error('ASR error response'))
            }
            return
          }

          if (message.responseType === ResponseType.ttsResponse) {
            return
          }

          // First response (seq=1) means ready to send audio
          if (message.sequenceNumber === 1 && !isReadyToSend) {
            isReadyToSend = true
            // Send all audio data at once with isLast=true
            const audioData = Uint8Array.fromBase64(audioBase64)
            ws.send(
              serializeRequestMessage(
                MessageType.audioOnlyRequest,
                MessageFlagType.negativeSequence,
                SerializationType.none,
                CompressionType.gzip,
                -sequenceNumber,
                [audioData],
              ),
            )
          } else if (message.serializationType === SerializationType.json) {
            const { result } = message.data
            // Get the final text from utterances or result.text
            if (result.utterances && result.utterances.length > 0) {
              const lastUtterance = result.utterances[result.utterances.length - 1]
              if (lastUtterance?.definite) {
                recognizedText = lastUtterance.text ?? ''
                log.info(
                  { text: recognizedText },
                  '[AsrApi.recognizeOnce] Final utterance recognized',
                )
                clearTimeout(timeout)
                if (!isResolved) {
                  isResolved = true
                  cleanup()
                  resolve(recognizedText)
                }
              }
            } else if (result.text) {
              recognizedText = result.text
            }
          }
        } catch (e) {
          log.warn(e as Error, '[AsrApi.recognizeOnce] Failed to parse message')
        }
      }
    })
  }

  sendAudioBase64(audioDataBase64: string, isLast = false): boolean {
    if (!this._ws || !this._isReady) {
      return false
    }

    const audioData = Uint8Array.fromBase64(audioDataBase64)
    const messageFlag = isLast ? MessageFlagType.negativeSequence : MessageFlagType.positiveSequence
    const currentSeq = isLast ? -this._sequenceNumber : this._sequenceNumber

    if (!isLast) {
      this._sequenceNumber++
    }

    this._ws.send(
      serializeRequestMessage(
        MessageType.audioOnlyRequest,
        messageFlag,
        SerializationType.none,
        CompressionType.gzip,
        currentSeq,
        [audioData],
      ),
    )
    return true
  }

  close() {
    this._ws?.close()
    this._isReady = false
    this._sequenceNumber = 1
  }

  get isConnected(): boolean {
    return !!(this._ws && this._isReady)
  }

  get isConnecting(): boolean {
    return !!this._connectionPromise
  }

  async connect(): Promise<boolean> {
    if (this._connectionPromise) {
      return this._connectionPromise
    }

    if (this._ws && this._isReady) {
      return true
    }

    this._connectionPromise = new Promise<boolean>((resolve) => {
      this._ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream', {
        headers: {
          'X-Api-Access-Key': Bun.env.OPENSPEECH_ACCESS_TOKEN,
          'X-Api-App-Key': Bun.env.OPENSPEECH_APP_ID,
          'X-Api-Resource-Id': 'volc.seedasr.sauc.duration',
          'X-Api-Connect-Id': this._connectId,
        },
      })

      if (!this._ws) {
        this._connectionPromise = undefined
        resolve(false)
        return
      }

      this._ws.onclose = () => {
        this._isReady = false
        this._sequenceNumber = 1
        if (this._ws) {
          this._ws.onopen = null
          this._ws.onclose = null
          this._ws = undefined
        }
        this._connectionPromise = undefined
        resolve(false)
      }

      this._ws.onopen = () => {
        this._ws?.send(
          serializeRequestMessage(
            MessageType.fullClientRequest,
            MessageFlagType.positiveSequence,
            SerializationType.none,
            CompressionType.gzip,
            this._sequenceNumber,
            [createAsrRequestData(this._userId, this._deviceId)],
          ),
        )
        this._sequenceNumber++
      }

      this._ws.onmessage = async (event) => {
        try {
          const message = parseResponseMessage(event.data.buffer)

          if (message.responseType === ResponseType.errorResponse) {
            log.warn({ message }, '[AsrApi] Error response received')
            this._isReady = false
            this._connectionPromise = undefined
            resolve(false)
            return
          }

          if (message.responseType === ResponseType.ttsResponse) {
            log.warn('[AsrApi] Received TTS response instead of ASR')
            this._isReady = false
            this._connectionPromise = undefined
            resolve(false)
            return
          }

          if (message.sequenceNumber === 1) {
            this._isReady = true
            this._connectionPromise = undefined
            resolve(true)
          } else if (message.serializationType === SerializationType.json) {
            const { result } = message.data
            const currentUtterance = result.utterances?.[this._utteranceNumber]
            if (currentUtterance) {
              if (currentUtterance.definite) {
                this.onFinish?.(currentUtterance.text)
                this._utteranceNumber++
                log.info({ text: currentUtterance.text }, '[AsrApi] Utterance recognized')
              } else {
                this.onUpdate?.(currentUtterance.text)
              }
            }
          }
        } catch (e) {
          log.warn(e as Error, '[AsrApi] Failed to parse message')
          this._isReady = false
          this._connectionPromise = undefined
          resolve(false)
        }
      }
    })

    return this._connectionPromise
  }
}

export class TtsApi {
  private _connectionPromise?: Promise<boolean>
  private _connectionId?: string
  private _startSessionPromise?: Promise<boolean>
  private _sessionId?: string
  private _onSessionStarted: ((sessionId: string) => void) | undefined
  private _finishSessionPromise?: Promise<boolean>
  private _onSessionFinished: (() => void) | undefined

  private readonly _voiceType = 'zh_female_vv_uranus_bigtts'
  private _ws: WebSocket | undefined

  onAudioData: ((audioData: Uint8Array) => void) | undefined
  onFinish: (() => void) | undefined

  constructor(
    private readonly _connectId: string,
    private readonly _userId: string,
  ) {}

  async startSession(): Promise<boolean> {
    if (this._startSessionPromise) {
      return this._startSessionPromise
    }

    if (this._ws && this._connectionId?.length && this._sessionId?.length) {
      return true
    }

    this._startSessionPromise = new Promise<boolean>((resolve) => {
      this._ws?.send(
        serializeRequestMessage(
          MessageType.fullClientRequest,
          MessageFlagType.withEvent,
          SerializationType.json,
          CompressionType.none,
          TtsEventType.startSession,
          [
            Bun.randomUUIDv7(),
            createTtsRequestData(this._userId, TtsEventType.startSession, this._voiceType),
          ],
        ),
      )
      this._onSessionStarted = (sessionId: string) => {
        this._sessionId = sessionId
        resolve(true)
        this._onSessionStarted = undefined
        this._finishSessionPromise = undefined
      }
    })

    return this._startSessionPromise
  }

  async finishSession(): Promise<boolean> {
    if (this._finishSessionPromise) {
      return this._finishSessionPromise
    }

    this._finishSessionPromise = new Promise<boolean>((resolve) => {
      if (!this._ws || !this._connectionId?.length || !this._sessionId?.length) {
        resolve(true)
        return
      }

      this._ws.send(
        serializeRequestMessage(
          MessageType.fullClientRequest,
          MessageFlagType.withEvent,
          SerializationType.json,
          CompressionType.none,
          TtsEventType.finishSession,
          [this._sessionId, {}],
        ),
      )
      this._onSessionFinished = () => {
        this._sessionId = undefined
        resolve(true)
        this._onSessionFinished = undefined
        this._startSessionPromise = undefined
      }
    })

    return this._finishSessionPromise
  }

  sendText(text: string): boolean {
    if (!this._ws || !this._connectionId?.length || !this._sessionId?.length) {
      return false
    }

    this._ws.send(
      serializeRequestMessage(
        MessageType.fullClientRequest,
        MessageFlagType.withEvent,
        SerializationType.json,
        CompressionType.none,
        TtsEventType.taskRequest,
        [
          this._sessionId,
          createTtsRequestData(this._userId, TtsEventType.taskRequest, this._voiceType, text),
        ],
      ),
    )
    return true
  }

  close() {
    this._ws?.close()
  }

  abort(): void {
    log.info('[TtsApi] Aborting TTS session')
    // Clear state immediately
    this._connectionPromise = undefined
    this._connectionId = undefined
    this._startSessionPromise = undefined
    this._sessionId = undefined
    this._onSessionStarted = undefined
    this._onSessionFinished = undefined

    // Force-terminate the WebSocket connection
    if (this._ws) {
      this._ws.onopen = null
      this._ws.onclose = null
      this._ws.onmessage = null
      this._ws.terminate()
      this._ws = undefined
    }
  }

  get isConnected(): boolean {
    return !!(
      this._ws &&
      this._ws.readyState === WebSocket.OPEN &&
      this._connectionId?.length &&
      this._sessionId?.length
    )
  }

  get isConnecting(): boolean {
    return !!this._connectionPromise
  }

  async connect(): Promise<boolean> {
    if (this._connectionPromise) {
      return this._connectionPromise
    }

    // If there was a previous connection that has disconnected, clean up state to allow reconnection
    if (this._ws && this._connectionId?.length) {
      return true
    }

    this._connectionPromise = new Promise<boolean>((resolve) => {
      this._ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/tts/bidirection', {
        headers: {
          'X-Api-Access-Key': Bun.env.OPENSPEECH_ACCESS_TOKEN,
          'X-Api-App-Key': Bun.env.OPENSPEECH_APP_ID,
          'X-Api-Resource-Id': 'seed-tts-2.0',
          'X-Api-Connect-Id': this._connectId,
        },
      })

      if (!this._ws) {
        this._connectionPromise = undefined
        resolve(false)
        return
      }

      this._ws.onclose = () => {
        log.info('[TtsApi] WebSocket closed')
        this._connectionPromise = undefined
        this._connectionId = undefined
        this._startSessionPromise = undefined
        this._sessionId = undefined
        this._onSessionStarted = undefined
        this._onSessionFinished = undefined

        if (this._ws) {
          this._ws.onopen = null
          this._ws.onclose = null
          this._ws.onmessage = null
          this._ws = undefined
        }
      }

      this._ws.onopen = () => {
        this._ws?.send(
          serializeRequestMessage(
            MessageType.fullClientRequest,
            MessageFlagType.withEvent,
            SerializationType.json,
            CompressionType.none,
            TtsEventType.startConnection,
            [{}],
          ),
        )
      }

      this._ws.onmessage = async (event) => {
        try {
          const message = parseResponseMessage(event.data.buffer)

          if (message.responseType === ResponseType.errorResponse) {
            log.warn({ message }, '[TtsApi] Error response received')
            this.close()
            resolve(false)
            return
          }

          if (message.responseType === ResponseType.asrResponse) {
            log.warn('[TtsApi] Received ASR response instead of TTS')
            this.close()
            resolve(false)
            return
          }

          switch (message.eventType) {
            case TtsEventType.connectionStarted:
              this._connectionId = message.id
              this._connectionPromise = undefined
              resolve(true)
              break

            case TtsEventType.sessionStarted:
              this._onSessionStarted?.(message.id)
              break

            case TtsEventType.sessionFinished:
              this._onSessionFinished?.()
              break

            case TtsEventType.ttsSentenceEnd:
              // Sentence audio finished, trigger onFinish callback
              this.onFinish?.()
              break

            case TtsEventType.ttsResponse:
              if (message.data instanceof Uint8Array) {
                this.onAudioData?.(message.data)
              } else {
                log.warn('[TtsApi] Received ttsResponse with unsupported data type')
                this.close()
                resolve(false)
              }
              break

            default:
              // Ignore other event types such as ttsSentenceStart
              break
          }
        } catch (e) {
          log.warn(e as Error, '[TtsApi] Failed to parse TTS message')
          this.close()
          resolve(false)
        }
      }
    })

    return this._connectionPromise
  }
}
