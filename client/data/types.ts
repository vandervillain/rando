export type User = {
  id: string
  name: string
}

export type UserSettings = {
  threshold: number
  gain: number
}

export type UserData = {
  user: User | null
  settings: UserSettings
}

export interface RoomPeer {
  id: string
  socketId: string
  name: string
  room: Room | null
  inCall: boolean
  order: number
}

export type Room = {
  //id: string
  name: string
  /** not on server */
  peers: RoomPeer[]
}
