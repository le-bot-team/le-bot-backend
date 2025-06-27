import { ElysiaWS } from 'elysia/dist/ws'

import {
  wsClearContextResponseSuccess,
  wsChatCompleteResponseError,
  wsChatCompleteResponseSuccess,
  wsOutputAudioCompleteResponseSuccess,
  wsOutputAudioStreamResponseSuccess,
  wsOutputTextCompleteResponseSuccess,
  wsOutputTextStreamResponseSuccess,
  wsUpdateConfigResponseSuccess,
  wsCancelOutputResponseSuccess,
} from './websocket'

export enum CozeWsEventType {
  // Upstream events
  chatUpdate = 'chat.update',
  inputAudioBufferAppend = 'input_audio_buffer.append',
  inputAudioBufferComplete = 'input_audio_buffer.complete',
  inputAudioBufferClear = 'input_audio_buffer.clear',
  conversationMessageCreate = 'conversation.message.create',
  conversationClear = 'conversation.clear',
  conversationChatSubmitToolOutputs = 'conversation.chat.submit_tool_outputs',
  conversationChatCancel = 'conversation.chat.cancel',
  // Downstream events
  chatCreated = 'chat.created',
  chatUpdated = 'chat.updated',
  conversationChatCreated = 'conversation.chat.created',
  conversationChatInProgress = 'conversation.chat.in_progress',
  conversationMessageDelta = 'conversation.message.delta',
  conversationAudioDelta = 'conversation.audio.delta',
  conversationMessageCompleted = 'conversation.message.completed',
  conversationAudioCompleted = 'conversation.audio.completed',
  conversationChatCompleted = 'conversation.chat.completed',
  conversationChatFailed = 'conversation.chat.failed',
  error = 'error',
  inputAudioBufferCompleted = 'input_audio_buffer.completed',
  inputAudioBufferCleared = 'input_audio_buffer.cleared',
  conversationCleared = 'conversation.cleared',
  conversationChatCanceled = 'conversation.chat.canceled',
  conversationAudioTranscriptUpdate = 'conversation.audio_transcript.update',
  conversationAudioTranscriptCompleted = 'conversation.audio_transcript.completed',
  conversationChatRequiresAction = 'conversation.chat.requires_action',
  inputAudioBufferSpeechStarted = 'input_audio_buffer.speech_started',
  inputAudioBufferSpeechStopped = 'input_audio_buffer.speech_stopped',
}

export interface CozeWsResponse {
  id: string
  event_type: CozeWsEventType
}

export interface CozeWsResponseChatUpdated extends CozeWsResponse {
  data: {
    chat_config: {
      conversation_id: string
    }
  }
}

export interface CozeWsResponseConversationChatProcessing
  extends CozeWsResponse {
  data: {
    last_error?: {
      Code: number
      Msg: string
    }
  }
}

export interface CozeWsResponseConversationMessage extends CozeWsResponse {
  data: {
    chat_id: string
    conversation_id: string
    role: 'assistant' | 'user'
    content: string
    content_type: 'card' | 'object_string' | 'text'
    type:
      | 'answer'
      | 'function_call'
      | 'question'
      | 'tool_output'
      | 'tool_response'
      | 'verbose'
  }
}

export interface CozeWsResponseConversationChatCompleted
  extends CozeWsResponse {
  data: {
    chat_id: string
    conversation_id: string
    created_at: number
    completed_at: number
    last_error?: {
      Code: number
      Msg: string
    }
  }
}

export interface CozeWsResponseConversationChatCanceled extends CozeWsResponse {
  data: {
    code?: number
    msg?: string
  }
}

export type WsHandler<T> = (message: T) => Promise<void> | void

export class CozeWsWrapper {
  readonly url
  private _eventHandlers = new Map<CozeWsEventType, WsHandler<never>>()
  private _openHandlers = new Map<string, WsHandler<never>>()
  private _ws: WebSocket | undefined
  private _wsClient: ElysiaWS
  private _readyToSendEvent = false
  private _errorList: { code: number; message: string }[] = []

  constructor(wsClient: ElysiaWS, accessToken: string, botId: string) {
    this._wsClient = wsClient
    this.url = `wss://ws.coze.cn/v1/chat?authorization=Bearer ${accessToken}&bot_id=${botId}`
    this._connect()
    this.setEventHandler(CozeWsEventType.chatCreated, () => {
      this._readyToSendEvent = true
    })
    this.setEventHandler<CozeWsResponseChatUpdated>(
      CozeWsEventType.chatUpdated,
      (message) => {
        this._wsClient.send(
          JSON.stringify(
            new wsUpdateConfigResponseSuccess(
              message.id,
              message.data.chat_config.conversation_id,
            ),
          ),
        )
      },
    )
    this.setEventHandler<CozeWsResponseConversationChatProcessing>(
      [
        CozeWsEventType.conversationChatCreated,
        CozeWsEventType.conversationChatInProgress,
      ],
      (message) => {
        if (message.data.last_error) {
          this._errorList.push({
            code: message.data.last_error.Code,
            message: message.data.last_error.Msg,
          })
        }
      },
    )
    this.setEventHandler<CozeWsResponseConversationMessage>(
      CozeWsEventType.conversationMessageDelta,
      (message) => {
        if (message.data.type === 'answer') {
          this._wsClient.send(
            JSON.stringify(
              new wsOutputTextStreamResponseSuccess(
                message.id,
                message.data.chat_id,
                message.data.conversation_id,
                message.data.content,
              ),
            ),
          )
        } else {
          console.log(message)
        }
      },
    )
    this.setEventHandler<CozeWsResponseConversationMessage>(
      CozeWsEventType.conversationMessageCompleted,
      (message) => {
        if (message.data.type === 'answer') {
          this._wsClient.send(
            JSON.stringify(
              new wsOutputTextCompleteResponseSuccess(
                message.id,
                message.data.chat_id,
                message.data.conversation_id,
                message.data.content,
              ),
            ),
          )
        } else {
          console.log(message)
        }
      },
    )
    this.setEventHandler<CozeWsResponseConversationMessage>(
      CozeWsEventType.conversationAudioDelta,
      (message) => {
        if (message.data.type === 'answer') {
          this._wsClient.send(
            JSON.stringify(
              new wsOutputAudioStreamResponseSuccess(
                message.id,
                message.data.chat_id,
                message.data.conversation_id,
                message.data.content,
              ),
            ),
          )
        } else {
          console.log(message)
        }
      },
    )
    this.setEventHandler<CozeWsResponseConversationMessage>(
      CozeWsEventType.conversationAudioCompleted,
      (message) => {
        if (message.data.type === 'answer') {
          this._wsClient.send(
            JSON.stringify(
              new wsOutputAudioCompleteResponseSuccess(
                message.id,
                message.data.chat_id,
                message.data.conversation_id,
              ),
            ),
          )
        } else {
          console.log(message)
        }
      },
    )
    this.setEventHandler<CozeWsResponseConversationChatCompleted>(
      CozeWsEventType.conversationChatCompleted,
      (message) => {
        if (message.data.last_error) {
          this._errorList.push({
            code: message.data.last_error.Code,
            message: message.data.last_error.Msg,
          })
        }
        if (this._errorList.length) {
          this._wsClient.send(
            JSON.stringify(
              new wsChatCompleteResponseSuccess(
                message.id,
                message.data.chat_id,
                message.data.conversation_id,
                message.data.created_at,
                message.data.completed_at,
              ),
            ),
          )
        } else {
          this._wsClient.send(
            JSON.stringify(
              new wsChatCompleteResponseError(
                message.id,
                message.data.chat_id,
                message.data.conversation_id,
                message.data.created_at,
                message.data.completed_at,
                this._errorList,
              ),
            ),
          )
        }
      },
    )
    this.setEventHandler<CozeWsResponse>(
      CozeWsEventType.conversationCleared,
      (message) => {
        this._wsClient.send(
          JSON.stringify(new wsClearContextResponseSuccess(message.id)),
        )
      },
    )
    this.setEventHandler<CozeWsResponseConversationChatCanceled>(
      CozeWsEventType.conversationChatCanceled,
      (message) => {
        this._wsClient.send(
          JSON.stringify(
            new wsCancelOutputResponseSuccess(
              message.id,
              message.data?.code === 1 ? 'voice' : 'manual',
            ),
          ),
        )
      },
    )
  }

  clearErrorList() {
    this._errorList = []
  }

  destroy() {
    this._eventHandlers.clear()
    this._openHandlers.clear()
    if (this._ws) {
      this._ws.onclose = null
      this._ws.close()
      this._ws = undefined
    }
  }

  setEventHandler<T extends CozeWsResponse>(
    eventTypeOrEventTypeList: CozeWsEventType | CozeWsEventType[],
    handler: WsHandler<T>,
  ): void {
    if (Array.isArray(eventTypeOrEventTypeList)) {
      eventTypeOrEventTypeList.forEach((eventType) => {
        this._eventHandlers.set(eventType, handler)
      })
    } else {
      this._eventHandlers.set(eventTypeOrEventTypeList, handler)
    }
  }

  deleteEventHandler(eventType: CozeWsEventType) {
    this._eventHandlers.delete(eventType)
  }

  get isOpen() {
    return this._ws?.readyState === WebSocket.OPEN
  }

  sendEvent(id: string, eventType: CozeWsEventType, data: object = {}) {
    if (!this._readyToSendEvent) {
      console.warn('WebSocket not ready to send events')
      return false
    }
    return this.sendRaw(JSON.stringify({ ...data, id, event_type: eventType }))
  }

  sendRaw(message: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (!this.isOpen) {
      console.log('WebSocket not connected')
      return false
    }
    this._ws?.send(message)
    return true
  }

  private _connect() {
    this._ws = new WebSocket(this.url)
    this._ws.onclose = async () => {
      console.warn('WebSocket closed, reconnecting...')
      setTimeout(() => {
        this._connect()
      }, 3000)
    }
    this._ws.onmessage = async (event) => {
      const message: CozeWsResponse = JSON.parse(event.data)
      console.log(message)
      const handler = this._eventHandlers.get(message.event_type)
      if (handler) {
        await handler(message as never)
      } else {
        console.warn(`Unknown event_type: ${message.event_type}`, event.data)
      }
    }
  }
}
