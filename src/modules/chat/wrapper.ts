import { ElysiaWS } from 'elysia/ws'

import { VprApi } from '@/api/vpr'
import { ChatApi } from '@/api/chat'
import { WakeApi } from '@/api/wake'
import { AsrApi, TtsApi } from '@/api/openspeech'
import { log } from '@/log'

import type { WsUpdateConfigRequest } from './model'
import { getPersonByUserAndId } from './repository'
import {
  WsCancelOutputResponseSuccess,
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
  private readonly _chatApi: ChatApi
  private readonly _ttsApi: TtsApi
  private readonly _vprApi: VprApi
  private readonly _wakeApi: WakeApi

  private _audioQueue: { buffer: string; isComplete: boolean }[] = []
  private _audioBufferForVpr: string[] = []
  private _conversationId = ''
  private _currentPersonId = ''
  private _hasInterruptedThisRound = false
  private _isAborting = false
  private _isProcessingAudioQueue = false
  private _isProcessingWakeAudio = false
  private _isReady = true
  private _outputText = false
  private _timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  constructor(
    private readonly _wsClient: ElysiaWS,
    private readonly _userId: string,
    private readonly _nickname: string,
    private readonly _deviceId: string,
  ) {
    this._asrApi = new AsrApi(this._wsClient.id, this._userId, this._deviceId)
    this._chatApi = new ChatApi(this._userId, this._nickname)
    this._ttsApi = new TtsApi(this._wsClient.id, this._userId)
    this._vprApi = new VprApi(this._userId)
    this._wakeApi = new WakeApi(this._userId, this._nickname)

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
        this._audioBufferForVpr = []
        return
      }

      // If previous response is still being processed/played, ignore this utterance.
      // Interrupt detection is now handled in onUpdate instead.
      if (!this._isReady) {
        log.info(
          { recognized },
          '[ApiWrapper] Utterance received while busy, ignoring (interrupt handled in onUpdate)',
        )
        this._audioBufferForVpr = []
        return
      }

      // Normal new session - clear VPR buffer for next recognition
      this._audioBufferForVpr = []

      this._isReady = false

      try {
        const fullAnswer = await this._chatApi.chatMessage(
          this._conversationId,
          this._timeZone,
          recognized,
          !this._conversationId.length,
          this._currentPersonId || undefined,
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

        // Connect TTS and send text — TTS is connected per-use, not preemptively
        await this._ensureTtsConnection()
        let ttsSent = this._ttsApi.sendText(fullAnswer)
        if (!ttsSent) {
          log.warn('[ApiWrapper] TTS sendText failed, attempting to reconnect')
          const reconnected = await this._ensureTtsConnection()
          if (reconnected) {
            ttsSent = this._ttsApi.sendText(fullAnswer)
          }
        }
        if (!ttsSent) {
          log.error(
            '[ApiWrapper] TTS sendText failed after reconnection attempt, sending fallback outputAudioComplete',
          )
          this._wsClient.send(
            new WsOutputAudioCompleteResponseSuccess(
              this._wsClient.id,
              this._wsClient.id,
              this._conversationId,
            ),
           )
          this._isReady = true
          this._hasInterruptedThisRound = false
        }

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
          log.debug('[ApiWrapper] ChatApi chatMessage aborted')
          return
        }
        log.error(error, '[ApiWrapper] Error during ASR finish handling')
        this._wsClient.close(1011, 'Internal server error')
        this._isReady = true
        this._hasInterruptedThisRound = false
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

      if (this._isReady) {
        // System is idle - perform VPR for speaker identification (new conversation user detection)
        const recognizeResult = await this._handleVoicePrintRecognition()
        if (!recognizeResult) {
          return
        }
        if (recognizeResult.success) {
          log.debug(
            {
              personId: recognizeResult.data.person_id,
              confidence: recognizeResult.data.confidence,
            },
            `Voice recognized: '${recognizeResult.data.person_id}'`,
          )
          if (this._currentPersonId !== recognizeResult.data.person_id) {
            this._currentPersonId = recognizeResult.data.person_id
          }
        } else {
          log.debug(`Vpr recognition failed: ${recognizeResult.message}`)
          // Register as unknown speaker only if no ongoing session
          const result = await this._handleVoicePrintRegistration()
          if (result?.success) {
            log.debug(
              {
                personId: result.data.person_id,
                voiceId: result.data.voice_id,
              },
              'Registered new voice print for unknown speaker',
            )
            this._currentPersonId = result.data.voice_id
          } else {
            log.error(`[VPR] Voice print registration failed: ${result?.message}`)
          }
        }
      } else if (!this._hasInterruptedThisRound) {
        // System is busy - perform VPR for interrupt detection (only once per round)
        log.info(
          {
            text,
            ttsConnected: this._ttsApi.isConnected,
          },
          '[ApiWrapper] Utterance during active session, verifying speaker for interrupt',
        )

        const recognizeResult = await this._handleVoicePrintRecognition()
        this._audioBufferForVpr = []
        this._hasInterruptedThisRound = true

        if (recognizeResult?.success) {
          if (recognizeResult.data.person_id === this._currentPersonId) {
            log.info(
              { personId: recognizeResult.data.person_id },
              '[ApiWrapper] Same speaker confirmed, interrupting ongoing processes',
            )
            await this._interruptOngoingProcesses()
          } else {
            log.info(
              {
                detected: recognizeResult.data.person_id,
                current: this._currentPersonId,
              },
              '[ApiWrapper] Different speaker during active session, ignoring',
            )
          }
        } else {
          // VPR failed - be conservative, don't interrupt (could be echo)
          log.info('[ApiWrapper] VPR failed during active session, ignoring utterance')
        }
      }
    }
    this._chatApi.onConversationId = (conversationId: string) => {
      this._conversationId = conversationId
    }
    this._chatApi.onUpdate = (text: string) => {
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
      // Guard against redundant calls (e.g., safety-net from TTS onclose after
      // normal completion, or after cancelOutput already reset state)
      if (this._isReady) {
        return
      }
      this._wsClient.send(
        new WsOutputAudioCompleteResponseSuccess(
          this._wsClient.id,
          this._wsClient.id,
          this._conversationId,
        ),
      )
      // Close TTS connection after use — Volcengine TTS WebSockets are not reusable
      this._ttsApi.abort()
      this._isReady = true
      this._hasInterruptedThisRound = false
    }
  }

  destroy() {
    this._asrApi.close()
    this._ttsApi.close()
    this._audioQueue = []
    this._audioBufferForVpr = []
    this._isProcessingAudioQueue = false
  }

  /**
   * Cancel all ongoing output processing.
   * This aborts Chat API, Wake API, and TTS, then resets state for a new session.
   *
   * IMPORTANT: This method must NOT tear down resources that a concurrent
   * `inputWakeAudio` call is using.  `inputWakeAudio` uses the static
   * `AsrApi.recognizeOnce()` (its own temporary WebSocket) rather than the
   * instance-level streaming ASR, but both go through the same Volcengine
   * endpoint which may enforce per-user connection limits.  If a wake is in
   * progress we therefore skip the streaming ASR reset to avoid collateral
   * damage.
   */
  async cancelOutput(messageId: string): Promise<void> {
    log.info({ messageId }, '[ApiWrapper] Cancelling output')

    // Set aborting flag to prevent new processing
    this._isAborting = true

    // Clear audio queue to prevent further processing
    this._audioQueue = []
    this._audioBufferForVpr = []

    // Abort all ongoing API calls
    this._chatApi.abort()
    this._wakeApi.abort()
    this._ttsApi.abort()

    // Only reset the streaming ASR connection when no wake audio is being
    // processed.  `inputWakeAudio` creates its own one-shot ASR connection
    // via `AsrApi.recognizeOnce()`, and resetting the streaming ASR instance
    // here used to race with that one-shot connection on the Volcengine
    // endpoint (which closes one of them, causing "ASR connection closed
    // without result").
    if (!this._isProcessingWakeAudio) {
      await this._asrApi.reset()
    }

    // Reset state flags
    this._isAborting = false
    this._isProcessingAudioQueue = false
    this._isReady = true
    this._hasInterruptedThisRound = false

    // Send acknowledgment to client
    this._wsClient.send(new WsCancelOutputResponseSuccess(messageId, 'manual'))

    log.debug('[ApiWrapper] Cancel complete, ready for new session')
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

  /**
   * Handle wake audio: perform ASR, VPR, lookup owner_name from DB, call wake API, then TTS.
   * This is a separate flow from the normal audio stream processing.
   */
  async inputWakeAudio(buffer: string): Promise<boolean> {
    if (this._isProcessingWakeAudio) {
      log.warn('[ApiWrapper] Wake audio already being processed, ignoring')
      return false
    }

    // Reject empty or missing audio buffers early.
    // The client should never send an empty buffer (it skips the send when the
    // wake buffer is empty), but guard defensively to prevent ASR/VPR failures.
    if (!buffer || buffer.length === 0) {
      log.warn('[ApiWrapper] Empty wake audio buffer received, ignoring')
      return false
    }

    // If a cancelOutput is in progress (e.g., client sent cancelOutput immediately
    // before inputWakeAudio due to GPIO wake during an active session), wait for
    // it to complete before proceeding. This prevents racing with abort logic.
    if (this._isAborting) {
      log.info('[ApiWrapper] Waiting for ongoing abort to complete before processing wake audio')
      const start = Date.now()
      while (this._isAborting && Date.now() - start < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      if (this._isAborting) {
        log.warn('[ApiWrapper] Abort still in progress after 5s, ignoring wake audio')
        return false
      }
    }

    this._isProcessingWakeAudio = true
    this._isReady = false

    // Track whether TTS onFinish callback will restore _isReady
    let waitingForTtsCompletion = false

    try {
      log.debug('[ApiWrapper] Processing wake audio')

      // Step 1: Perform ASR and VPR in parallel
      const [asrResult, vprResult] = await Promise.all([
        AsrApi.recognizeOnce(this._userId, this._deviceId, buffer),
        this._vprApi.recognize(buffer),
      ])

      log.info(
        { asrText: asrResult, vprSuccess: vprResult.success },
        '[ApiWrapper] Wake audio ASR and VPR completed',
      )

      // Step 2: Get person_id and owner_name from VPR result and DB
      let personId: string | undefined
      let ownerName: string | undefined

      if (vprResult.success) {
        personId = vprResult.data.person_id
        log.info(
          { personId, confidence: vprResult.data.confidence },
          '[ApiWrapper] Voice recognized for wake',
        )

        // Lookup owner_name from persons table
        const person = await getPersonByUserAndId(this._userId, personId)
        if (person?.name) {
          ownerName = person.name
          log.debug({ ownerName }, '[ApiWrapper] Found owner name from DB')
        }
      } else {
        log.debug('[ApiWrapper] Voice not recognized for wake, registering new voice print')
        const registerResult = await this._vprApi.register(buffer)
        if (registerResult.success) {
          personId = registerResult.data.person_id
          log.debug(
            { personId: registerResult.data.person_id, voiceId: registerResult.data.voice_id },
            '[ApiWrapper] Registered new voice print for wake',
          )
        } else {
          log.error(`[VPR] Voice print registration failed during wake: ${registerResult.message}`)
          return false
        }
      }

      // Step 3: Call wake API with the gathered information
      const wakeResponse = await this._wakeApi.wakeResponse(personId, asrResult)

      log.info({ responseLength: wakeResponse.length }, '[ApiWrapper] Wake API response received')

      // Step 4: Send response text to TTS
      if (wakeResponse.length > 0) {
        if (this._outputText) {
          this._wsClient.send(
            new WsOutputTextCompleteResponseSuccess(
              this._wsClient.id,
              this._wsClient.id,
              this._conversationId,
              'user',
              asrResult,
            ),
          )
          this._wsClient.send(
            new WsOutputTextCompleteResponseSuccess(
              this._wsClient.id,
              this._wsClient.id,
              this._conversationId,
              'assistant',
              wakeResponse,
            ),
          )
        }

        // Connect TTS and send text — TTS is connected per-use, not preemptively
        await this._ensureTtsConnection()
        let ttsSent = this._ttsApi.sendText(wakeResponse)
        if (!ttsSent) {
          log.warn('[ApiWrapper] TTS sendText failed for wake response, attempting to reconnect')
          const reconnected = await this._ensureTtsConnection()
          if (reconnected) {
            ttsSent = this._ttsApi.sendText(wakeResponse)
          }
        }
        if (!ttsSent) {
          log.error(
            '[ApiWrapper] TTS sendText failed for wake response after reconnection, sending fallback outputAudioComplete',
          )
          this._wsClient.send(
            new WsOutputAudioCompleteResponseSuccess(
              this._wsClient.id,
              this._wsClient.id,
              this._conversationId,
            ),
          )
        } else {
          // TTS sendText succeeded — _isReady will be restored by _ttsApi.onFinish callback
          waitingForTtsCompletion = true
        }

        this._wsClient.send(
          new WsChatCompleteResponseSuccess(
            this._wsClient.id,
            this._wsClient.id,
            this._conversationId,
            0,
            0,
          ),
        )
      }

      // Update current person ID if recognized
      if (personId) {
        this._currentPersonId = personId
      }

      return true
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        log.debug('[ApiWrapper] Wake audio processing aborted')
        return false
      }
      log.error(error, '[ApiWrapper] Error processing wake audio')
      return false
    } finally {
      this._isProcessingWakeAudio = false
      // Restore _isReady if TTS was not successfully sent
      // (when TTS is sent, _ttsApi.onFinish callback will restore _isReady)
      if (!waitingForTtsCompletion) {
        this._isReady = true
        this._hasInterruptedThisRound = false
      }
    }
  }

  /**
   * Ensure TTS connection is established and session is started.
   */
  private async _ensureTtsConnection(): Promise<boolean> {
    if (this._ttsApi.isConnected) {
      return true
    }

    try {
      const ttsConnected = await this._ttsApi.connect()
      if (!ttsConnected) {
        log.error('[ApiWrapper] Failed to connect TTS for wake audio')
        return false
      }

      const sessionStarted = await this._ttsApi.startSession()
      if (!sessionStarted) {
        log.error('[ApiWrapper] Failed to start TTS session for wake audio')
        return false
      }

      return true
    } catch (error) {
      log.error(error, '[ApiWrapper] Error establishing TTS connection for wake audio')
      return false
    }
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

        // Do not establish a streaming ASR connection while wake audio is
        // being processed — `recognizeOnce` uses a separate one-shot
        // connection to the same Volcengine endpoint, and opening a second
        // concurrent connection may cause one of them to be closed.
        if (this._isProcessingWakeAudio) {
          this._audioQueue = []
          break
        }

        // If not connected, establish connections (handles initial connect and reconnect after ASR reset)
        if (!this._isConnectionReady() && !this._isConnecting()) {
          await this._establishConnections()
        }

        // Wait for connection to complete
        while (this._isConnecting() || this._isAborting) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }

        // If connection failed, clear the queue and exit
        if (!this._isConnectionReady()) {
          this._audioQueue = []
          log.error('[ApiWrapper] API connections not ready, closing WebSocket')
          this._wsClient.close(1008, 'API connection failed')
          break
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

        // If this is the last audio packet, reset the ASR connection.
        // By the time inputAudioComplete arrives (sent when the client's
        // WAITING_RESPONSE times out after 30s of silence), the ASR has long
        // since finished recognition and called onFinish. There is nothing
        // left to wait for — just reset the connection for the next session.
        if (audioData.isComplete) {
          log.debug('[ApiWrapper] Resetting ASR WebSocket connection')
          await this._asrApi.reset()
        }
      }
    } catch (error) {
      log.error(error, '[WsAction] Error in audio queue processing')
    } finally {
      this._isProcessingAudioQueue = false
    }
  }

  private _isConnectionReady(): boolean {
    return this._asrApi.isConnected
  }

  private _isConnecting(): boolean {
    return this._asrApi.isConnecting
  }

  private _getCombinedAudioBase64(): string | null {
    if (this._audioBufferForVpr.length === 0) {
      log.warn('[VPR] No audio data buffered for voice print processing')
      return null
    }

    const WAV_HEADER_SIZE = 44

    // Decode all base64 WAV chunks into raw buffers
    const wavBuffers = this._audioBufferForVpr.map((str) => Buffer.from(str, 'base64'))

    // Validate first chunk has at least a WAV header
    const firstChunk = wavBuffers[0]
    if (!firstChunk || firstChunk.length < WAV_HEADER_SIZE) {
      log.warn('[VPR] First audio chunk too small to contain a valid WAV header')
      return null
    }

    // Extract PCM data from each WAV chunk (skip the 44-byte standard header)
    // Each chunk from the Go client is a complete WAV file with a standard 44-byte header
    const pcmBuffers = wavBuffers.map((buf) => {
      if (buf.length <= WAV_HEADER_SIZE) return Buffer.alloc(0)
      return buf.subarray(WAV_HEADER_SIZE)
    })

    const combinedPcm = Buffer.concat(pcmBuffers)
    if (combinedPcm.length === 0) {
      log.warn('[VPR] Combined audio has no PCM data')
      return null
    }

    // Build a single valid WAV file:
    // Copy the first chunk's header as template (preserves sample rate, channels, bit depth)
    // then update the size fields to reflect the combined data
    const header = Buffer.alloc(WAV_HEADER_SIZE)
    firstChunk.copy(header, 0, 0, WAV_HEADER_SIZE)
    header.writeUInt32LE(combinedPcm.length + 36, 4) // RIFF chunk size = data + 36
    header.writeUInt32LE(combinedPcm.length, 40) // data sub-chunk size

    log.debug(
      `[VPR] Combined ${this._audioBufferForVpr.length} audio chunks: ${combinedPcm.length} bytes PCM (${(combinedPcm.length / 32000).toFixed(2)}s)`,
    )

    return Buffer.concat([header, combinedPcm]).toString('base64')
  }

  private async _handleVoicePrintRecognition() {
    const combinedAudioBase64 = this._getCombinedAudioBase64()
    if (!combinedAudioBase64) {
      return null
    }

    try {
      log.debug('[VPR] Starting voice recognition...')
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
      log.debug('[WsAction] Establishing ASR connection')

      const asrConnected = await this._asrApi.connect()

      if (!asrConnected) {
        log.error('[WsAction] Failed to connect to ASR API')
        return
      }

      // TTS is connected per-use via _ensureTtsConnection() when text is ready to send
      log.debug('[WsAction] ASR connection established successfully')
    } catch (error) {
      log.error(error, '[WsAction] Failed to establish ASR connection')
    }
  }

  private async _interruptOngoingProcesses(): Promise<void> {
    // Idempotency guard: prevent concurrent double-interrupts
    if (this._isAborting) {
      log.debug('[WsAction] Interrupt already in progress, skipping')
      return
    }

    this._isAborting = true
    log.debug('[WsAction] ASR finished during active session, interrupting')

    // Notify client to stop playback immediately
    this._wsClient.send(new WsCancelOutputResponseSuccess(this._wsClient.id, 'voice'))

    // Abort ongoing Chat API and TTS — TTS will be reconnected per-use when next needed
    this._chatApi.abort()
    this._ttsApi.abort()

    this._isAborting = false
  }
}
