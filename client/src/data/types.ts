export type User = {
  id: string
  name: string
  avatar?: string
  sound?: string
}

export type UserSettings = {
  threshold: number
  gain: number
}

export interface RoomPeer {
  id: string
  socketId: string
  name: string
  roomId: string
  inCall: boolean
  order: number
  avatar?: string
  sound?: string
}

export type Room = {
  id: string
  name: string
}
