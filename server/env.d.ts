declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string
      PORT: string
      CLIENT_SERVER: string
      ADMIN_PASSWORD: string
    }
  }
}

export {}
