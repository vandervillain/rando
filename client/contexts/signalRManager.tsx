import * as signalR from '@microsoft/signalr'
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import { Room, RoomPeer, User } from '../data/types'
import { useSessionContext } from './sessionManager'

type SignalRContext = {
  isConnected: () => boolean
  connect: (user: User) => Promise<void>
  setUserName: (userName: string) => Promise<void>
  createRoom: (roomName: string) => Promise<any>
  bindRoomEvents: (e: IRoomEventHandlers) => void
  unbindRoomEvents: () => void
  sendOffer: (peerId: string, offer: RTCSessionDescriptionInit) => Promise<void>
  sendAnswer: (peerId: string, offer: RTCSessionDescriptionInit) => Promise<void>
  sendCandidate: (peerId: string, candidate: RTCIceCandidate) => Promise<void>
  joinRoom: (roomId: string) => void
  joinCall: () => void
  leaveCall: () => void
}

export interface IRoomEventHandlers {
  onJoinedRoom: (user: RoomPeer, room: Room, peers: RoomPeer[]) => void
  onJoinRoomFailure: () => void
  onPeerJoinedRoom: (peer: RoomPeer) => void
  onPeerJoiningCall: (peer: RoomPeer) => Promise<void>
  onPeerLeftRoom: (peer: RoomPeer) => void
  onPeerLeftCall: (peer: RoomPeer) => void
  onPeerChangedName: (peer: RoomPeer) => void
  onOffer: (peer: RoomPeer, offer: RTCSessionDescriptionInit) => Promise<void>
  onAnswer: (peer: RoomPeer, answer: RTCSessionDescriptionInit) => Promise<void>
  onCandidate: (id: string, candidate: RTCIceCandidate) => void
}

const Context = React.createContext<SignalRContext | undefined>(undefined)

export const useSignalRContext = (): SignalRContext => {
  const context = React.useContext(Context)
  if (context === undefined)
    throw new Error('useSignalRContext must be used within a SignalRContext')

  return context
}

const url = process.env.NEXT_PUBLIC_SERVER

let connection: signalR.HubConnection

export const SignalRProvider: FunctionComponent = ({ children }) => {
  const [connected, setConnected] = useState(!!connection)

  const isConnected = useCallback(() => connected, [connected])

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
        setConnected(false)
      })

      conn.onreconnecting(() => {
        console.log('signalr reconnecting')
      })

      conn.onreconnected(() => {
        console.log('signalr reconnected')
        setConnected(true)
      })

      await conn.start()

      setConnected(true)
      console.info('signalr connection started at ' + url)
      console.log(`set username to ${user.name}`)
      conn.send('setUserName', user.name)

      connection = conn
    } catch (e) {
      console.error(`websocket connection failed to start at ${url}`)
      setConnected(false)
    }
  }

  const createRoom = useCallback(
    async (roomName: string) => {
      if (!connection || !connected) return
      console.log(`createRoom(${roomName})`)
      return await connection.invoke('createRoom', roomName)
    },
    [connection, connected]
  )

  const unbindRoomEvents = useCallback(() => {
    if (!connection) return

    connection.off('joinedRoom')
    connection.off('joinRoomFailed')
    connection.off('peerJoiningCall')
    connection.off('offer')
    connection.off('answer')
    connection.off('candidate')
    connection.off('peerJoinedRoom')
    connection.off('peerLeftRoom')
    connection.off('peerLeftCall')
    connection.off('peerChangedName')
  }, [connection])

  const bindRoomEvents = useCallback(
    (e: IRoomEventHandlers) => {
      if (!connection) return
      unbindRoomEvents()

      connection.on('joinedRoom', e.onJoinedRoom)
      connection.on('joinRoomFailed', e.onJoinRoomFailure)
      connection.on('peerJoiningCall', e.onPeerJoiningCall)
      connection.on('offer', e.onOffer)
      connection.on('answer', e.onAnswer)
      connection.on('candidate', e.onCandidate)
      connection.on('peerJoinedRoom', e.onPeerJoinedRoom)
      connection.on('peerLeftRoom', e.onPeerLeftRoom)
      connection.on('peerLeftCall', e.onPeerLeftCall)
      connection.on('peerChangedName', e.onPeerChangedName)
    },
    [connection]
  )

  const setUserName = useCallback(
    async (userName: string) => {
      if (!connection || !connected) return
      console.log(`set username to ${userName}`)
      await connection.send('setUserName', userName)
    },
    [connection, connected]
  )

  const sendOffer = useCallback(
    async (peerId: string, offer: RTCSessionDescriptionInit) => {
      if (!connection || !connected) return
      console.log(`sending offer to ${peerId}`)
      await connection.send('offer', peerId, offer)
    },
    [connection, connected]
  )

  const sendAnswer = useCallback(
    async (peerId: string, answer: RTCSessionDescriptionInit) => {
      if (!connection || !connected) return
      console.log(`sending answer to ${peerId}`)
      await connection.send('answer', peerId, answer)
    },
    [connection, connected]
  )

  const sendCandidate = useCallback(
    async (peerId: string, candidate: RTCIceCandidate) => {
      if (!connection || !connected) return
      console.debug(`sending candidate to ${peerId}`)
      await connection.send('candidate', peerId, candidate)
    },
    [connection, connected]
  )

  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!connection || !connected) return
      console.log(`joining room ${roomId}`)
      await connection.invoke('joinRoom', roomId)
    },
    [connection, connected]
  )

  const joinCall = useCallback(async () => {
    if (!connection || !connected) return
    console.log(`joining call`)
    await connection.invoke('joinCall')
  }, [connection, connected])

  const leaveCall = useCallback(async () => {
    if (!connection || !connected) return
    console.log(`leaving call`)
    await connection.invoke('leaveCall')
  }, [connection, connected])

  const signalRContext = useMemo(
    (): SignalRContext => ({
      isConnected,
      connect,
      setUserName,
      createRoom,
      bindRoomEvents,
      unbindRoomEvents,
      sendOffer,
      sendAnswer,
      sendCandidate,
      joinRoom,
      joinCall,
      leaveCall,
    }),
    [
      isConnected,
      connect,
      setUserName,
      createRoom,
      bindRoomEvents,
      unbindRoomEvents,
      sendOffer,
      sendAnswer,
      sendCandidate,
      joinRoom,
      joinCall,
      leaveCall,
    ]
  )

  console.debug('<SignalRManager />')
  return <Context.Provider value={signalRContext}>{children}</Context.Provider>
}
