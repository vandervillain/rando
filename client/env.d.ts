declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      NEXT_PUBLIC_ENV: string
      NEXT_PUBLIC_SOCKET: string
      NEXT_PUBLIC_TURN: string
      NEXT_PUBLIC_TURN_SERVER_USER: string
      NEXT_PUBLIC_TURN_SERVER_PASS: string
      NEXT_PUBLIC_DEBUG_AUDIO: string
    }
  }
}

export {}
