export enum ProtocolVersionType {
  v1 = 0b0001,
  v2 = 0b0010,
  v3 = 0b0011,
  v4 = 0b0100,
}

export enum HeaderSizeType {
  byte4 = 0b0001,
  byte8 = 0b0010,
  byte12 = 0b0011,
  byte16 = 0b0100,
}

export enum MessageType {
  fullClientRequest = 0b0001,
  audioOnlyRequest = 0b0010,
  fullServerResponse = 0b1001,
  audioOnlyServer = 0b1011,
  frontEndResultServer = 0b1100,
  errorResponse = 0b1111,
}

export enum MessageFlagType {
  noSequence = 0b0000,
  positiveSequence = 0b0001,
  lastNoSequence = 0b0010,
  negativeSequence = 0b0011,
  withEvent = 0b0100,
}

export enum SerializationType {
  none = 0b0000,
  json = 0b0001,
}

export enum CompressionType {
  none = 0b0000,
  gzip = 0b0001,
}

export enum ErrorType {
  success = 20000000,
  invalidRequest = 45000001,
  emptyAudio = 45000002,
  timeout = 45000081,
  invalidAudioFormat = 45000151,
  internalError = 55000000,
  busy = 55000031,
}

export enum TtsEventType {
  none = 0,
  startConnection = 1,
  connectionStarted = 50,
  connectionFinished = 52,
  startSession = 100,
  finishSession = 102,
  sessionStarted = 150,
  sessionFinished = 152,
  taskRequest = 200,
  ttsSentenceStart = 350,
  ttsSentenceEnd = 351,
  ttsResponse = 352,
}

export enum ResponseType {
  asrResponse = 'asrResponse',
  ttsResponse = 'ttsResponse',
  errorResponse = 'errorResponse',
}

// https://www.volcengine.com/docs/6561/1354869#%E8%AF%B7%E6%B1%82%E6%B5%81%E7%A8%8B
export interface AsrRequest {
  user?: {
    uid?: string
    did?: string
    platform?: string
    sdk_version?: string
    app_version?: string
  }
  audio: {
    format: 'pcm' | 'wav' | 'ogg'
    codec?: 'raw' | 'opus' // Default: 'raw'
    rate?: 16000
    bits?: 16 | 24 // Default: 16
    channel?: 1 | 2 // Default: 1
  }
  request: {
    model_name: 'bigmodel'
    enable_itn?: boolean // Default: true
    enable_punc?: boolean // Default: true
    enable_ddc?: boolean // Default: false
    show_utterances?: boolean // Default: false
    result_type?: 'full' | 'single' // Default: 'full'
    vad_segment_duration?: number // Default: 3000 (ms)
    end_window_size?: number // Default: 800 (ms)
    force_to_speech_time?: number // Default: 10000 (ms)
    sensitive_words_filter?: string // Default: ''
    corpus?: {
      boosting_table_name?: string // https://www.volcengine.com/docs/6561/155739
      boosting_table_id?: string // https://www.volcengine.com/docs/6561/155739
      correct_table_name?: string // https://www.volcengine.com/docs/6561/1206007
      correct_table_id?: string // https://www.volcengine.com/docs/6561/1206007
      context?: string // Default: ''
    }
  }
}

export interface TtsRequest {
  user?: {
    uid?: string
  }
  event: TtsEventType
  namespace?: string // Default: 'BidirectionalTTS'
  req_params: {
    text?: string
    speaker: string
    audio_params: {
      format?: 'mp3' | 'ogg_opus' | 'pcm' // Default: 'mp3'
      sample_rate?: 8000 | 16000 | 22050 | 24000 | 32000 | 41000 | 48000 // Default: 24000
      bit_rate?: number // Default: 64000 ~ 160000
      emotion?: string
      emotion_scale?: number // Default: 4
      speech_rate?: number // Default: 0
      loudness_rate?: number // Default: 0
      enable_timestamp?: boolean // Default: false
    }
    additions?: string // JSON string, e.g., '{"disable_markdown_filter": true, "enable_latex_tn": true}'
  }
}

export type AsrResponse = {
  responseType: ResponseType.asrResponse
  messageFlag: Omit<MessageFlagType, MessageFlagType.withEvent>
  sequenceNumber: number
} & (
  | {
      serializationType: SerializationType.json
      data: object
    }
  | {
      serializationType: SerializationType.none
      data: Uint8Array
    }
)

export type TtsResponse = {
  responseType: ResponseType.ttsResponse
  messageFlag: MessageFlagType.withEvent
} & (
  | {
      serializationType: SerializationType.json
      data: object
    }
  | {
      serializationType: SerializationType.none
      data: Uint8Array
    }
) &
  (
    | {
        eventType:
          | TtsEventType.connectionStarted
          | TtsEventType.sessionStarted
          | TtsEventType.ttsResponse
        id: string
      }
    | {
        eventType:
          | TtsEventType.sessionFinished
          | TtsEventType.ttsSentenceStart
          | TtsEventType.ttsSentenceEnd
      }
  )

export interface ErrorResponse {
  responseType: ResponseType.errorResponse
  messageFlag: MessageFlagType.noSequence
  errorType: ErrorType
  errorMessage: string
}
