declare module 'bun' {
  interface Env {
    APP_ID: string
    ARK_API_KEY: string
    DATABASE_URL: string
    OPENSPEECH_ACCESS_TOKEN: string
    SMTP_HOST: string
    SMTP_PORT: string
    SMTP_PASSWORD: string
    SMTP_USERNAME: string
    VPR_URL: string
  }
}
