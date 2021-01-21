import React, { FunctionComponent, useEffect, useState } from 'react'

type RoomManagerContext = {
  joinedRoom: (peerId: string, roomName: string, peers: Peer[]) => void
  leftRoom: () => void
  joinedCall: () => void
  leftCall: () => void
}

export const RoomContext = React.createContext<RoomManagerContext>({
  joinedRoom: (peerId: string, roomName: string, peers: Peer[]) => {},
  joinedCall: () => {},
  leftCall: () => {},
  leftRoom: () => {}
})

export const useRoomContext = () => React.useContext(RoomContext)

type RoomManagerProps = {}

export type Peer = {
  id: string
  inCall: boolean
  isOutputting: boolean
}
export type RoomState = {
  name: string | null
  peers: Peer[]
}

export const RoomManager: FunctionComponent<RoomManagerProps> = ({ children }) => {
  const [roomState, setRoomState] = useState<RoomState>({
    name: null,
    peers: [],
  })

  const joinedRoom = (peerId: string, roomName: string, peers: Peer[]) => {
    console.log(`you joined these peers in ${roomName}:`)
    console.log(peers)
    const self: Peer = {
      id: peerId,
      inCall: false,
      isOutputting: false
    }
    setRoomState({ name: roomName, peers: [...peers, self] })
  }

  const leftRoom = () => {

  }

  const joinedCall = () => {

  }

  const leftCall = () => {

  }

  useEffect(() => {

    return () => {

    }
  }, [])

  return (
    <RoomContext.Provider
      value={{
        joinedRoom,
        leftRoom,
        joinedCall,
        leftCall
      }}
    >
      {children}
    </RoomContext.Provider>
  )
}
