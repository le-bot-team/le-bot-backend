import { ElysiaWS } from 'elysia/ws'

import {
  WsChatCompleteResponseSuccess,
  WsOutputAudioCompleteResponseSuccess,
  WsOutputAudioStreamResponseSuccess,
  WsOutputTextCompleteResponseSuccess,
  WsOutputTextStreamResponseSuccess,
  WsUpdateConfigRequest,
  WsUpdateConfigResponseSuccess,
} from 'src/chat/types/websocket'

import { log } from '@log'

import { DifyApi } from './dify'
import { AsrApi, TtsApi } from './openspeech'
import { getResponseForUnrecognizedAsr, isValidTimezone } from './utils'
import { VprApi } from './vpr'

export class ApiWrapper {
  private readonly _asrApi: AsrApi
  private readonly _difyApi: DifyApi
  private readonly _ttsApi: TtsApi
  private readonly _vprApi: VprApi

  private _audioQueue: { buffer: string; isComplete: boolean }[] = []
  private _audioBufferForVpr: string[] = []
  private _conversationId = ''
  private _isAborting = false
  private _isFirstAudio = true
  private _isProcessingAudioQueue = false
  private _isReady = true
  private _isReconnecting = false
  private _outputText = false
  private _timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: bigint,
    private readonly _nickname: string,
    private readonly _deviceId: string,
  ) {
    this._asrApi = new AsrApi(this._wsClient.id, this._userId, this._deviceId)
    this._difyApi = new DifyApi(this._userId, this._nickname)
    this._ttsApi = new TtsApi(this._wsClient.id, this._userId)
    this._vprApi = new VprApi(this._userId, 0.6)

    this._asrApi.onFinish = async (recognized) => {
      if (this._outputText) {
        this._wsClient.send(
          new WsOutputTextCompleteResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            'user',
            recognized,
          ),
        )
      }

      if (recognized.length < 2) {
        log.warn({ recognized }, '[WsAction] ASR text too short, ignored')
        return
      }

      if (!(await this._handleVoicePrintRecognition())) {
        log.info('[VPR] Voice print recognition failed or no match found')
      }

      this._isReady = false

      try {
        const fullAnswer = recognized.length
          ? await this._difyApi.chatMessage(
              this._conversationId,
              this._timeZone,
              recognized,
              !this._conversationId.length,
            )
          : getResponseForUnrecognizedAsr()
        if (this._outputText) {
          this._wsClient.send(
            new WsOutputTextCompleteResponseSuccess(
              this._wsClient.id,
              this._wsClient.id,
              this._conversationId,
              'assistant',
              fullAnswer,
            ),
          )
        }

        // 发送 TTS 文本，但不结束会话，保持连接以便下次使用
        this._ttsApi.sendText(fullAnswer)
        // 注意：不再调用 finishSession()，让会话保持活跃状态

        this._wsClient.send(
          new WsChatCompleteResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            0,
            0,
          ),
        )
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          log.info('[ApiWrapper] DifyApi chatMessage aborted')
          return
        }
        log.error(error, '[ApiWrapper] Error during ASR finish handling')
        this._wsClient.close(1011, 'Internal server error')
        this._isReady = true
        return
      }
    }
    this._asrApi.onUpdate = async (text) => {
      if (this._outputText) {
        this._wsClient.send(
          new WsOutputTextStreamResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            'user',
            text,
          ),
        )
      }

      if (text.length < 2) {
        return
      }

      // Interrupt any ongoing DifyApi communication or TtsApi streaming
      if (!this._isReady) {
        this._isAborting = true
        log.info('[WsAction] ASR finished during active session, interrupting')
        this._difyApi.abort()

        // 强制终止 TTS（不需要先 finishSession，因为是中断）
        this._ttsApi.abort()

        // 等待 TTS 完全关闭后再重新连接
        await new Promise((resolve) => setTimeout(resolve, 100))

        // 重新连接并启动 TTS 会话
        try {
          const ttsConnected = await this._ttsApi.connect()
          if (ttsConnected) {
            await this._ttsApi.startSession()
            log.info('[WsAction] TTS reconnected after interrupt')
          } else {
            log.error('[WsAction] Failed to reconnect TTS after interrupt')
            this._wsClient.close(1011, 'TTS reconnection failed')
            this._isAborting = false
            return
          }
        } catch (error) {
          log.error(error, '[WsAction] Error reconnecting TTS after interrupt')
          this._wsClient.close(1011, 'TTS reconnection error')
          this._isAborting = false
          return
        }

        this._isAborting = false
      }
    }
    this._difyApi.onConversationId = (conversationId) => {
      this._conversationId = conversationId
    }
    this._difyApi.onUpdate = (text) => {
      if (this._outputText) {
        this._wsClient.send(
          new WsOutputTextStreamResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            'assistant',
            text,
          ),
        )
      }
    }
    this._ttsApi.onAudioData = (audioData) => {
      this._wsClient.send(
        new WsOutputAudioStreamResponseSuccess(
          this._wsClient.id,
          this._wsClient.id,
          this._conversationId,
          audioData.toBase64(),
        ),
      )
    }
    this._ttsApi.onFinish = () => {
      this._wsClient.send(
        new WsOutputAudioCompleteResponseSuccess(
          this._wsClient.id,
          this._wsClient.id,
          this._conversationId,
        ),
      )
      this._isReady = true
    }
  }

  destroy() {
    this._asrApi.close()
    this._ttsApi.close()
    this._audioQueue = []
    this._audioBufferForVpr = []
    this._isProcessingAudioQueue = false
  }

  async updateConfig(request: WsUpdateConfigRequest): Promise<boolean> {
    if (request.data.conversationId) {
      this._conversationId = request.data.conversationId
    }
    if (request.data.outputText) {
      this._outputText = request.data.outputText
    }
    if (request.data.timezone && isValidTimezone(request.data.timezone)) {
      this._timeZone = request.data.timezone
    }
    this._wsClient.send(
      JSON.stringify(
        new WsUpdateConfigResponseSuccess(request.id, {
          conversationId: this._conversationId,
          timezone: this._timeZone,
          outputText: this._outputText,
        }),
      ),
    )
    return true
  }

  async inputAudioStream(buffer: string): Promise<boolean> {
    // 将音频数据加入队列
    this._audioQueue.push({ buffer, isComplete: false })

    // 开始处理队列
    await this._processAudioQueue()

    return true
  }

  inputAudioComplete(buffer: string): boolean {
    // 将完成音频数据加入队列
    this._audioQueue.push({ buffer, isComplete: true })

    // 异步处理队列，不阻塞当前调用
    this._processAudioQueue().catch((error) => {
      log.error(error, '[WsAction] Failed to process audio queue')
    })

    return true
  }

  private async _processAudioQueue(): Promise<void> {
    if (this._isProcessingAudioQueue) {
      return
    }

    this._isProcessingAudioQueue = true

    try {
      while (this._audioQueue.length > 0) {
        const audioData = this._audioQueue.shift()
        if (!audioData) {
          continue
        }

        // 如果是第一个音频包且未连接，先建立连接
        if (
          this._isFirstAudio &&
          !this._isConnectionReady() &&
          !this._isConnecting()
        ) {
          await this._establishConnections()
        }

        // 等待连接完成
        while (this._isConnecting() || this._isAborting) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // 如果连接失败且不是在重连过程中，清空队列并退出
        if (!this._isConnectionReady() && !this._isReconnecting) {
          this._audioQueue = []
          log.error('[ApiWrapper] API connections not ready, closing WebSocket')
          this._wsClient.close(1008, 'API connection failed')
          break
        }

        // 如果正在重连,跳过当前音频数据，继续处理队列
        if (this._isReconnecting) {
          continue
        }

        // 缓存音频数据用于 VPR
        this._audioBufferForVpr.push(audioData.buffer)

        // 发送音频数据
        const sendResult = audioData.isComplete
          ? this._asrApi.sendAudioBase64(audioData.buffer, true)
          : this._asrApi.sendAudioBase64(audioData.buffer, false)

        if (!sendResult) {
          log.warn('[WsAction] Failed to send audio data to ASR API')
          break
        }
      }
    } catch (error) {
      log.error(error, '[WsAction] Error in audio queue processing')
    } finally {
      this._isProcessingAudioQueue = false
    }
  }

  private _isConnectionReady(): boolean {
    return this._asrApi.isConnected && this._ttsApi.isConnected
  }

  private _isConnecting(): boolean {
    return this._asrApi.isConnecting || this._ttsApi.isConnecting
  }

  private async _handleVoicePrintRecognition(): Promise<boolean> {
    // 如果没有缓存的音频数据，直接返回
    if (this._audioBufferForVpr.length === 0) {
      log.warn('[VPR] No audio data buffered for voice print recognition')
      return false
    }

    let isSuccess = false
    try {
      // 合并所有音频数据
      const combinedAudioBase64 = this._audioBufferForVpr.join('')

      // 将 base64 转换为 Uint8Array
      const audioData = Uint8Array.fromBase64(combinedAudioBase64)

      // 创建 Blob (假设是 PCM 格式)
      const audioBlob = new Blob([audioData], { type: 'audio/wav' })

      log.info('[VPR] Starting voice recognition...')

      // 调用 VPR recognize 接口
      const recognizeResult = await this._vprApi.recognize(audioBlob)

      if (recognizeResult.success && 'person_name' in recognizeResult) {
        // 识别成功
        log.info(
          '[VPR]',
          `Voice recognized: ${recognizeResult.person_name} (confidence: ${recognizeResult.confidence?.toFixed(2)})`,
        )
        isSuccess = true
      } else {
        // 没有识别到人物
        log.info('[VPR]', `No person recognized: ${recognizeResult.message}`)

        if (this._isFirstAudio) {
          // 如果是第一次音频且未识别到，进行注册
          log.info(
            '[VPR]',
            'First audio detected, registering voice as user...',
          )

          const registerResult = await this._vprApi.register(
            audioBlob,
            this._nickname || '用户',
            '本人',
          )

          if (registerResult.success) {
            log.info('[VPR]', 'Voice registered successfully')
            isSuccess = true
          } else {
            log.error(
              '[VPR]',
              `Voice registration failed: ${registerResult.message}`,
            )
          }
        } else {
          // 如果不是第一次音频，直接返回
          log.info('[VPR]', 'Not first audio, skipping registration')
        }
      }
    } catch (error) {
      log.error('[VPR]', `Error during voice print recognition: ${error}`)
    } finally {
      // 清空音频缓存，准备下次识别
      this._audioBufferForVpr = []
    }
    return isSuccess
  }

  private async _establishConnections(): Promise<void> {
    if (this._isConnecting() || this._isConnectionReady()) {
      return
    }

    try {
      log.info('[WsAction] Establishing API connections')

      // 先连接 ASR 和 TTS
      const [asrConnected, ttsConnected] = await Promise.all([
        this._asrApi.connect(),
        this._ttsApi.connect(),
      ])

      if (!asrConnected) {
        log.error('[WsAction] Failed to connect to ASR API')
        return
      }

      if (!ttsConnected) {
        log.error('[WsAction] Failed to connect to TTS API')
        return
      }

      // TTS 连接成功后，启动会话
      const sessionStarted = await this._ttsApi.startSession()
      if (!sessionStarted) {
        log.error('[WsAction] Failed to start TTS session')
        return
      }

      this._isFirstAudio = false
      log.info(
        '[WsAction] API connections and TTS session established successfully',
      )
    } catch (error) {
      log.error(error, '[WsAction] Failed to establish API connections')
    }
  }
}
