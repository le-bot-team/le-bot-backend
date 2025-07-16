import {
  CompressionType,
  ErrorResponse,
  ErrorType,
  FullClientRequest,
  FullServerResponse,
  MessageType,
  SequenceNumberType,
  SerializationType,
} from './types'

/*
Header structure for WebSocket messages:
| Byte | bit 7 ~ 4                         | bit 3 ~ 0                         |
| ---- | --------------------------------- | --------------------------------- |
| 0    | Protocol version                  | Header size                       |
| 1    | Message type                      | Message type specific flags       |
| 2    | Message serialization method      | Message compression               |
| 3    | Reserved                          | Reserved                          |
*/

export const parseResponseMessage = (
  message: ArrayBuffer,
): FullServerResponse | ErrorResponse => {
  const view = new DataView(message)

  const protocolVersion = view.getUint8(0) >> 4
  const headerSize = view.getUint8(0) & 0b00001111
  if (protocolVersion !== 0b0001 || headerSize !== 0b0001) {
    throw new Error('Unsupported protocol version or header size')
  }

  const messageType = view.getUint8(1) >> 4
  const sequenceNumberType = view.getUint8(1) & 0b00001111
  const serializationType = view.getUint8(2) >> 4
  const compressionType = view.getUint8(2) & 0b00001111
  if (
    !(messageType in MessageType) ||
    !(sequenceNumberType in SequenceNumberType) ||
    !(serializationType in SerializationType) ||
    !(compressionType in CompressionType)
  ) {
    throw new Error('Invalid message format')
  }

  switch (messageType) {
    case MessageType.fullServerResponse: {
      const sequenceNumber = view.getUint32(4)
      const payloadLength = view.getUint32(8)
      const payloadOffset = 12
      if (payloadOffset + payloadLength > message.byteLength) {
        throw new Error('Payload length exceeds message length')
      }

      const payloadBytes = new Uint8Array(message, payloadOffset, payloadLength)

      // 如果数据被压缩，需要解压缩
      if (compressionType === CompressionType.gzip) {
        throw new Error('gzip decompression not implemented')
        // try {
        //   payloadBytes = gzipDecompress(payloadBytes)
        // } catch (e) {
        //   console.warn('Failed to decompress gzip data:', e)
        //   // 如果解压失败，尝试直接使用原始数据
        // }
      }

      if (serializationType === SerializationType.json) {
        return {
          messageType: MessageType.fullServerResponse,
          sequenceNumberType: sequenceNumberType as SequenceNumberType,
          sequenceNumber,
          serializationType: SerializationType.json,
          payload: JSON.parse(new TextDecoder().decode(payloadBytes)),
        }
      }
      return {
        messageType: MessageType.fullServerResponse,
        sequenceNumberType: sequenceNumberType as SequenceNumberType,
        sequenceNumber,
        serializationType: SerializationType.none,
        payload: payloadBytes,
      }
    }
    case MessageType.errorResponse: {
      const errorCode = view.getUint32(4)
      const errorMessageLength = view.getUint32(8)
      const errorMessageOffset = 12
      if (errorMessageOffset + errorMessageLength > message.byteLength) {
        throw new Error('Error message length exceeds message length')
      }

      const errorMessageBytes = new Uint8Array(
        message,
        errorMessageOffset,
        errorMessageLength,
      )

      // 如果错误消息被压缩，需要解压缩
      if (compressionType === CompressionType.gzip) {
        throw new Error('gzip decompression not implemented')
        // try {
        //   errorMessageBytes = gzipDecompress(errorMessageBytes)
        // } catch (e) {
        //   console.warn('Failed to decompress error message:', e)
        // }
      }

      const errorMessage = new TextDecoder().decode(errorMessageBytes)
      return {
        messageType: MessageType.errorResponse,
        errorType:
          errorCode >= 55000000 && errorCode < 55100000
            ? ErrorType.internalError
            : (errorCode as ErrorType),
        errorMessage,
      }
    }
    default: {
      throw new Error('Unsupported response message type')
    }
  }
}

export const serializeRequestMessage = (
  messageType: MessageType,
  sequenceNumberType: SequenceNumberType,
  compressionType: CompressionType,
  payload: object | Uint8Array,
  sequenceNumber?: number,
): ArrayBuffer => {
  let serializationType: SerializationType
  let payloadBytes: Uint8Array

  if (typeof payload === 'object') {
    payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
    serializationType = SerializationType.json
    // 暂时不压缩，等后续安装pako库
    if (compressionType === CompressionType.gzip) {
      console.warn('GZIP compression not implemented, using uncompressed data')
    }
  } else {
    payloadBytes = payload
    serializationType = SerializationType.none
    // 暂时不压缩音频数据
    if (compressionType === CompressionType.gzip) {
      console.warn('GZIP compression not implemented, using uncompressed data')
    }
  }

  const buffer = new ArrayBuffer(12 + payloadBytes.length)
  const view = new DataView(buffer)

  view.setUint8(0, (0b0001 << 4) | 0b0001) // Protocol version 1, header size 1
  view.setUint8(1, (messageType << 4) | sequenceNumberType)
  view.setUint8(2, (serializationType << 4) | compressionType)
  view.setUint8(3, 0)
  view.setUint32(4, sequenceNumber || 1)
  view.setUint32(8, payloadBytes.length)

  new Uint8Array(buffer, 12).set(payloadBytes)

  return buffer
}

// 简单的gzip压缩实现，或者你可以安装pako库
// 如果有pako: import * as pako from 'pako'
// function gzipCompress(data: Uint8Array): Uint8Array {
//   // 临时实现：如果你有pako库，使用以下代码：
//   // return pako.gzip(data)
//
//   // 当前简化实现，不压缩（用于测试）
//   // 实际部署时需要安装pako并启用真正的压缩
//   console.warn('Using uncompressed data - install pako for proper gzip compression')
//   return new Uint8Array(data) // 修复类型错误
// }

// function gzipDecompress(data: Uint8Array): Uint8Array {
//   // 如果你有pako库：
//   // return pako.ungzip(data)
//
//   // 当前简化实现
//   return new Uint8Array(data) // 修复类型错误
// }

export const createFullClientRequest = (
  userId: bigint,
  deviceId: string,
): FullClientRequest => {
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
    },
  }
}
