declare module 'bun' {
  interface Env {
    CHAT_API_URL: string
    DATABASE_URL: string
    OPENSPEECH_ACCESS_TOKEN: string
    OPENSPEECH_APP_ID: string
    REDIS_URL: string | undefined
    SMTP_FROM: string
    SMTP_HOST: string
    SMTP_PASSWORD: string
    SMTP_PORT: number
    SMTP_USERNAME: string
    TTL_ACCESS_TOKEN: number
    TTL_CHALLENGE_CODE: number
    VPR_THRESHOLD: number
    VPR_URL: string
  }
}
