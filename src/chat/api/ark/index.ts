export class ArkApi {
  constructor() {}

  async chatMessage(conversationId: string, query: string): Promise<string> {
    const response = await Bun.fetch(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.ARK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: query,
          user_id: process.env.ARK_USER_ID,
          model: process.env.ARK_MODEL,
        }),
        verbose: true,
      },
    )

    if (!response.ok || !response.body) {
      const errorBody = await response.json()
      throw new Error(
        `ArkApi HTTP error! status: ${response.status} ${response.statusText}. Details: ${JSON.stringify(
          errorBody,
        )}`,
      )
    }

    const data = await response.json()
    if (data && data.reply) {
      return data.reply
    } else {
      throw new Error('Invalid response from Ark API')
    }
  }
}
