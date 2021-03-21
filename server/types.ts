export interface ActiveUser {
  id: string
  ipAddress: string
  socketId: string
  name: string | null
  room: ActiveRoom | null
  inCall: boolean
}

export interface ActiveRoom {
  id: string
  name: string
  createdBy: string
  destroyBy?: number
}