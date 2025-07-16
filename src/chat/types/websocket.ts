import { wsUpdateConfigRequestValidator } from 'src/chat/validation/websocket'

export type WsUpdateConfigRequest = typeof wsUpdateConfigRequestValidator.static

abstract class WsBaseResponseSuccess {
  protected constructor(
    private readonly id: string,
    private readonly action: string,
  ) {}

  serialize() {
    return {}
  }

  toJSON() {
    return {
      id: this.id,
      action: this.action,
      success: true,
      ...this.serialize(),
    }
  }
}

abstract class WsBaseResponseError {
  protected constructor(
    private readonly id: string,
    private readonly action: string,
    private readonly message: string,
  ) {}

  serialize() {
    return {}
  }

  toJSON() {
    return {
      id: this.id,
      action: this.action,
      success: false,
      message: this.message,
      ...this.serialize(),
    }
  }
}

export class WsUpdateConfigResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly conversationId: string,
  ) {
    super(messageId, 'updateConfig')
  }

  override serialize() {
    return {
      data: {
        conversationId: this.conversationId,
      },
    }
  }
}

export class WsOutputTextStreamResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly chatId: string,
    private readonly conversationId: string,
    private readonly text: string,
  ) {
    super(messageId, 'outputTextStream')
  }

  override serialize() {
    return {
      data: {
        chatId: this.chatId,
        conversationId: this.conversationId,
        role: 'assistant',
        text: this.text,
      },
    }
  }
}

export class WsOutputTextCompleteResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly chatId: string,
    private readonly conversationId: string,
    private readonly text: string,
  ) {
    super(messageId, 'outputTextComplete')
  }

  override serialize() {
    return {
      data: {
        chatId: this.chatId,
        conversationId: this.conversationId,
        role: 'assistant',
        text: this.text,
      },
    }
  }
}

export class WsOutputAudioStreamResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly chatId: string,
    private readonly conversationId: string,
    private readonly buffer: string,
  ) {
    super(messageId, 'outputAudioStream')
  }

  override serialize() {
    return {
      data: {
        chatId: this.chatId,
        conversationId: this.conversationId,
        buffer: this.buffer,
      },
    }
  }
}

export class WsOutputAudioCompleteResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly chatId: string,
    private readonly conversationId: string,
  ) {
    super(messageId, 'outputAudioComplete')
  }

  override serialize() {
    return {
      data: {
        chatId: this.chatId,
        conversationId: this.conversationId,
      },
    }
  }
}

export class WsChatCompleteResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly chatId: string,
    private readonly conversationId: string,
    private readonly createdAt: number,
    private readonly completedAt: number,
  ) {
    super(messageId, 'chatComplete')
  }

  override serialize() {
    return {
      data: {
        chatId: this.chatId,
        conversationId: this.conversationId,
        createdAt: this.createdAt,
        completedAt: this.completedAt,
      },
    }
  }
}

export class WsChatCompleteResponseError extends WsBaseResponseError {
  constructor(
    messageId: string,
    private readonly chatId: string,
    private readonly conversationId: string,
    private readonly createdAt: number,
    private readonly completedAt: number,
    private readonly errors: { code: number; message: string }[],
  ) {
    super(
      messageId,
      'chatComplete',
      'Some error occurred while completing the chat',
    )
  }

  override serialize() {
    return {
      data: {
        chatId: this.chatId,
        conversationId: this.conversationId,
        createdAt: this.createdAt,
        completedAt: this.completedAt,
        errors: this.errors,
      },
    }
  }
}

export class WsClearContextResponseSuccess extends WsBaseResponseSuccess {
  constructor(messageId: string) {
    super(messageId, 'clearContext')
  }
}

export class WsCancelOutputResponseSuccess extends WsBaseResponseSuccess {
  constructor(
    messageId: string,
    private readonly cancelType: 'manual' | 'voice',
  ) {
    super(messageId, 'cancelOutput')
  }

  override serialize() {
    return {
      data: {
        cancelType: this.cancelType,
      },
    }
  }
}
