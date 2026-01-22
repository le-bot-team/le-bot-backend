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

import { VprApi } from '@api/vpr'
import { log } from '@log'

import { DifyApi } from './dify'
import { AsrApi, TtsApi } from './openspeech'
import { getResponseForUnrecognizedAsr, isValidTimezone } from './utils'

export class ApiWrapper {
  private readonly _asrApi: AsrApi
  private readonly _difyApi: DifyApi
  private readonly _ttsApi: TtsApi
  private readonly _vprApi: VprApi

  private _audioQueue: { buffer: string; isComplete: boolean }[] = []
  private _audioBufferForVpr: string[] = []
  private _conversationId = ''
  private _currentPersonId = ''
  private _isAborting = false
  private _isFirstAudio = true
  private _isProcessingAudioQueue = false
  private _isReady = true
  private _isReconnecting = false
  private _outputText = false
  private _timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: string,
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

      // 清空VPR音频缓存，准备下次识别
      this._audioBufferForVpr = []

      if (recognized.length < 2) {
        log.warn({ recognized }, '[WsAction] ASR text too short, ignored')
        return
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

      const recognizeResult = await this._handleVoicePrintRecognition()
      if (!recognizeResult) {
        return
      }
      if (recognizeResult.success) {
        log.info(
          {
            personId: recognizeResult.data.person_id,
            confidence: recognizeResult.data.confidence,
          },
          `Voice recognized: '${recognizeResult.data.person_id}'`,
        )
        if (
          this._isReady &&
          this._currentPersonId !== recognizeResult.data.person_id
        ) {
          this._currentPersonId = recognizeResult.data.person_id
        } else if (this._currentPersonId === recognizeResult.data.person_id) {
          // ongoing session and same speaker, interrupt and restart
          await this._interruptOngoingProcesses()
        }
      } else {
        log.info(`Vpr recognition failed: ${recognizeResult.message}`)
        if (this._isReady) {
          // Register as unknown speaker only if no ongoing session
          const result = await this._handleVoicePrintRegistration()
          if (result?.success) {
            log.info(
              {
                personId: result.data.person_id,
                voiceId: result.data.voice_id,
              },
              'Registered new voice print for unknown speaker',
            )
            this._currentPersonId = result.data.voice_id
          } else {
            log.error(
              `[VPR] Voice print registration failed: ${result?.message}`,
            )
          }
        }
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

  private async _handleVoicePrintRecognition() {
    // 如果没有缓存的音频数据，直接返回
    if (this._audioBufferForVpr.length === 0) {
      log.warn('[VPR] No audio data buffered for voice print recognition')
      return null
    }

    try {
      // 合并所有音频数据
      const combinedAudioBase64 = Buffer.concat(
        this._audioBufferForVpr.map((str) => Buffer.from(str, 'base64')),
      ).toString('base64')

      log.info('[VPR] Starting voice recognition...')

      return await this._vprApi.recognize(combinedAudioBase64)
    } catch (error) {
      log.error(`Error during voice print recognition: ${error}`)
      return null
    }
  }

  private async _handleVoicePrintRegistration() {
    // 如果没有缓存的音频数据，直接返回
    if (this._audioBufferForVpr.length === 0) {
      log.warn('[VPR] No audio data buffered for voice print recognition')
      return null
    }

    try {
      // 合并所有音频数据
      const combinedAudioBase64 = Buffer.concat(
        this._audioBufferForVpr.map((str) => Buffer.from(str, 'base64')),
      ).toString('base64')

      return await this._vprApi.register(combinedAudioBase64)
    } catch (error) {
      log.error(`Error during voice print registration: ${error}`)
      return null
    }
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

  private async _interruptOngoingProcesses(): Promise<void> {
    // Interrupt any ongoing DifyApi communication or TtsApi streaming
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
