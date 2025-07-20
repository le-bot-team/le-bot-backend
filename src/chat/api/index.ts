import { randomUUIDv7 } from "bun";
import { ElysiaWS } from 'elysia/ws'

import { WsUpdateConfigRequest, WsUpdateConfigResponseSuccess } from 'src/chat/types/websocket'

import { AsrApi } from './asr'

export class ApiWrapper {
  private readonly _asrApi: AsrApi

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: bigint,
    private readonly _deviceId: string,
  ) {
    this._asrApi = new AsrApi(this._wsClient.id, this._userId, this._deviceId)
  }

  destroy() {
    this._asrApi.close()
  }

  async updateConfig(request: WsUpdateConfigRequest): Promise<boolean> {
    const result = await this._asrApi.connect()
    this._wsClient.send(
      JSON.stringify(
        new WsUpdateConfigResponseSuccess(
          request.id,
          request.data.conversationId ?? randomUUIDv7(),
        )
      )
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
