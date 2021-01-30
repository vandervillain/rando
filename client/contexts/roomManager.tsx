import React, { FunctionComponent, useEffect, useState } from 'react'
import RoomControl from '../components/roomControl'
import { useAuthContext } from './authManager'
import { useDataContext } from './dataManager'
import { useRtcConnections } from './rtcConnectionManager'
import { ActiveUser, useWebsocket } from './socketManager'
import { useStream } from './streamManager'

type RoomManagerContext = {
  getSelf: () => RoomPeer | null
  getRoom: () => Room | null
  joinCall: () => void
  leaveCall: () => void
  joinedRoom: (user: ActiveUser, peers: RoomPeer[]) => void
  peerJoinedRoom: (user: ActiveUser) => void
  peerLeftRoom: (user: ActiveUser) => void
  userOutputUpdate: (id: string, output: boolean) => void
  setIsMuted: (id: string, mute: boolean) => void
  getPeerById: (id: string) => RoomPeer | null
}

const RoomContext = React.createContext<RoomManagerContext>({
  getSelf: () => null,
  getRoom: () => null,
  joinCall: () => {},
  leaveCall: () => {},
  joinedRoom: (user: ActiveUser, peers: RoomPeer[]) => {},
  peerJoinedRoom: (user: ActiveUser) => {},
  peerLeftRoom: (user: ActiveUser) => {},
  userOutputUpdate: (id: string, output: boolean) => {},
  setIsMuted: (id: string, mute: boolean) => {},
  getPeerById: (id: string) => null,
})

export const useRoomContext = () => React.useContext(RoomContext)

type RoomManagerProps = {
  roomId: string
}

export interface RoomPeer extends ActiveUser {
  isOutputting?: boolean
  isMuted?: boolean
}

export type Room = {
  name: string | null
  peers: RoomPeer[]
}

let _self: RoomPeer | null = null
export const RoomManager: FunctionComponent<RoomManagerProps> = ({ roomId, children }) => {
  const [room, setRoom] = useState<Room | null>(null)
  const data = useDataContext()
  const auth = useAuthContext()
  const streamMgr = useStream()
  const rtc = useRtcConnections()
  const ws = useWebsocket()

  const getSelf = (newState?: Room) => {
    if (_self) return _self
    const userId = auth.getUser()?.id
    if (userId && (newState || room)) _self = (newState ?? room)!.peers.find(p => p.id === userId) ?? null
    return _self
  }

  const getRoom = () => room

  const joinedRoom = (user: ActiveUser, peers: ActiveUser[]) => {
    console.log(`you joined these peers in ${user.room}:`)
    console.log(peers)
    const self: RoomPeer = {
      ...user,
      isOutputting: false,
      isMuted: false,
    }
    const roomPeers: RoomPeer[] = peers.map(u => ({ ...u, isOutputting: false, isMuted: false }))
    setRoom({ name: user.room, peers: [self, ...peers] })
  }

  const peerJoinedRoom = (user: ActiveUser) => {
    console.log(`peer ${user.name} joined the room`)
    setRoom(prev => {
      if (prev && !prev.peers.some(p => p.id === user.id)) {
        const updatePeers = [...prev.peers]
        updatePeers.push({ ...user, isOutputting: false })
        return { name: prev.name, peers: updatePeers }
      }
      return prev
    })
  }

  const peerLeftRoom = (user: ActiveUser) => {
    console.log(`peer ${user.name} left the room`)
    rtc.removeConnection(user.id)
    setRoom(prev => {
      if (prev) {
        const peerUpdate = [...prev.peers]
        return { name: prev.name, peers: peerUpdate.filter(p => p.id !== user.id) }
      }
      return prev
    })
  }

  const setInCall = (id: string, inCall: boolean) => {
    setRoom(prev => {
      if (prev) {
        const peerUpdate = [...prev.peers]
        const peer = peerUpdate.find(p => p.id === id)
        if (peer) {
          peer.inCall = inCall
          if (!inCall) peer.isOutputting = false
          return { name: prev.name, peers: peerUpdate } as Room
        }
      }
      return prev
    })
  }

  const setIsMuted = (id: string, mute: boolean) => {
    streamMgr.muteUnmute(id, mute)
    setRoom(prev => {
      if (prev) {
        const peerUpdate = [...prev.peers]
        const peer = peerUpdate.find(p => p.id === id)
        if (peer) {
          peer.isMuted = mute
          return { name: prev.name, peers: peerUpdate } as Room
        }
      }
      return prev
    })
  }

  const initConnection = (userId: string, iceCandidate: (id: string, candidate: RTCIceCandidate) => void) => {
    const peerConnection = rtc.addConnection(userId, iceCandidate)?.conn
    streamMgr.addStream(userId)
    return peerConnection
  }

  const peerJoiningCall = async (user: ActiveUser) => {
    console.log(`${user.name} is joining the call`)

    // if current user is in call too, then start up connection workflow
    if (getSelf()?.inCall) {
      const peerConnection = initConnection(user.id, ws.sendCandidate)

      if (peerConnection) {
        // send the new peer an offer to connect
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)
        ws.sendOffer(user.id, offer)
      }
    }

    // need to highlight that the peer is in call in UI
    setInCall(user.id, true)
  }

  const peerLeftCall = (user: ActiveUser) => {
    console.log(`peer ${user.name} left the call`)
    rtc.removeConnection(user.id)
    setInCall(user.id, false)
  }

  const receivedOffer = async (user: ActiveUser, offer: RTCSessionDescriptionInit) => {
    console.log(`offer received from ${user.id}`)
    const peerConnection = initConnection(user.id, rtc.addIceCandidate)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      ws.sendAnswer(user.id, answer)
    }
  }

  const receivedAnswer = async (user: ActiveUser, answer: RTCSessionDescriptionInit) => {
    console.log(`answer received from ${user.id}`)
    const peerConnection = rtc.getConnection(user.id)?.conn
    if (peerConnection) await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  const receivedCandidate = (id: string, candidate: RTCIceCandidate) => rtc.addIceCandidate(id, candidate)

  const joinCall = async () => {
    const settings = data.getUserData()?.settings
    console.log('you are joining the call')

    await streamMgr.streamMic(getSelf()!.id, settings)
    ws.joinCall(roomId)

    setInCall(getSelf()!.id, true)
  }

  const leaveCall = () => {
    const self = getSelf()
    if (self) {
      console.log('you are leaving the call')
      streamMgr.stopMic(self.id)
      rtc.destroy()
      ws.leaveCall(roomId)

      setInCall(getSelf()!.id, false)
    }
  }

  const userOutputUpdate = (id: string, output: boolean) => {
    setRoom(prev => {
      if (prev) {
        const peerUpdate = [...prev.peers]
        const peer = peerUpdate.find(p => p.id === id)
        if (peer) {
          if (output != peer.isOutputting) peer.isOutputting = output
          return { name: prev.name, peers: peerUpdate }
        }
      }
      return prev
    })
  }

  const getPeerById = (id: string) => {
    if (room) {
      const self = getSelf()
      if (self && self.id === id) return self
      else return room.peers.find(p => p.id === id) ?? null
    }
    return null
  }

  useEffect(() => {
    if (roomId) {
      const user = auth.getUser()
      if (user) {
        ws.subscribe(
          {
            onJoinedRoom: joinedRoom,
            onPeerJoinedRoom: peerJoinedRoom,
            onPeerLeftRoom: peerLeftRoom,
            onPeerJoiningCall: peerJoiningCall,
            onPeerLeftCall: peerLeftCall,
            onOffer: receivedOffer,
            onAnswer: receivedAnswer,
            onCandidate: receivedCandidate,
          },
          user.id,
          user.name,
          roomId
        )
      }
    }
    return () => {
      if (!roomId) {
        rtc.destroy()
        ws.disconnect()
      }
    }
  }, [roomId])

  return (
    <RoomContext.Provider
      value={{
        getSelf,
        getRoom,
        joinCall,
        leaveCall,
        joinedRoom,
        peerJoinedRoom,
        peerLeftRoom,
        userOutputUpdate,
        setIsMuted,
        getPeerById,
      }}
    >
      <RoomControl room={room} />
    </RoomContext.Provider>
  )
}
