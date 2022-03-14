import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import RoomControl from '../components/roomControl'
import { useRtcConnections } from './rtcConnectionManager'
import { useStreamContext } from './streamManager'
import { Room, RoomPeer } from '../data/types'
import { useRouter } from 'next/router'
import { useSignalRContext } from './signalRManager'
import { useSessionContext } from './sessionManager'

type RoomManagerContext = {
  room: Room | null
  currUserPeer: RoomPeer | null
  joinRoomCall: () => void
  leaveRoomCall: () => void
}

const Context = React.createContext<RoomManagerContext | undefined>(undefined)

export const useRoomContext = (): RoomManagerContext => {
  const context = React.useContext(Context)
  if (context === undefined)
    throw new Error('useRoomContext must be used within a RoomManagerContext')

  return context
}

type RoomManagerProps = {
  roomId: string
}

export const RoomProvider: FunctionComponent<RoomManagerProps> = ({ roomId }) => {
  const router = useRouter()
  const { user } = useSessionContext()
  const signalR = useSignalRContext()
  const { streamMic, removeStream } = useStreamContext()
  const { getConnection, addConnection, removeConnection, addIceCandidate, destroy } =
    useRtcConnections()
  const [room, setRoom] = useState<Room | null>(null)

  const currUserPeer = useMemo(() => {
    console.debug('memoizing currUserPeer')
    console.debug(`user ${user?.name}`)
    console.debug(`room ${room?.name}`)
    const currPeer = (user && room ? room.peers.find(p => p.id === user.id) : null) ?? null
    console.debug(`currPeer ${currPeer?.name}`)
    return currPeer
  }, [user, room])

  const onJoinedRoom = (user: RoomPeer, room: Room, peers: RoomPeer[]) => {
    console.log(`you joined these peers in room ${user.roomId}: ${peers.map(p => p.id).join(',')}`)
    let order = 0
    user.order = order++
    peers.forEach(p => {
      p.order = order++
    })
    setRoom({ ...room, peers: [user, ...peers] })
  }

  const onJoinRoomFailure = () => {
    console.log('room does not exist')
    router.push('/')
  }

  const onPeerJoinedRoom = useCallback(
    (peer: RoomPeer) => {
      console.log(`peer ${peer.name} joined the room`)
      if (room) {
        console.log('room.peers:')
        console.log(room.peers)
        if (!room.peers.some(p => p.id === peer.id)) {
          const orderedPeers = [...room.peers].sort(p => p.order)
          peer.order = orderedPeers[orderedPeers.length - 1].order + 1
          const peerUpdate = [...orderedPeers, peer]
          setRoom({ ...room, peers: peerUpdate })
        }
      }
    },
    [room]
  )

  const onPeerLeftRoom = useCallback(
    (peer: RoomPeer) => {
      console.log(`peer ${peer.name} left the room`)
      removeConnection(peer.id)
      if (room) {
        const peerUpdate = [...room.peers].filter(p => p.id !== peer.id)
        setRoom({ ...room, peers: peerUpdate })
      }
    },
    [room]
  )

  const setInCall = useCallback(
    (id: string, inCall: boolean) => {
      console.debug(`setInCall user ${id} = ${inCall}`)
      if (room) {
        const peer = room.peers.find(p => p.id === id)
        if (peer) {
          const update: RoomPeer = { ...peer, inCall: inCall }
          const peersUpdate = [update, ...room.peers.filter(p => p.id !== id)]
          setRoom({ ...room, peers: peersUpdate })
        }
      }
    },
    [room]
  )

  const initConnection = useCallback(
    (peer: RoomPeer) => {
      const peerConnection = addConnection(peer.id, sendIceCandidate)?.conn
      return peerConnection
    },
    [addConnection]
  )

  const onPeerJoiningCall = useCallback(
    async (peer: RoomPeer) => {
      console.log(`${peer.name} is joining the call`)
      console.log(currUserPeer)
      // if current user is in call too, then start up connection workflow
      if (currUserPeer?.inCall) {
        console.log(`init connection`)
        const peerConnection = initConnection(peer)

        if (peerConnection) {
          // send the new peer an offer to connect
          console.log(`create offer`)
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)
          signalR.sendOffer(peer.id, offer)
        }
      }

      // need to highlight that the peer is in call in UI
      setInCall(peer.id, true)
    },
    [user, room, initConnection, signalR]
  )

  const onPeerLeftCall = useCallback(
    (peer: RoomPeer) => {
      console.log(`peer ${peer.name} left the call`)
      removeConnection(peer.id)
      setInCall(peer.id, false)
    },
    [room, removeConnection, setInCall]
  )

  const onPeerChangedName = useCallback(
    (peer: RoomPeer) => {
      if (room) {
        const roomPeer = room.peers.find(p => p.id === peer.id)
        if (roomPeer) {
          const update: RoomPeer = { ...roomPeer, name: peer.name }
          const peersUpdate = [update, ...room.peers.filter(p => p.id !== peer.id)]
          setRoom({ ...room, peers: peersUpdate })
        }
      }
    },
    [room]
  )

  const onOffer = useCallback(
    async (peer: RoomPeer, offer: RTCSessionDescriptionInit) => {
      console.log(`offer received from ${peer.id}`)
      const peerConnection = initConnection(peer)
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)
        signalR.sendAnswer(peer.id, answer)
      }
    },
    [room, signalR, initConnection]
  )

  const onAnswer = useCallback(
    async (peer: RoomPeer, answer: RTCSessionDescriptionInit) => {
      console.log(`answer received from ${peer.id}`)
      const peerConnection = getConnection(peer.id)?.conn
      if (peerConnection)
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    },
    [getConnection]
  )

  const sendIceCandidate = useCallback(
    (id: string, c: RTCIceCandidate) => {
      signalR.sendCandidate(id, c)
    },
    [signalR]
  )

  const onCandidate = useCallback(
    (id: string, candidate: RTCIceCandidate) => {
      console.log(`received candidate from ${id}`)
      addIceCandidate(id, candidate)
    },
    [addIceCandidate]
  )

  const joinRoomCall = useCallback(async () => {
    if (user && room) {
      console.log('you are joining the call')
      await streamMic(user.id)
      await signalR.joinCall()
      setInCall(user.id, true)
    }
  }, [user, room, signalR])

  const leaveRoomCall = useCallback(() => {
    if (user && room) {
      console.log('you are leaving the call')
      destroy()
      removeStream(user.id)
      signalR.leaveCall()
      setInCall(user.id, false)
    }
  }, [user, room, destroy, removeStream, signalR])

  const bindRoomEvents = () => {
    signalR.unbindRoomEvents()
    signalR.bindRoomEvents({
      onJoinedRoom,
      onJoinRoomFailure,
      onPeerJoinedRoom,
      onPeerJoiningCall,
      onPeerLeftRoom,
      onPeerLeftCall,
      onPeerChangedName,
      onOffer,
      onAnswer,
      onCandidate,
    })
  }

  useEffect(() => {
    console.debug('bind room events')
    if (signalR.isConnected()) bindRoomEvents()

    return () => {
      console.debug('unbind room events')
      signalR.unbindRoomEvents()
    }
  }, [
    signalR,
    onJoinedRoom,
    onJoinRoomFailure,
    onPeerJoinedRoom,
    onPeerJoiningCall,
    onPeerLeftRoom,
    onPeerLeftCall,
    onPeerChangedName,
    onOffer,
    onAnswer,
    onCandidate,
  ])

  useEffect(() => {
    if (roomId && !room && signalR?.isConnected() && !currUserPeer) {
      console.log('you are attempting to join room ' + roomId)
      signalR.joinRoom(roomId)
    }
    return () => {
      if (!roomId) {
        destroy()
      }
    }
  }, [roomId, room, signalR, currUserPeer])

  const roomContext = useMemo(() => {
    console.debug('memoizing room')
    return {
      room,
      currUserPeer,
      joinRoomCall,
      leaveRoomCall,
    }
  }, [room, joinRoomCall, leaveRoomCall])

  return signalR.isConnected() ? (
    <Context.Provider value={roomContext}>
      <RoomControl />
    </Context.Provider>
  ) : null
}
