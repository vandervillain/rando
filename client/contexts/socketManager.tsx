import React, { FunctionComponent, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDataContext } from './dataManager'
import { useRtcConnections } from './rtcConnectionManager'
import { useStream } from './streamManager'

type SocketManagerContext = {
  room: RoomState
  joinRoom: (id: string) => void
  makeCall: () => void
  leaveCall: () => void
  changePeerOutput: (id: string, output: boolean) => void
}

export const SocketContext = React.createContext<SocketManagerContext>({
  room: {
    name: null,
    self: { id: '', inCall: false, isOutputting: false },
    peers: [],
  },
  joinRoom: () => {},
  makeCall: () => {},
  leaveCall: () => {},
  changePeerOutput: (id: string, output: boolean) => {},
})

export const useWebsocket = () => React.useContext(SocketContext)

type SocketManagerProps = {}
export type Peer = {
  id: string
  inCall: boolean
  isOutputting: boolean
}
export type RoomState = {
  name: string | null
  self: Peer
  peers: Peer[]
}

const socket: Socket = io('http://localhost:5000')

export const SocketManager: FunctionComponent<SocketManagerProps> = ({ children }) => {
  const data = useDataContext()
  const streamMgr = useStream()
  const rtc = useRtcConnections()
  const [roomState, setRoomState] = useState<RoomState>({ name: null, self: { id: socket.id, inCall: false, isOutputting: false }, peers: [] })

  const joinedRoom = (roomName: string, peers: Peer[]) => {
    console.log(`you joined these peers in ${roomName}:`)
    console.log(peers)
    setRoomState({ name: roomName, self: { id: socket.id, inCall: false, isOutputting: false }, peers: peers })
  }

  const peerJoiningCall = async (peerId: string) => {
    console.log(`${peerId} is joining the call`)

    // if current user is in call too, then start up connection workflow
    if (roomState.self.inCall) {
      const peerConnection = rtc.addConnection(peerId, (id, candidate) => {
        socket.emit('candidate', peerId, candidate)
      })?.conn

      if (peerConnection) {
        // send the new peer an offer to connect
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        socket.emit('offer', peerId, offer)
      }
    }

    // need to highlight that the peer is in call in UI
    const peerUpdate = [...roomState.peers]
    const peer = peerUpdate.find((p) => p.id === peerId)
    if (peer) {
      peer.inCall = true
      setRoomState((prev) => ({ ...prev, peers: peerUpdate }))
    }
  }

  const receivedOffer = async (peerId: string, offer: RTCSessionDescriptionInit) => {
    console.log(`offer received from ${peerId}`)
    const peerConnection = rtc.addConnection(peerId, (id, candidate) => {
      rtc.addIceCandidate(id, candidate)
    })?.conn
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit('answer', peerId, answer)
    }
  }

  const receivedAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
    console.log(`answer received from ${peerId}`)
    const peerConnection = rtc.getConnection(peerId)?.conn
    if (peerConnection) await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  const receivedCandidate = (peerId: string, candidate: RTCIceCandidate) => {
    rtc.addIceCandidate(peerId, candidate)
  }

  const peerJoinedRoom = (peerId: string) => {
    console.log(`peer ${peerId} joined the room`)
    if (!roomState.peers.some((p) => p.id === peerId)) {
      const updatePeers = [...roomState.peers]
      updatePeers.push({ id: peerId, inCall: false, isOutputting: false })
      setRoomState((prev) => ({ ...prev, peers: updatePeers }))
    }
  }

  const peerLeftRoom = (peerId: string) => {
    console.log(`peer ${peerId} left the room`)
    rtc.removeConnection(peerId)
    setRoomState((prev) => ({ ...prev, peers: prev.peers.filter((p) => p.id !== peerId) }))
  }

  const peerLeftCall = (peerId: string) => {
    console.log(`peer ${peerId} left the call`)
    rtc.removeConnection(peerId)
    const peerUpdate = [...roomState.peers]
    const peer = peerUpdate.find((p) => p.id == peerId)
    if (peer) peer.inCall = false
    setRoomState((prev) => ({ ...prev, peers: peerUpdate }))
  }

  const initSocket = () => {
    socket.off('joined-room')
    socket.off('peer-joining-call')
    socket.off('offer')
    socket.off('answer')
    socket.off('candidate')
    socket.off('peer-joined-room')
    socket.off('peer-left-room')
    socket.off('peer-left-call')

    socket.on('joined-room', joinedRoom)
    socket.on('peer-joining-call', peerJoiningCall)
    socket.on('offer', receivedOffer)
    socket.on('answer', receivedAnswer)
    socket.on('candidate', receivedCandidate)
    socket.on('peer-joined-room', peerJoinedRoom)
    socket.on('peer-left-room', peerLeftRoom)
    socket.on('peer-left-call', peerLeftCall)
  }

  const joinRoom = (roomName: string) => {
    console.log('you are joining ' + roomName)
    socket.emit('join-room', roomName)
  }

  const makeCall = async () => {
    console.log('you are joining the call')
    const userData = data.getUserData()
    await streamMgr.streamMic(socket.id, userData.settings)
    socket.emit('join-call', roomState.name)
    setRoomState((prev) => {
      const newState = { ...prev }
      newState.self.inCall = true
      return newState
    })
  }

  const leaveCall = () => {
    console.log('you are leaving the call')
    streamMgr.stopMic(socket.id)
    socket.emit('leave-call', roomState.name)
    rtc.destroy()
    setRoomState((prev) => {
      const newState = { ...prev }
      newState.self.inCall = false
      newState.self.isOutputting = false
      return newState
    })
  }

  const changePeerOutput = (id: string, output: boolean) => {
    const newState = { ...roomState }
    if (newState.self.id === id) {
      if (output != newState.self.isOutputting) newState.self.isOutputting = output
      setRoomState(newState)
    }
  }

  useEffect(() => {
    initSocket()

    return () => {
      console.log('socketManager unmounted')
      socket?.disconnect()
    }
  }, [socket])

  return (
    <SocketContext.Provider
      value={{
        room: roomState,
        joinRoom,
        makeCall,
        leaveCall,
        changePeerOutput,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
