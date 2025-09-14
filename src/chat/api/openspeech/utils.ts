import { gzip, ungzip } from 'pako'
import {
  AsrRequest,
  AsrResponse,
  CompressionType,
  ErrorResponse,
  ErrorType,
  HeaderSizeType,
  MessageFlagType,
  MessageType,
  ProtocolVersionType,
  ResponseType,
  SerializationType,
  TtsEventType,
  TtsRequest,
  TtsResponse,
} from './types'

/*
Message format:
0                 1                 2                 3
| 0 1 2 3 4 5 6 7 | 0 1 2 3 4 5 6 7 | 0 1 2 3 4 5 6 7 | 0 1 2 3 4 5 6 7 |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Version      |   Header Size   |     Msg Type    |      Flags      |
|   (4 bits)      |    (4 bits)     |     (4 bits)    |     (4 bits)    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Serialization   |   Compression   |           Reserved                |
|   (4 bits)      |    (4 bits)     |           (8 bits)                |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                                       |
|                   Optional Header Extensions                          |
|                     (if Header Size > 1)                              |
|                                                                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                                       |
|                           Payload                                     |
|                      (variable length)                                |
|                                                                       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
*/

const parseMessage = (message: ArrayBuffer) => {
  const dataView = new DataView(message)
  const protocolVersion = dataView.getUint8(0) >> 4
  const headerSize = dataView.getUint8(0) & 0x0f
  const messageType = dataView.getUint8(1) >> 4
  const messageFlag = dataView.getUint8(1) & 0x0f
  const serializationType = dataView.getUint8(2) >> 4
  const compressionType = dataView.getUint8(2) & 0x0f
  const reserved = dataView.getUint8(3)
  if (headerSize > 0b0001) {
    throw new Error('Unsupported header size')
  }

  if (
    !(protocolVersion in ProtocolVersionType) ||
    !(headerSize in HeaderSizeType) ||
    !(messageType in MessageType) ||
    !(messageFlag in MessageFlagType) ||
    !(serializationType in SerializationType) ||
    !(compressionType in CompressionType)
  ) {
    throw new Error('Invalid message format')
  }

  return {
    protocolVersion: protocolVersion as ProtocolVersionType,
    headerSize: headerSize as HeaderSizeType,
    messageType: messageType as MessageType,
    messageFlag: messageFlag as MessageFlagType,
    serializationType: serializationType as SerializationType,
    compressionType: compressionType as CompressionType,
    reserved,
    headerExtensions:
      headerSize > 0b0001 ? message.slice(4, 4 * headerSize) : undefined,
    payload: message.slice(4 * headerSize, message.byteLength),
  }
}

export const parseResponseMessage = (
  rawMessage: ArrayBuffer,
): AsrResponse | TtsResponse | ErrorResponse => {
  // console.log({
  //   raw: Array.from(new Uint8Array(rawMessage))
  //     .map((b) => b.toString(2).padStart(8, '0'))
  //     .join(' '),
  // })
  const {
    messageType,
    messageFlag,
    serializationType,
    compressionType,
    payload,
  } = parseMessage(rawMessage)

  // console.log({
  //   protocolVersion,
  //   headerSize,
  //   messageType,
  //   messageFlag,
  //   serializationType,
  //   compressionType,
  //   reserved,
  //   headerExtensions,
  //   payload,
  // })

  if (messageFlag === MessageFlagType.withEvent) {
    const dataView = new DataView(payload)
    const ttsEventTypeCode = dataView.getUint32(0)
    if (!(ttsEventTypeCode in TtsEventType)) {
      throw new Error('Invalid message format')
    }
    const ttsEventType = ttsEventTypeCode as TtsEventType
    switch (ttsEventType) {
      case TtsEventType.connectionStarted:
      case TtsEventType.sessionStarted:
      case TtsEventType.ttsResponse: {
        const idLength = dataView.getUint32(4)
        const idOffset = 8
        const id = new TextDecoder().decode(
          payload.slice(8, idOffset + idLength),
        )
        const dataLength = dataView.getUint32(idOffset + idLength)
        const dataOffset = idOffset + idLength + 4
        if (dataOffset + dataLength > payload.byteLength) {
          throw new Error('Payload length exceeds message length')
        }
        const dataBytes =
          compressionType === CompressionType.gzip
            ? new Uint8Array(
                ungzip(payload.slice(dataOffset, dataOffset + dataLength)),
              )
            : new Uint8Array(payload, dataOffset, dataLength)
        return {
          responseType: ResponseType.ttsResponse,
          messageFlag,
          serializationType,
          data:
            serializationType === SerializationType.json
              ? JSON.parse(new TextDecoder().decode(dataBytes))
              : dataBytes,
          eventType: ttsEventType,
          id,
        }
      }
      case TtsEventType.sessionFinished:
      case TtsEventType.ttsSentenceStart:
      case TtsEventType.ttsSentenceEnd: {
        return {
          responseType: ResponseType.ttsResponse,
          messageFlag,
          serializationType: SerializationType.json,
          data: {},
          eventType: ttsEventType,
        }
      }
      default: {
        throw new Error(
          'Response message has an unsupported event type: ' + ttsEventType,
        )
      }
    }
  }

  const dataView = new DataView(payload)
  const dataCode = dataView.getUint32(0)
  const dataLength = dataView.getUint32(4)
  const dataOffset = 8
  if (dataOffset + dataLength > payload.byteLength) {
    throw new Error('Error message length exceeds payload length')
  }

  const dataBytes =
    compressionType === CompressionType.gzip
      ? new Uint8Array(
          ungzip(payload.slice(dataOffset, dataOffset + dataLength)),
        )
      : new Uint8Array(payload, dataOffset, dataLength)

  switch (messageType) {
    case MessageType.fullServerResponse: {
      return {
        responseType: ResponseType.asrResponse,
        messageFlag,
        sequenceNumber: dataCode,
        serializationType,
        data:
          serializationType === SerializationType.json
            ? JSON.parse(new TextDecoder().decode(dataBytes))
            : dataBytes,
      }
    }
    case MessageType.errorResponse: {
      return {
        responseType: ResponseType.errorResponse,
        messageFlag: MessageFlagType.noSequence,
        errorType:
          dataCode >= 55000000 && dataCode < 55100000
            ? ErrorType.internalError
            : (dataCode as ErrorType),
        errorMessage: new TextDecoder().decode(dataBytes),
      }
    }
    default: {
      throw new Error('Unsupported response rawMessage type')
    }
  }
}

export const serializeRequestMessage = (
  messageType: MessageType,
  messageFlag: MessageFlagType,
  serializationType: SerializationType,
  compressionType: CompressionType,
  extraCode: number,
  payloads: (string | object | Uint8Array)[],
): ArrayBuffer => {
  const payloadBytesList: Uint8Array[] = []
  for (const payload of payloads) {
    let payloadBytes: Uint8Array
    if (payload instanceof Uint8Array) {
      payloadBytes = payload
    } else if (typeof payload === 'object') {
      payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
    } else {
      payloadBytes = new TextEncoder().encode(payload)
    }

    if (compressionType === CompressionType.gzip) {
      payloadBytes = new Uint8Array(gzip(payloadBytes))
    }
    payloadBytesList.push(payloadBytes)
  }

  const buffer = new ArrayBuffer(
    8 + payloadBytesList.reduce((sum, bytes) => sum + 4 + bytes.length, 0),
  )
  const view = new DataView(buffer)

  view.setUint8(0, (0b0001 << 4) | 0b0001) // Protocol version 1, header size 1
  view.setUint8(1, (messageType << 4) | messageFlag)
  view.setUint8(2, (serializationType << 4) | compressionType)
  view.setUint8(3, 0)
  view.setUint32(4, extraCode)

  for (
    let index = 0, currentOffset = 8;
    index < payloadBytesList.length;
    index++
  ) {
    const payloadBytes = payloadBytesList[index]
    view.setUint32(currentOffset, payloadBytes.length)
    currentOffset += 4
    new Uint8Array(buffer, currentOffset).set(payloadBytes)
    currentOffset += payloadBytes.length
  }

  return buffer
}

export const createAsrRequestData = (
  userId: bigint,
  deviceId: string,
): AsrRequest => {
  return {
    user: {
      uid: userId.toString(),
      did: deviceId,
    },
    audio: {
      format: 'wav',
      codec: 'raw',
      rate: 16000,
      bits: 16,
      channel: 1,
    },
    request: {
      model_name: 'bigmodel',
      enable_itn: true,
      enable_punc: true,
      enable_ddc: true,
      show_utterances: true,
      // vad_segment_duration: 1500,
      end_window_size: 200,
      force_to_speech_time: 1000,
    },
  }
}

export const createTtsRequestData = (
  userId: bigint,
  event: TtsEventType,
  voiceType: string,
  text?: string,
): TtsRequest => {
  return {
    user: {
      uid: userId.toString(),
    },
    event: event,
    namespace: 'BidirectionalTTS',
    req_params: {
      text,
      speaker: voiceType,
      audio_params: {
        format: 'pcm',
        sample_rate: 16000,
      },
      additions: JSON.stringify({
        disable_markdown_filter: false,
      }),
    },
  }
}
