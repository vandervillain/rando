import React, { FunctionComponent, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthContext } from './authManager'
import { useDataContext } from './dataManager'
import { Room, RoomPeer, useRoomContext } from './roomManager'
import { useRtcConnections } from './rtcConnectionManager'
import { useStream } from './streamManager'

type SocketManagerContext = {
  subscribe: (c: SocketSubscriptionCallbacks, userId: string, userName: string, roomName: string) => void
  disconnect: () => void
  joinCall: (roomId: string) => void
  leaveCall: (roomId: string) => void
  sendOffer: (id: string, offer: RTCSessionDescriptionInit) => void
  sendAnswer: (id: string, answer: RTCSessionDescriptionInit) => void
  sendCandidate: (id: string, candidate: RTCIceCandidate) => void
}

const SocketContext = React.createContext<SocketManagerContext>({
  subscribe: (c: SocketSubscriptionCallbacks) => {},
  disconnect: () => {},
  joinCall: (roomId: string) => {},
  leaveCall: (roomId: string) => {},
  sendOffer: (id: string, offer: RTCSessionDescriptionInit) => {},
  sendAnswer: (id: string, answer: RTCSessionDescriptionInit) => {},
  sendCandidate: (id: string, candidate: RTCIceCandidate) => {},
})

export const useWebsocket = () => React.useContext(SocketContext)

type SocketManagerProps = {}

export type SocketSubscriptionCallbacks = {
  onJoinedRoom: (user: ActiveUser, peers: ActiveUser[]) => void
  onPeerJoinedRoom: (user: ActiveUser) => void
  onPeerJoiningCall: (user: ActiveUser) => void
  onPeerLeftRoom: (user: ActiveUser) => void
  onPeerLeftCall: (user: ActiveUser) => void
  onOffer: (user: ActiveUser, offer: RTCSessionDescriptionInit) => void
  onAnswer: (user: ActiveUser, answer: RTCSessionDescriptionInit) => void
  onCandidate: (id: string, candidate: RTCIceCandidate) => void
}

/** from server */
export interface ActiveUser {
  id: string
  socketId: string
  name: string
  room: string | null
  inCall: boolean
}

let socket: Socket = io('http://localhost:5000')

export const SocketManager: FunctionComponent<SocketManagerProps> = ({ children }) => {
  const subscribe = (c: SocketSubscriptionCallbacks, userId: string, userName: string, roomName: string) => {
    socket.off('joined-room')
    socket.off('peer-joining-call')
    socket.off('offer')
    socket.off('answer')
    socket.off('candidate')
    socket.off('peer-joined-room')
    socket.off('peer-left-room')
    socket.off('peer-left-call')

    socket.on('joined-room', c.onJoinedRoom)
    socket.on('peer-joining-call', c.onPeerJoiningCall)
    socket.on('offer', c.onOffer)
    socket.on('answer', c.onAnswer)
    socket.on('candidate', c.onCandidate)
    socket.on('peer-joined-room', c.onPeerJoinedRoom)
    socket.on('peer-left-room', c.onPeerLeftRoom)
    socket.on('peer-left-call', c.onPeerLeftCall)

    console.log('you are joining room ' + roomName)
    socket.emit('join-room', userId, userName, roomName)
  }

  const joinCall = (roomId: string) => {
    socket.emit('join-call', roomId)
  }

  const leaveCall = (roomId: string) => {
    socket.emit('leave-call', roomId)
  }

  const sendOffer = (id: string, offer: RTCSessionDescriptionInit) => {
    socket.emit('offer', id, offer)
  }
  const sendAnswer = (id: string, answer: RTCSessionDescriptionInit) => {
    socket.emit('answer', id, answer)
  }
  const sendCandidate = (id: string, candidate: RTCIceCandidate) => {
    socket.emit('candidate', id, candidate)
  }

  const disconnect = () => {
    socket.off('joined-room')
    socket.off('peer-joining-call')
    socket.off('offer')
    socket.off('answer')
    socket.off('candidate')
    socket.off('peer-joined-room')
    socket.off('peer-left-room')
    socket.off('peer-left-call')

    socket?.disconnect()
  }

  return (
    <SocketContext.Provider
      value={{
        subscribe,
        disconnect,
        joinCall,
        leaveCall,
        sendOffer,
        sendAnswer,
        sendCandidate,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
