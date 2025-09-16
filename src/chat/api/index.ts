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
import { getResponseForUnrecognizedAsr } from './utils'

export class ApiWrapper {
  private readonly _asrApi: AsrApi
  private readonly _difyApi: DifyApi
  private readonly _ttsApi: TtsApi

  private _conversationId = ''
  private _isFirstAudio = true
  private _isReady = true
  private _outputText = false
  private _audioQueue: { buffer: string; isComplete: boolean }[] = []
  private _processingQueue = false

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: bigint,
    private readonly _nickname: string,
    private readonly _deviceId: string,
  ) {
    this._asrApi = new AsrApi(this._wsClient.id, this._userId, this._deviceId)
    this._difyApi = new DifyApi(
      process.env.DIFY_URL ?? 'http://cafuuchino.studio26f.org:22480',
      this._userId,
      this._nickname,
    )
    this._ttsApi = new TtsApi(this._wsClient.id, this._userId)

    this._asrApi.onFinish = async (recognized) => {
      this._isReady = false
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

      try {
        const fullAnswer = recognized.length
          ? await this._difyApi.chatMessage(
              this._conversationId,
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

        this._ttsApi.sendText(fullAnswer)
        await this._ttsApi.finishSession()
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
        log.error(error, '[WsAction] Error during ASR finish handling')
        this._wsClient.close(1011, 'Internal server error')
        return
      }
    }
    this._asrApi.onUpdate = (text) => {
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
      this._isFirstAudio = true
      // 不再需要手动重置连接状态，因为TTS会话结束后状态会自动重置
    }
  }

  destroy() {
    this._asrApi.close()
    this._ttsApi.close()
    this._audioQueue = []
    this._processingQueue = false
  }

  async updateConfig(request: WsUpdateConfigRequest): Promise<boolean> {
    this._conversationId = request.data.conversationId ?? ''
    this._outputText = request.data.outputText ?? false
    this._wsClient.send(
      JSON.stringify(
        new WsUpdateConfigResponseSuccess(request.id, this._conversationId),
      ),
    )
    return true
  }

  async inputAudioStream(buffer: string): Promise<boolean> {
    if (!this._isReady) {
      log.warn('[WsAction] Input audio stream ignored, not ready')
      return false
    }

    // 将音频数据加入队列
    this._audioQueue.push({ buffer, isComplete: false })

    // 开始处理队列
    await this._processAudioQueue()

    return true
  }

  inputAudioComplete(buffer: string): boolean {
    if (!this._isReady) {
      log.warn('[WsAction] Input audio complete ignored, not ready')
      return false
    }

    // 将完成音频数据加入队列
    this._audioQueue.push({ buffer, isComplete: true })

    // 异步处理队列，不阻塞当前调用
    this._processAudioQueue().catch((error) => {
      log.error(error, '[WsAction] Failed to process audio queue')
    })

    return true
  }

  private async _processAudioQueue(): Promise<void> {
    if (this._processingQueue) {
      return
    }

    this._processingQueue = true

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
        while (this._isConnecting()) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // 如果连接失败，清空队列并退出
        if (!this._isConnectionReady()) {
          this._audioQueue = []
          this._wsClient.close(1008, 'API connection failed')
          break
        }

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
      this._processingQueue = false
    }
  }

  private _isConnectionReady(): boolean {
    return this._asrApi.isConnected && this._ttsApi.isConnected
  }

  private _isConnecting(): boolean {
    return this._asrApi.isConnecting || this._ttsApi.isConnecting
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
