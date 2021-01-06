import React, { FunctionComponent, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Peer } from '../pages/app'
import { useRtcConnections } from './rtcConnectionManager'

type SocketManagerContext = {
  room: RoomState
  joinRoom: (id: string) => void
  makeCall: () => void
  leaveCall: () => void
}
// defining the context with empty prices object
export const SocketContext = React.createContext<SocketManagerContext>({
  room: {
    name: null,
    self: { id: '', inCall: false },
    peers: [],
  },
  joinRoom: () => {},
  makeCall: () => {},
  leaveCall: () => {},
})

// defining a useWebsocket hook for functional components
export const useWebsocket = () => React.useContext(SocketContext)

type SocketManagerProps = {}
type RoomState = {
  name: string | null
  self: Peer
  peers: Peer[]
}

const socket: Socket = io('http://localhost:5000')

export const SocketManager: FunctionComponent<SocketManagerProps> = ({ children }) => {
  const rtc = useRtcConnections()
  const [roomState, setRoomState] = useState<RoomState>({ name: null, self: { id: socket.id, inCall: false }, peers: [] })

  const joinRoom = (roomName: string) => {
    console.log('you are joining ' + roomName)
    socket.emit('join-room', roomName)
  }

  const makeCall = async () => {
    console.log('you are joining the call')
    await rtc.streamMic()
    socket.emit('join-call', roomState.name)
    setRoomState((prev) => {
      const newState = { ...prev }
      newState.self.inCall = true
      return newState
    })
  }

  const leaveCall = () => {
    console.log('you are leaving the call')
    rtc.stopMic()
    socket.emit('leave-call', roomState.name)
    rtc.reset()
    setRoomState((prev) => {
      const newState = { ...prev }
      newState.self.inCall = false
      return newState
    })
  }

  useEffect(() => {
    socket.on('joined-room', (roomName: string, peers: Peer[]) => {
      console.log(`you joined these peers in ${roomName}:`)
      console.log(peers)
      setRoomState((prev) => ({ ...prev, name: roomName, peers: peers }))
    })

    socket.on('peer-joining-call', async (peerId: string) => {
      console.log(`${peerId} is joining the call`)

      // if current user is in call too, then start up connection workflow
      if (roomState.self.inCall) {
        const peerConnection = rtc.addConnection(peerId)?.conn

        if (peerConnection) {
          // send the new peer an offer to connect
          let offer: RTCSessionDescriptionInit = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)
          socket.emit('offer', peerId, offer)
        }
      }

      // need to highlight that the peer is in call in UI
      const peerUpdate = [...roomState.peers]
      const peer = peerUpdate.find((p) => p.id === peerId)
      if (peer) {
        peer.inCall = true
        setRoomState(prev => ({ ...prev, peers: peerUpdate }))
      }
    })

    // receive an offer from a user
    socket.on('offer', async (peerId: string, offer: RTCSessionDescriptionInit) => {
      console.log(`offer received from ${peerId}`)
      const peerConnection = rtc.addConnection(peerId)?.conn
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        socket.emit('answer', peerId, answer)
      }
    })

    // receive an answer from a user
    socket.on('answer', async (peerId: string, answer: RTCSessionDescriptionInit) => {
      console.log(`answer received from ${peerId}`)
      const peerConnection = rtc.getConnection(peerId)?.conn
      if (peerConnection) peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    })

    // another user has joined the same room as this user
    socket.on('peer-joined-room', (peerId: string) => {
      console.log(`peer ${peerId} joined the room`)
      if (!roomState.peers.some((p) => p.id === peerId)) {
        const updatePeers = [...roomState.peers]
        updatePeers.push({ id: peerId, inCall: false })
        setRoomState((prev) => ({ ...prev, peers: updatePeers }))
      }
    })

    socket.on('peer-left-room', (peerId: string) => {
      console.log(`peer ${peerId} left the room`)
      rtc.removeConnection(peerId)
      setRoomState((prev) => ({ ...prev, peers: prev.peers.filter((p) => p.id !== peerId) }))
    })

    socket.on('peer-left-call', (peerId: string) => {
      console.log(`peer ${peerId} left the call`)
      rtc.removeConnection(peerId)
      const peerUpdate = [...roomState.peers]
      const peer = peerUpdate.find((p) => p.id == peerId)
      if (peer) peer.inCall = false
      setRoomState((prev) => ({ ...prev, peers: peerUpdate }))
    })

    return () => {
      console.log('socketManager unmounted')
      socket?.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider
      value={{
        room: roomState,
        joinRoom,
        makeCall,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
