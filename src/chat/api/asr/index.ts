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
  private _audioData: Uint8Array | undefined
  private _ws: WebSocket | undefined
  private _connectionPromise: Promise<boolean> | null = null
  private _isReady = false // 添加状态标记
  private _sequenceNumber = 1 // 添加序列号管理

  constructor(
    private readonly _connectId: string,
    private readonly _userId: bigint,
    private readonly _deviceId: string,
  ) {}

  sendAudioBase64(audioDataBase64: string, isLast = false): boolean {
    if (!this._ws || !this._isReady) {
      // 检查是否真正准备好
      log.warn('AsrApi is not ready to send audio data')
      return false
    }
    const audioData = Uint8Array.fromBase64(audioDataBase64)

    // 根据Python脚本的逻辑处理序列号
    let sequenceNumberType: SequenceNumberType
    let currentSeq = this._sequenceNumber

    if (isLast) {
      // 最后一个包：使用NEG_WITH_SEQUENCE标志和负序列号
      sequenceNumberType = SequenceNumberType.negativeWithSequence
      currentSeq = -this._sequenceNumber
    } else {
      sequenceNumberType = SequenceNumberType.positive
      // 非最后包递增序列号
      this._sequenceNumber++
    }

    this._ws.send(
      serializeRequestMessage(
        MessageType.audioOnlyRequest,
        sequenceNumberType,
        CompressionType.gzip, // 使用GZIP压缩，与Python脚本保持一致
        audioData,
        currentSeq,
      ),
    )
    return true
  }

  close() {
    this._ws?.close()
    this._isReady = false // 重置状态
    this._sequenceNumber = 1 // 重置序列号
  }

  async connect(): Promise<boolean> {
    if (this._connectionPromise) {
      return this._connectionPromise
    }

    if (this._ws && this._isReady) {
      // 检查是否真正准备好
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
        this._audioData = undefined
        this._isReady = false // 重置状态
        this._sequenceNumber = 1 // 重置序列号
        if (this._ws) {
          this._ws.onopen = null
          this._ws.onclose = null
          this._ws = undefined
        }
        this._connectionPromise = null
        resolve(false)
      }
      this._ws.onopen = () => {
        // 注意：这里不要立即认为连接成功，需要等待配置响应
        this._ws?.send(
          serializeRequestMessage(
            MessageType.fullClientRequest,
            SequenceNumberType.positive,
            CompressionType.gzip, // 使用GZIP压缩，与Python脚本保持一致
            createFullClientRequest(this._userId, this._deviceId),
            this._sequenceNumber,
          ),
        )
        this._sequenceNumber++ // 发送配置请求后递增序列号
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
            this._isReady = true // 只有在这里才标记为准备好
            resolve(true)
          } else {
            if (
              message.sequenceNumberType ===
              SequenceNumberType.negativeWithSequence
            ) {
              log.debug(
                { sequenceNumber: message.sequenceNumber },
                'Received last message with sequence number',
              )
            }
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
