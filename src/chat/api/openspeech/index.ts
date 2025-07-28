import { log } from '@log'

import {
  CompressionType,
  MessageType,
  SequenceNumberType,
  SerializationType,
} from './types'
import {
  createFullClientRequest,
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
      log.warn('AsrApi is not ready to send audio data')
      return false
    }
    const audioData = Uint8Array.fromBase64(audioDataBase64)

    let sequenceNumberType: SequenceNumberType
    let currentSeq = this._sequenceNumber

    if (isLast) {
      sequenceNumberType = SequenceNumberType.negativeWithSequence
      currentSeq = -this._sequenceNumber
    } else {
      sequenceNumberType = SequenceNumberType.positive
      this._sequenceNumber++
    }

    this._ws.send(
      serializeRequestMessage(
        MessageType.audioOnlyRequest,
        sequenceNumberType,
        CompressionType.gzip,
        audioData,
        currentSeq,
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
      log.warn('WebSocket is already connected')
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
        log.warn(event, 'WebSocket closed')
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
            SequenceNumberType.positive,
            CompressionType.gzip,
            createFullClientRequest(this._userId, this._deviceId),
            this._sequenceNumber,
          ),
        )
        this._sequenceNumber++
        log.info('ASR WebSocket connection established')
      }

      if (!this._ws) {
        log.error('WebSocket is not initialized')
        this._connectionPromise = null
        resolve(false)
        return
      }

      this._ws.onmessage = async (event) => {
        try {
          const message = parseResponseMessage(event.data.buffer)
          if (message.messageType === MessageType.errorResponse) {
            log.warn(
              {
                errorType: message.errorType,
                errorMessage: JSON.parse(message.errorMessage),
              },
              'Error response: ',
            )
            this._isReady = false
            this._connectionPromise = null
            resolve(false)
            return
          }
          if (message.sequenceNumber === 1) {
            log.info('ASR configuration updated successfully')
            this._isReady = true
            resolve(true)
          } else {
            if (message.serializationType === SerializationType.json) {
              const payload = message.payload as {
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
                'Text data received',
              )
              if (
                message.sequenceNumberType ===
                SequenceNumberType.negativeWithSequence
              ) {
                log.debug(
                  { sequenceNumber: message.sequenceNumber },
                  'Received last message with sequence number',
                )
                this.onFinish?.(payload.result.text)
              }
            } else {
              log.info(
                { length: message.payload.byteLength },
                'Binary data received',
              )
            }
          }
        } catch (e) {
          log.warn(e as Error, 'Failed to parse message')
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

}
