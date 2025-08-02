import { log } from '@log'

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
  private _connectionPromise: Promise<boolean> | null = null
  private _isReady = false
  private _sequenceNumber = 1
  private _ws: WebSocket | undefined

  onFinish: ((recognized: string) => void) | undefined

  constructor(
    private readonly _connectId: string,
    private readonly _userId: bigint,
    private readonly _deviceId: string,
  ) {}

  sendAudioBase64(audioDataBase64: string, isLast = false): boolean {
    if (!this._ws || !this._isReady) {
      log.warn('[AsrApi] Not ready to send audio data')
      return false
    }
    const audioData = Uint8Array.fromBase64(audioDataBase64)

    let messageFlag: MessageFlagType
    let currentSeq = this._sequenceNumber

    if (isLast) {
      messageFlag = MessageFlagType.negativeSequence
      currentSeq = -this._sequenceNumber
    } else {
      messageFlag = MessageFlagType.positiveSequence
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

  async connect(): Promise<boolean> {
    if (this._connectionPromise) {
      return this._connectionPromise
    }

    if (this._ws && this._isReady) {
      log.warn('[AsrApi] WebSocket is already connected')
      return true
    }

    this._connectionPromise = new Promise<boolean>((resolve) => {
      this._ws = new WebSocket(
        'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel',
        {
          headers: {
            'X-Api-Access-Key': process.env.ACCESS_TOKEN,
            'X-Api-App-Key': process.env.APP_ID,
            'X-Api-Resource-Id': 'volc.bigasr.sauc.duration',
            'X-Api-Connect-Id': this._connectId,
          },
        },
      )
      this._ws.onclose = (event) => {
        log.info(event, '[AsrApi] WebSocket closed')
        this._isReady = false
        this._sequenceNumber = 1
        if (this._ws) {
          this._ws.onopen = null
          this._ws.onclose = null
          this._ws = undefined
        }
        this._connectionPromise = null
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
        log.info('[AsrApi] WebSocket opened successfully')
      }

      if (!this._ws) {
        log.error('[AsrApi] WebSocket is not initialized')
        this._connectionPromise = null
        resolve(false)
        return
      }

      this._ws.onmessage = async (event) => {
        try {
          const message = parseResponseMessage(event.data.buffer)
          if (message.responseType === ResponseType.errorResponse) {
            log.warn(
              {
                errorType: message.errorType,
                errorMessage: JSON.parse(message.errorMessage),
              },
              '[AsrApi] Error response',
            )
            this._isReady = false
            this._connectionPromise = null
            resolve(false)
            return
          }
          if (message.responseType === ResponseType.ttsResponse) {
            log.warn(
              { responseType: message.responseType },
              '[AsrApi] Received TTS response instead of ASR',
            )
            this._isReady = false
            this._connectionPromise = null
            resolve(false)
            return
          }

          if (message.sequenceNumber === 1) {
            log.info('[AsrApi] Configuration updated successfully')
            this._isReady = true
            resolve(true)
          } else {
            if (message.serializationType === SerializationType.json) {
              const payload = message.data as {
                result: { text: string }
                utterances?: {
                  definite: boolean
                  start_time: number
                  end_time: number
                  text: string
                  words: {
                    start_time: number
                    end_time: number
                    text: string
                  }[]
                }[]
              }
              log.debug(
                {
                  text: payload.result.text,
                  words: payload.utterances?.map(
                    (utterance) => utterance.words,
                  ),
                },
                '[AsrApi] Text data received',
              )
              if (message.messageFlag === MessageFlagType.negativeSequence) {
                log.info(
                  { text: payload.result.text },
                  '[AsrApi] Recognition finished',
                )
                this.onFinish?.(payload.result.text)
              }
            } else {
              log.info(
                { length: message.data.byteLength },
                '[AsrApi] Binary data received',
              )
            }
          }
        } catch (e) {
          log.warn(e as Error, '[AsrApi] Failed to parse message')
          this._isReady = false
          this._connectionPromise = null
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

  private _voiceType = 'zh_female_tianmeixiaoyuan_moon_bigtts'
  private _ws: WebSocket | undefined

  onAudioData: ((audioData: Uint8Array) => void) | undefined
  onFinish: (() => void) | undefined

  constructor(
    private readonly _connectId: string,
    private readonly _userId: bigint,
  ) {}

  async startSession(): Promise<boolean> {
    if (this._startSessionPromise) {
      return this._startSessionPromise
    }

    if (this._ws && this._connectionId?.length && this._sessionId?.length) {
      log.warn(
        { sessionId: this._sessionId },
        '[TtsApi] Session is already started',
      )
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
            createTtsRequestData(
              this._userId,
              TtsEventType.startSession,
              this._voiceType,
            ),
          ],
        ),
      )
      this._onSessionStarted = (sessionId: string) => {
        this._sessionId = sessionId
        resolve(true)
        this._onSessionStarted = undefined
      }
    })

    return this._startSessionPromise
  }

  async finishSession(): Promise<boolean> {
    if (this._finishSessionPromise) {
      return this._finishSessionPromise
    }

    this._finishSessionPromise = new Promise<boolean>((resolve) => {
      if (
        !this._ws ||
        !this._connectionId?.length ||
        !this._sessionId?.length
      ) {
        log.warn('[TtsApi] Session is already finished or not started')
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
      }
      return true
    })

    return this._finishSessionPromise
  }

  sendText(text: string): boolean {
    if (!this._ws || !this._connectionId?.length || !this._sessionId?.length) {
      log.warn('[TtsApi] Is not ready to send text')
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
          createTtsRequestData(
            this._userId,
            TtsEventType.taskRequest,
            this._voiceType,
            text,
          ),
        ],
      ),
    )
    return true
  }

  close() {
    this._ws?.close()
  }

  async connect(): Promise<boolean> {
    if (this._connectionPromise) {
      return this._connectionPromise
    }

    if (this._ws && this._connectionId?.length) {
      log.warn('[TtsApi] WebSocket is already connected')
      return true
    }

    this._connectionPromise = new Promise<boolean>((resolve) => {
      this._ws = new WebSocket(
        'wss://openspeech.bytedance.com/api/v3/tts/bidirection',
        {
          headers: {
            'X-Api-Access-Key': process.env.ACCESS_TOKEN,
            'X-Api-App-Key': process.env.APP_ID,
            'X-Api-Resource-Id': 'volc.service_type.10029',
            'X-Api-Connect-Id': this._connectId,
          },
        },
      )
      if (!this._ws) {
        log.error('[TtsApi] WebSocket is not initialized')
        this._connectionPromise = undefined
        resolve(false)
        return
      }

      this._ws.onclose = (event) => {
        log.warn(event, '[TtsApi] WebSocket closed')
        this._connectionPromise = undefined
        this._connectionId = undefined
        this._startSessionPromise = undefined
        this._sessionId = undefined

        this._onSessionStarted = undefined
        if (this._ws) {
          this._ws.onopen = null
          this._ws.onclose = null
          this._ws = undefined
        }

        resolve(false)
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
        log.info('[TtsApi] WebSocket opened successfully')
      }
      this._ws.onmessage = async (event) => {
        try {
          const message = parseResponseMessage(event.data.buffer)

          if (message.responseType === ResponseType.errorResponse) {
            log.warn(
              {
                errorType: message.errorType,
                errorMessage: JSON.parse(message.errorMessage),
              },
              '[TtsApi] Error response',
            )
            this.close()
            resolve(false)
            return
          }
          if (message.responseType === ResponseType.asrResponse) {
            log.warn(
              { responseType: message.responseType },
              '[TtsApi] Received ASR response instead of TTS',
            )
            this.close()
            resolve(false)
            return
          }

          switch (message.eventType) {
            case TtsEventType.connectionStarted: {
              log.info({ connectionId: message.id }, '[TtsApi] Connection started')
              this._connectionId = message.id
              resolve(true)
              break
            }
            case TtsEventType.sessionStarted: {
              log.info({ sessionId: message.id }, '[TtsApi] Session started')
              this._onSessionStarted?.(message.id)
              break
            }
            case TtsEventType.sessionFinished: {
              log.info({ sessionId: this._sessionId }, '[TtsApi] Session finished')
              this._onSessionFinished?.()
              this.onFinish?.()
              break
            }
            case TtsEventType.ttsSentenceStart: {
              log.info({ sessionId: this._sessionId }, '[TtsApi] Sentence started')
              break
            }
            case TtsEventType.ttsSentenceEnd: {
              log.info({ sessionId: this._sessionId }, '[TtsApi] Sentence ended')
              break
            }
            case TtsEventType.ttsResponse: {
              if (!(message.data instanceof Uint8Array)) {
                log.warn(
                  message,
                  '[TtsApi] Received ttsResponse with unsupported data type',
                )
                this.close()
                resolve(false)
                return
              }
              this.onAudioData?.(message.data)
              break
            }
            default: {
              log.warn(message, '[TtsApi] Received unsupported TTS event type')
              this.close()
              resolve(false)
              return
            }
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
