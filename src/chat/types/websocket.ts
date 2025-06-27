class wsBasicResponseSuccess {
  constructor(
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

export class wsBasicResponseError {
  constructor(
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

export class wsUpdateConfigResponseSuccess extends wsBasicResponseSuccess {
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

export class wsOutputTextStreamResponseSuccess extends wsBasicResponseSuccess {
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

export class wsOutputTextCompleteResponseSuccess extends wsBasicResponseSuccess {
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

export class wsOutputAudioStreamResponseSuccess extends wsBasicResponseSuccess {
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

export class wsOutputAudioCompleteResponseSuccess extends wsBasicResponseSuccess {
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

export class wsChatCompleteResponseSuccess extends wsBasicResponseSuccess {
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

export class wsChatCompleteResponseError extends wsBasicResponseError {
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

export class wsClearContextResponseSuccess extends wsBasicResponseSuccess {
  constructor(messageId: string) {
    super(messageId, 'clearContext')
  }
}

export class wsCancelOutputResponseSuccess extends wsBasicResponseSuccess {
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
