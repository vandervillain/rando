declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production'
      NEXT_PUBLIC_SOCKET: string
      NEXT_PUBLIC_TURN: string
    }
  }
}

export {}
