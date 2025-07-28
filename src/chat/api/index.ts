import { randomUUIDv7 } from 'bun'
import { ElysiaWS } from 'elysia/ws'

import {
  WsUpdateConfigRequest,
  WsUpdateConfigResponseSuccess,
} from 'src/chat/types/websocket'

import { DifyApi } from './dify'
import { AsrApi, TtsApi } from './openspeech'

export class ApiWrapper {
  private readonly _asrApi: AsrApi
  private readonly _difyApi: DifyApi
  private readonly _ttsApi: TtsApi

  private _conversationId = ''
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
    this._ttsApi = new TtsApi(this._wsClient.id, this._userId, this._deviceId)

    this._asrApi.onFinish = async (recognized) => {
      const fullAnswer = await this._difyApi.chatMessage(
        this._conversationId,
        recognized,
      )
      this._wsClient.send(
        JSON.stringify({
          action: 'outputTextComplete',
          data: {
            chatId: this._wsClient.id,
            conversationId: this._conversationId,
            role: 'assistant',
            text: fullAnswer,
          },
        }),
      )
    }
    this._difyApi.onMessage = (segment) => {
      if (this._outputText) {
        this._wsClient.send(
          JSON.stringify({
            action: 'outputTextStream',
            data: {
              chatId: this._wsClient.id,
              conversationId: this._conversationId,
              role: 'assistant',
              text: segment,
            },
          }),
        )
      }
    }
  }

  destroy() {
    this._asrApi.close()
  }

  async updateConfig(request: WsUpdateConfigRequest): Promise<boolean> {
    this._conversationId = request.data.conversationId ?? randomUUIDv7()
    this._outputText = request.data.outputText ?? false
    const result = await this._asrApi.connect()
    this._wsClient.send(
      JSON.stringify(
        new WsUpdateConfigResponseSuccess(
          request.id,
          request.data.conversationId ?? randomUUIDv7(),
        ),
      ),
    )
    return result
  }

  inputAudioStream(buffer: string): boolean {
    return this._asrApi.sendAudioBase64(buffer, false)
  }

  inputAudioComplete(buffer: string): boolean {
    return this._asrApi.sendAudioBase64(buffer, true)
  }
}
