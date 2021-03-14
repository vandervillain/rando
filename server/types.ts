export interface ActiveUser {
  id: string
  socketId: string
  name: string
  room: ActiveRoom | null
  inCall: boolean
}

export interface ActiveRoom {
  id: string
  name: string
}