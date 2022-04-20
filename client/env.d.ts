declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      APP_ENV: 'test' | undefined
      SIGNALR_SERVER_URL: string
      TURN_SERVER: string
      TURN_SERVER_SERVER_USER: string
      TURN_SERVER_SERVER_PASS: string
    }
  }
}

export {}
