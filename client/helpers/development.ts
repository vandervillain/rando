export const isDev = process.env.NEXT_PUBLIC_ENV === 'development'

export const getTurnConfig = (): RTCConfiguration | undefined => {
  return isDev
    ? undefined
    : {
        iceServers: [{ urls: process.env.NEXT_PUBLIC_TURN, username: process.env.NEXT_PUBLIC_TURN_SERVER_USER, credential: process.env.NEXT_PUBLIC_TURN_SERVER_PASS }],
        iceTransportPolicy: process.env.NEXT_PUBLIC_TURN_FORCE_RELAY ? 'relay' : 'all',
      }
}
