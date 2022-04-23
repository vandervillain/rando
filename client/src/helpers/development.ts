export const isDev = process.env.NODE_ENV === 'development'
export const isTest = process.env.APP_ENV === 'test'
export const getTurnConfig = (): RTCConfiguration | undefined => {
  return isDev
    ? undefined
    : {
        iceServers: [{ urls: process.env.TURN_SERVER!, username: process.env.TURN_SERVER_SERVER_USER!, credential: process.env.TURN_SERVER_SERVER_PASS! }],
        iceTransportPolicy: process.env.TURN_SERVER_FORCE_RELAY! ? 'relay' : 'all',
      }
}
