import { randomUUIDv7 } from 'bun'
import { ElysiaWS } from 'elysia/ws'

import {
  WsOutputAudioCompleteResponseSuccess,
  WsOutputAudioStreamResponseSuccess,
  WsOutputTextCompleteResponseSuccess,
  WsOutputTextStreamResponseSuccess,
  WsUpdateConfigRequest,
  WsUpdateConfigResponseSuccess
} from 'src/chat/types/websocket'

import { log } from '@log'

import { DifyApi } from './dify'
import { AsrApi, TtsApi } from './openspeech'

export class ApiWrapper {
  private readonly _asrApi: AsrApi
  private readonly _difyApi: DifyApi
  private readonly _ttsApi: TtsApi

  private _conversationId = ''
  private _isFirstAudio = true
  private _isReady = true
  private _outputText = false

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: bigint,
    private readonly _deviceId: string,
  ) {
    this._asrApi = new AsrApi(this._wsClient.id, this._userId, this._deviceId)
    this._difyApi = new DifyApi(
      'http://cafuuchino.studio26f.org:22480',
      this._userId,
    )
    this._ttsApi = new TtsApi(this._wsClient.id, this._userId)

    this._asrApi.onFinish = async (recognized) => {
      this._isReady = false
      const fullAnswer = await this._difyApi.chatMessage(
        this._conversationId,
        recognized,
      )
      this._ttsApi.sendText(fullAnswer)
      await this._ttsApi.finishSession()
      if (this._outputText) {
        this._wsClient.send(
          new WsOutputTextCompleteResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            fullAnswer,
          ),
        )
      }
    }
    this._difyApi.onMessage = (segment) => {
      if (this._outputText) {
        this._wsClient.send(
          new WsOutputTextStreamResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            segment,
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
    }
  }

  destroy() {
    this._asrApi.close()
    this._ttsApi.close()
  }

  async updateConfig(request: WsUpdateConfigRequest): Promise<boolean> {
    this._conversationId = request.data.conversationId ?? randomUUIDv7()
    this._outputText = request.data.outputText ?? false
    this._wsClient.send(
      JSON.stringify(
        new WsUpdateConfigResponseSuccess(
          request.id,
          request.data.conversationId ?? randomUUIDv7(),
        ),
      ),
    )
    return true
  }

  async inputAudioStream(buffer: string): Promise<boolean> {
    if (!this._isReady) {
      log.warn("[WsAction] Input audio stream ignored, not ready")
      return false
    }
    if (this._isFirstAudio) {
      log.info("[WsAction] Input audio stream first audio")
      if (
        !(
          await Promise.all([this._asrApi.connect(), this._ttsApi.connect()])
        ).every((result) => result)
      ) {
        this._wsClient.close(1008, 'API connection failed')
        return false
      }
      if (!(await this._ttsApi.startSession())) {
        this._wsClient.close(1008, 'TTS session start failed')
        return false
      }
      this._isFirstAudio = false
    }
    return this._asrApi.sendAudioBase64(buffer, false)
  }

  inputAudioComplete(buffer: string): boolean {
    if (!this._isReady) {
      log.warn("[WsAction] Input audio complete ignored, not ready")
      return false
    }
    return this._asrApi.sendAudioBase64(buffer, true)
  }
}
