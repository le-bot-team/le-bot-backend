import { ElysiaWS } from 'elysia/ws'

import { VprApi } from '@/api/vpr'
import { DifyApi } from '@/api/dify'
import { AsrApi, TtsApi } from '@/api/openspeech'
import { log } from '@/log'

import type { WsUpdateConfigRequest } from './model'
import {
  WsChatCompleteResponseSuccess,
  WsOutputAudioCompleteResponseSuccess,
  WsOutputAudioStreamResponseSuccess,
  WsOutputTextCompleteResponseSuccess,
  WsOutputTextStreamResponseSuccess,
  WsUpdateConfigResponseSuccess,
} from './types'
import { isValidTimezone } from './utils'

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

      // Clear VPR audio buffer for the next recognition
      this._audioBufferForVpr = []

      if (recognized.length < 2) {
        log.warn({ recognized }, '[WsAction] ASR text too short, ignored')
        return
      }

      this._isReady = false

      try {
        const fullAnswer = await this._difyApi.chatMessage(
          this._conversationId,
          this._timeZone,
          recognized,
          !this._conversationId.length,
        )
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

        // Send TTS text without ending the session; keep the connection alive for reuse
        this._ttsApi.sendText(fullAnswer)
        // Note: no longer calling finishSession(); keep the session active

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
    if (request.data.outputText !== undefined) {
      this._outputText = request.data.outputText
    }
    if (request.data.timezone && isValidTimezone(request.data.timezone)) {
      this._timeZone = request.data.timezone
    }
    // TODO: Apply remaining config fields: location, sampleRate, speechRate, voiceId
    this._wsClient.send(
      new WsUpdateConfigResponseSuccess(request.id, {
        conversationId: this._conversationId,
        timezone: this._timeZone,
        outputText: this._outputText,
      }),
    )
    return true
  }

  async inputAudioStream(buffer: string): Promise<boolean> {
    // Enqueue the audio data
    this._audioQueue.push({ buffer, isComplete: false })

    // Start processing the queue
    await this._processAudioQueue()

    return true
  }

  inputAudioComplete(buffer: string): boolean {
    // Enqueue the final audio data
    this._audioQueue.push({ buffer, isComplete: true })

    // Process the queue asynchronously without blocking the current call
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

        // If this is the first audio packet and not connected, establish connections first
        if (
          this._isFirstAudio &&
          !this._isConnectionReady() &&
          !this._isConnecting()
        ) {
          await this._establishConnections()
        }

        // Wait for connection to complete
        while (this._isConnecting() || this._isAborting) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // If connection failed and not reconnecting, clear the queue and exit
        if (!this._isConnectionReady() && !this._isReconnecting) {
          this._audioQueue = []
          log.error('[ApiWrapper] API connections not ready, closing WebSocket')
          this._wsClient.close(1008, 'API connection failed')
          break
        }

        // If reconnecting, skip the current audio data and continue processing the queue
        if (this._isReconnecting) {
          continue
        }

        // Buffer audio data for VPR
        this._audioBufferForVpr.push(audioData.buffer)

        // Send the audio data
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

  private _getCombinedAudioBase64(): string | null {
    if (this._audioBufferForVpr.length === 0) {
      log.warn('[VPR] No audio data buffered for voice print processing')
      return null
    }
    return Buffer.concat(
      this._audioBufferForVpr.map((str) => Buffer.from(str, 'base64')),
    ).toString('base64')
  }

  private async _handleVoicePrintRecognition() {
    const combinedAudioBase64 = this._getCombinedAudioBase64()
    if (!combinedAudioBase64) {
      return null
    }

    try {
      log.info('[VPR] Starting voice recognition...')
      return await this._vprApi.recognize(combinedAudioBase64)
    } catch (error) {
      log.error(`Error during voice print recognition: ${error}`)
      return null
    }
  }

  private async _handleVoicePrintRegistration() {
    const combinedAudioBase64 = this._getCombinedAudioBase64()
    if (!combinedAudioBase64) {
      return null
    }

    try {
      // TODO: Register person to Postgres database
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

      // Connect ASR and TTS first
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

      // After TTS connection succeeds, start the session
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
    this._isReconnecting = true
    log.info('[WsAction] ASR finished during active session, interrupting')
    this._difyApi.abort()

    // Force-terminate TTS (no need to finishSession first since this is an interruption)
    this._ttsApi.abort()

    // Wait for TTS to fully close before reconnecting
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Reconnect and start a new TTS session
    try {
      const ttsConnected = await this._ttsApi.connect()
      if (ttsConnected) {
        await this._ttsApi.startSession()
        log.info('[WsAction] TTS reconnected after interrupt')
      } else {
        log.error('[WsAction] Failed to reconnect TTS after interrupt')
        this._wsClient.close(1011, 'TTS reconnection failed')
        this._isAborting = false
        this._isReconnecting = false
        return
      }
    } catch (error) {
      log.error(error, '[WsAction] Error reconnecting TTS after interrupt')
      this._wsClient.close(1011, 'TTS reconnection error')
      this._isAborting = false
      this._isReconnecting = false
      return
    }
    this._isReconnecting = false
    this._isAborting = false
  }
}
