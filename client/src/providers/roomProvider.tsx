import React, { FunctionComponent, useEffect, useMemo, useState } from 'react'
import { RoomControl } from '../components/room'
import { useStreamContext } from './streamProvider'
import { Room, RoomPeer } from '../data/types'
import { useSignalRContext } from './signalRProvider'
import { useSessionContext } from './sessionProvider'
import useAudio from '../hooks/useAudio'
import { SoundType } from '../assets/sounds'
import { useSettingsContext } from './userSettingsProvider'
import { useNavigate } from 'react-router-dom'

type RoomContext = {
  room: Room
  currUserPeer: RoomPeer | undefined
}

const Context = React.createContext<RoomContext | undefined>(undefined)

export const useRoomContext = (): RoomContext => {
  const context = React.useContext(Context)
  if (context === undefined)
    throw new Error('useRoomContext must be used within a RoomManagerContext')

  return context
}

type RoomProviderProps = {
  joinRoomId: string
}

export const RoomProvider: FunctionComponent<RoomProviderProps> = ({ joinRoomId }) => {
  console.debug(`<RoomProvider />`)
  const [room, setRoom] = useState<Room | null>(null)
  const navigate = useNavigate()
  const { user } = useSessionContext()
  const signalR = useSignalRContext()
  const { getUserSettings } = useSettingsContext()
  const { streamMic, requestStream, removeStream, destroyStreams } = useStreamContext()
  const audio = useAudio(getUserSettings)

  const onPeerJoinedRoom = (peer: RoomPeer, room: Room) => {
    console.log(`${peer.name} joined the room`)
    setRoom(room)
  }

  const onPeerLeftRoom = async (peer: RoomPeer, room: Room) => {
    console.log(`${peer.name} left the room`)
    await removeStream(peer.id)
    setRoom(room)
  }

  const onPeerJoiningCall = async (peer: RoomPeer, room: Room) => {
    console.log(`${peer.name} is joining the call`)
    // if current user is in call too, then start up connection workflow
    const thisUser = room.users.find(p => p.id === user!.id)
    if (thisUser?.inCall) {
      if (peer.id !== thisUser.id) await requestStream(peer.id)
      audio.playOn(peer.id, peer.sound as SoundType)
    }
    setRoom(room)
  }

  const onPeerLeftCall = (peer: RoomPeer, room: Room) => {
    console.log(`${peer.name} left the call`)
    removeStream(peer.id)
    const thisUser = room.users.find(p => p.id === user!.id)
    if (thisUser?.inCall) audio.playOff(peer.id)

    setRoom(room)
  }

  const onPeerChangedProfile = (peer: RoomPeer, room: Room) => {
    console.log(`${peer.name} has updated their profile`)
    setRoom(room)
  }

  const joinRoomCall = async () => {
    const thisUser = room?.users.find(p => p.id === user!.id)
    if (!thisUser) return
    console.log('you are joining the call')
    await streamMic(thisUser.id)
    await signalR.joinCall()
  }

  const leaveRoomCall = async () => {
    const thisUser = room?.users.find(p => p.id === user!.id)
    if (!thisUser) return
    console.log('you are leaving the call')
    destroyStreams()
    await signalR.leaveCall()
  }

  useEffect(() => {
    if (!room) return
    console.debug('bind room events')
    signalR.subscribeTo('peerJoiningCall', onPeerJoiningCall)
    signalR.subscribeTo('peerJoinedRoom', onPeerJoinedRoom)
    signalR.subscribeTo('peerLeftRoom', onPeerLeftRoom)
    signalR.subscribeTo('peerLeftCall', onPeerLeftCall)
    signalR.subscribeTo('peerChangedName', onPeerChangedProfile)

    return () => {
      console.warn('unbind room events')
      signalR.unsubscribeFrom('peerJoiningCall', onPeerJoiningCall)
      signalR.unsubscribeFrom('peerJoinedRoom', onPeerJoinedRoom)
      signalR.unsubscribeFrom('peerLeftRoom', onPeerLeftRoom)
      signalR.unsubscribeFrom('peerLeftCall', onPeerLeftCall)
      signalR.unsubscribeFrom('peerChangedName', onPeerChangedProfile)
    }
  }, [room])

  useEffect(() => {
    if (joinRoomId && room?.id !== joinRoomId) {
      console.log('you are attempting to join room ' + joinRoomId)
      signalR.joinRoom(joinRoomId).then(roomInfo => {
        console.log('received room info:')
        console.log(roomInfo)
        if (!roomInfo) {
          navigate('/404')
          return
        }
        setRoom(roomInfo)
      })
    }
  }, [])

  const currUserPeer = useMemo(() => room?.users.find(p => p.id === user!.id), [room])

  return room ? (
    <Context.Provider
      value={{
        room,
        currUserPeer,
      }}
    >
      <RoomControl joinCall={joinRoomCall} leaveCall={leaveRoomCall} />
    </Context.Provider>
  ) : (
    <div>joining room...</div>
  )
}
