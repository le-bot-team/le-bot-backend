export enum MessageType {
  fullClientRequest = 0b0001,
  audioOnlyRequest = 0b0010,
  fullServerResponse = 0b1001,
  errorResponse = 0b1111,
  // TTS specific message types
  ttsRequest = 0b0100,
  ttsResponse = 0b1100,
}

export enum SequenceNumberType {
  none = 0b0000,
  positive = 0b0001,
  negative = 0b0010,
  negativeWithSequence = 0b0011,
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

// https://www.volcengine.com/docs/6561/1354869#%E8%AF%B7%E6%B1%82%E6%B5%81%E7%A8%8B
export interface FullClientRequest {
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

export type FullServerResponse = {
  messageType: MessageType.fullServerResponse
  sequenceNumberType: SequenceNumberType
  sequenceNumber: number
} & (
  | {
      serializationType: SerializationType.json
      payload: object
    }
  | {
      serializationType: SerializationType.none
      payload: Uint8Array
    }
)

export interface ErrorResponse {
  messageType: MessageType.errorResponse
  errorType: ErrorType
  errorMessage: string
}

// TTS related types
export interface TtsRequest {
  user?: {
    uid?: string
    did?: string
    platform?: string
    sdk_version?: string
    app_version?: string
  }
  audio: {
    format: 'pcm' | 'wav' | 'mp3'
    codec?: 'raw' | 'opus'
    rate?: 16000 | 24000 | 44100
    bits?: 16 | 24
    channel?: 1 | 2
  }
  request: {
    text: string
    model_name?: string
    voice_type?: string
    speed?: number // 语速，范围 0.5-2.0
    volume?: number // 音量，范围 0.1-3.0
    pitch?: number // 音调，范围 0.5-2.0
    emotion?: string // 情感
    language?: string // 语言
  }
}

export type TtsServerResponse = {
  messageType: MessageType.ttsResponse
  sequenceNumberType: SequenceNumberType
  sequenceNumber: number
} & (
  | {
      serializationType: SerializationType.json
      payload: {
        audio?: string // base64 encoded audio data
        finished?: boolean
      }
    }
  | {
      serializationType: SerializationType.none
      payload: Uint8Array // raw audio data
    }
)
