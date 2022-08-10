import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import { RoomControl } from '../components/room'
import { useStreamContext } from './streamProvider'
import { Room, RoomPeer } from '../data/types'
import { useSignalRContext } from './signalRProvider'
import { useSessionContext } from './sessionProvider'
import useAudio from '../hooks/useAudio'
import { SoundType } from '../assets/sounds'

type RoomContext = {
  room: Room
  peers: RoomPeer[]
  currUserPeer: RoomPeer | null
}

const Context = React.createContext<RoomContext | undefined>(undefined)

export const useRoomContext = (): RoomContext => {
  const context = React.useContext(Context)
  if (context === undefined)
    throw new Error('useRoomContext must be used within a RoomManagerContext')

  return context
}

type RoomContextProps = {
  room: Room
}

export const RoomProvider: FunctionComponent<RoomContextProps> = ({ room }: RoomContextProps) => {
  console.debug(`<RoomProvider room=${room.id},${room.name} />`)
  const { user } = useSessionContext()
  const signalR = useSignalRContext()
  const { streamMic, requestStream, removeStream, destroyStreams } = useStreamContext()
  const [peers, setPeers] = useState<RoomPeer[]>([])
  const audio = useAudio(peers)

  const currUserPeer = useMemo(
    () => (peers ? peers.find(p => p.id === user!.id) ?? null : null),
    [peers]
  )

  const onInitialPeers = useCallback(
    (user: RoomPeer, peers: RoomPeer[]) => {
      console.log(`you joined these peers: ${peers.map(p => p.id).join(',')}`)
      let order = 0
      user.order = order++
      peers.forEach(p => {
        p.order = order++
      })
      setPeers([user, ...peers])
    },
    [peers]
  )

  const onPeerJoinedRoom = useCallback(
    (peer: RoomPeer) => {
      console.log(`peer ${peer.name} joined the room`)
      if (!peers.some(p => p.id === peer.id)) {
        const orderedPeers = [...peers].sort(p => p.order)
        peer.order = orderedPeers[orderedPeers.length - 1].order + 1
        const peerUpdate = [...orderedPeers, peer]
        setPeers(peerUpdate)
      }
    },
    [peers]
  )

  const onPeerLeftRoom = useCallback(
    async (peer: RoomPeer) => {
      console.log(`peer ${peer.name} left the room`)
      await removeStream(peer.id)
      const peerUpdate = [...peers].filter(p => p.id !== peer.id)
      setPeers(peerUpdate)
    },
    [peers]
  )

  const setInCall = useCallback(
    (id: string, inCall: boolean) => {
      console.debug(`setInCall user ${id} = ${inCall}`)
      const peer = peers.find(p => p.id === id)
      if (peer) {
        const update: RoomPeer = { ...peer, inCall: inCall }
        const peersUpdate = [update, ...peers.filter(p => p.id !== id)]
        setPeers(peersUpdate)
      }
    },
    [peers]
  )

  const onPeerJoiningCall = useCallback(
    async (peer: RoomPeer) => {
      console.log(`${peer.name} is joining the call`)
      // if current user is in call too, then start up connection workflow
      if (currUserPeer?.inCall) {
        await requestStream(peer.id)
        peer.sound ? audio.playCustom(peer.id, peer.sound as SoundType) : audio.playOn(peer.id)
      }
      // need to highlight that the peer is in call in UI
      setInCall(peer.id, true)
    },
    [peers]
  )

  const onPeerLeftCall = useCallback(
    (peer: RoomPeer) => {
      console.log(`peer ${peer.name} left the call`)
      removeStream(peer.id)

      if (currUserPeer?.inCall) audio.playOff(peer.id)

      setInCall(peer.id, false)
    },
    [peers]
  )

  const onPeerChangedName = useCallback(
    (peer: RoomPeer) => {
      const roomPeer = peers.find(p => p.id === peer.id)
      if (roomPeer) {
        const update: RoomPeer = { ...roomPeer, name: peer.name }
        const peersUpdate = [update, ...peers.filter(p => p.id !== peer.id)]
        setPeers(peersUpdate)
      }
    },
    [peers]
  )

  const joinRoomCall = useCallback(async () => {
    if (currUserPeer) {
      console.log('you are joining the call')
      await streamMic(currUserPeer.id)
      await signalR.joinCall()

      currUserPeer.sound ? audio.playCustom(currUserPeer.id, currUserPeer.sound as SoundType) : audio.playOn(currUserPeer.id)

      setInCall(currUserPeer.id, true)
    }
  }, [peers])

  const leaveRoomCall = useCallback(() => {
    if (currUserPeer) {
      console.log('you are leaving the call')
      audio.playOff(currUserPeer.id)
      destroyStreams()
      signalR.leaveCall()
      setInCall(currUserPeer.id, false)
    }
  }, [peers])

  // BINDING ROOM EVENTS

  const bindRoomEvents = () => {
    signalR.subscribeTo('initialPeers', onInitialPeers)
    signalR.subscribeTo('peerJoiningCall', onPeerJoiningCall)
    signalR.subscribeTo('peerJoinedRoom', onPeerJoinedRoom)
    signalR.subscribeTo('peerLeftRoom', onPeerLeftRoom)
    signalR.subscribeTo('peerLeftCall', onPeerLeftCall)
    signalR.subscribeTo('peerChangedName', onPeerChangedName)
  }

  const unbindRoomEvents = () => {
    signalR.unsubscribeFrom('initialPeers', onInitialPeers)
    signalR.unsubscribeFrom('peerJoiningCall', onPeerJoiningCall)
    signalR.unsubscribeFrom('peerJoinedRoom', onPeerJoinedRoom)
    signalR.unsubscribeFrom('peerLeftRoom', onPeerLeftRoom)
    signalR.unsubscribeFrom('peerLeftCall', onPeerLeftCall)
    signalR.unsubscribeFrom('peerChangedName', onPeerChangedName)
  }

  useEffect(() => {
    console.debug('bind room events')
    bindRoomEvents()

    return () => {
      console.debug('unbind room events')
      unbindRoomEvents()
    }
  }, [peers])

  return signalR.isConnected() ? (
    <Context.Provider
      value={{
        room,
        peers,
        currUserPeer,
      }}
    >
      <RoomControl joinCall={joinRoomCall} leaveCall={leaveRoomCall} />
    </Context.Provider>
  ) : null
}
