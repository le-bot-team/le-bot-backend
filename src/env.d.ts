declare module 'bun' {
  interface Env {
    APP_ID: string
    ARK_API_KEY: string
    DATABASE_URL: string
    OPENSPEECH_ACCESS_TOKEN: string
    REDIS_URL: string
    SMTP_FROM: string
    SMTP_HOST: string
    SMTP_PORT: number
    SMTP_PASSWORD: string
    SMTP_USERNAME: string
    TTL_ACCESS_TOKEN: number
    TTL_CHALLENGE_CODE: number
    VPR_URL: string
  }
}
