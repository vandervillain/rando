declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      APP_ENV: 'test' | undefined
      NEXT_PUBLIC_CLIENT: string
      NEXT_PUBLIC_SOCKET: string
      NEXT_PUBLIC_TURN: string
      NEXT_PUBLIC_TURN_SERVER_USER: string
      NEXT_PUBLIC_TURN_SERVER_PASS: string
    }
  }
}

export {}
