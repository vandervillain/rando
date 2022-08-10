export type User = {
  id: string
  name: string
  avatar?: string
  sound?: string
}

export type CallSettings = {
  peers: (UserSettings & User)[]
}

export type UserSettings = {
  id: string
  threshold: number
  gain: number
  muted: boolean
}

export type RoomPeer = {
  socketId: string
  roomId: string
  inCall: boolean
  order: number
} & User

export type Room = {
  id: string
  name: string
}
