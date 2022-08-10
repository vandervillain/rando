import * as signalR from '@microsoft/signalr'
import React, { FunctionComponent, useEffect, useState } from 'react'
import { Room, RoomPeer, User } from '../data/types'
import { useSessionContext } from './sessionProvider'

type SignalRContext = {
  isConnected: () => boolean
  connect: (user: User) => Promise<void>
  setUserProfile: (userName: string, avatar?: string, sound?: string) => Promise<void>
  createRoom: (roomName: string) => Promise<any>
  subscribeTo: (channel: SignalRChannels, callback: (...args: any[]) => any) => void
  unsubscribeFrom: (channel: SignalRChannels, callback: (...args: any[]) => any) => void
  // room
  joinRoom: (roomId: string) => void
  joinCall: () => void
  leaveCall: () => void
  // rtc
  sendOffer: (peerId: string, offer: RTCSessionDescriptionInit) => Promise<void>
  sendAnswer: (peerId: string, offer: RTCSessionDescriptionInit) => Promise<void>
  sendCandidate: (peerId: string, candidate: RTCIceCandidate) => Promise<void>
}

export type RoomEventHandlers = {
  onJoinedRoom: (user: RoomPeer, room: Room, peers: RoomPeer[]) => void
  onJoinRoomFailure: () => void
  onPeerJoinedRoom: (peer: RoomPeer) => void
  onPeerJoiningCall: (peer: RoomPeer) => Promise<void>
  onPeerLeftRoom: (peer: RoomPeer) => void
  onPeerLeftCall: (peer: RoomPeer) => void
  onPeerChangedName: (peer: RoomPeer) => void
}

const Context = React.createContext<SignalRContext | undefined>(undefined)

export const useSignalRContext = (): SignalRContext => {
  const context = React.useContext(Context)
  if (context === undefined)
    throw new Error('useSignalRContext must be used within a SignalRContext')

  return context
}

const url = process.env.SIGNALR_SERVER_URL!

let connection: signalR.HubConnection

export type SignalRChannels =
  | 'joinedRoom'
  | 'joinRoomFailed'
  | 'initialPeers'
  | 'peerJoiningCall'
  | 'offer'
  | 'answer'
  | 'candidate'
  | 'peerJoinedRoom'
  | 'peerLeftRoom'
  | 'peerLeftCall'
  | 'peerChangedName'

export const SignalRProvider: FunctionComponent = ({ children }) => {
  console.debug('<SignalRProvider />')
  const { user } = useSessionContext()
  const [initialized, setInitialized] = useState<boolean>(false)

  const isConnected = () => connection && connection.state === signalR.HubConnectionState.Connected

  const connect = async (user: User) => {
    console.log(`user ${user.id} is connecting to signalr`)
    try {
      let conn = new signalR.HubConnectionBuilder()
        .withAutomaticReconnect()
        .withUrl(url, {
          headers: {
            'x-ms-signalr-user-id': user.id,
          },
        })
        .build()

      conn.onclose(() => {
        console.log('signalr connection closed')
      })

      conn.onreconnecting(() => {
        console.log('signalr reconnecting')
      })

      conn.onreconnected(() => {
        console.log('signalr reconnected')
      })

      await conn.start()
      console.info('signalr connection started at ' + url)

      console.log(`setUserProfile to ${user.name} ${user.avatar} ${user.sound}`)
      conn.send('setUserProfile', user.name, user.avatar ?? null, user.sound ?? null)

      connection = conn
      setInitialized(true)
    } catch (e) {
      console.error(`websocket connection failed to start at ${url}`)
    }
  }

  const createRoom = async (roomName: string) => {
    if (!isConnected) return
    console.log(`createRoom(${roomName})`)
    return await connection.invoke('createRoom', roomName)
  }

  // SUBSCRIPTIONS

  const subscribeTo = (sub: SignalRChannels, callback: (...args: any[]) => any) => {
    if (!isConnected()) {
      console.warn(`tried to subscribe to ${sub} while signalr is not connected`)
      return
    }
    console.debug(`subscribeTo ${sub}`)
    connection.on(sub, callback)
  }

  const unsubscribeFrom = (sub: SignalRChannels, callback: (...args: any[]) => any) => {
    if (!isConnected()) {
      console.warn(`tried to unsubscribe from ${sub} while signalr is not connected`)
      return
    }
    console.debug(`unsubscribeFrom ${sub}`)
    connection.off(sub, callback)
  }

  // ROOM EVENTS

  const setUserProfile = async (userName: string, avatar?: string, sound?: string) => {
    if (!isConnected()) return
    console.log(`setUserProfile to ${userName} ${avatar} ${sound}`)
    await connection.send('setUserProfile', userName, avatar, sound)
  }

  const joinRoom = async (roomId: string) => {
    if (!isConnected()) return
    console.log(`joining room ${roomId}`)
    await connection.invoke('joinRoom', roomId)
  }

  const joinCall = async () => {
    if (!isConnected()) return
    console.log(`joining call`)
    await connection.invoke('joinCall')
  }

  const leaveCall = async () => {
    if (!isConnected()) return
    console.log(`leaving call`)
    await connection.invoke('leaveCall')
  }

  const sendOffer = async (peerId: string, offer: RTCSessionDescriptionInit) => {
    if (!isConnected()) return
    console.log(`sending offer to ${peerId}`)
    await connection.send('offer', peerId, offer)
  }

  const sendAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
    if (!isConnected()) return
    console.log(`sending answer to ${peerId}`)
    await connection.send('answer', peerId, answer)
  }

  const sendCandidate = async (peerId: string, candidate: RTCIceCandidate) => {
    if (!isConnected()) return
    console.debug(`sending candidate to ${peerId}`)
    await connection.send('candidate', peerId, candidate)
  }

  useEffect(() => {
    if (user) connect(user)
  }, [user])

  useEffect(() => {
    console.debug('signalRManager mount')

    return () => {
      console.debug('signalRManager unmount')
    }
  })

  return (
    <Context.Provider
      value={{
        isConnected,
        connect,
        setUserProfile,
        createRoom,
        subscribeTo,
        unsubscribeFrom,
        sendOffer,
        sendAnswer,
        sendCandidate,
        joinRoom,
        joinCall,
        leaveCall,
      }}
    >
      {isConnected() ? children : <div>connecting...</div>}
    </Context.Provider>
  )
}