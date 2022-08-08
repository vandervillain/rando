import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomContextProvider } from '../contexts/roomContext'
import { useSignalRContext } from '../contexts/signalRManager'
import { Room } from '../data/types'

type RoomManagerProps = {
  roomId: string
}

export const RoomManager = ({ roomId }: RoomManagerProps) => {
  const navigate = useNavigate()
  const signalR = useSignalRContext()
  const [room, setRoom] = useState<Room>()

  const onJoinedRoom = useCallback((room: Room) => {
    console.log(`you joined room ${room.id}`)
    setRoom(room)
  }, [])

  const onJoinRoomFailure = useCallback(() => {
    console.log('room does not exist')
    navigate('/404')
  }, [])

  useEffect(() => {
    signalR.subscribeTo('joinedRoom', onJoinedRoom)
    signalR.subscribeTo('joinRoomFailed', onJoinRoomFailure)
    return () => {
      signalR.unsubscribeFrom('joinedRoom', onJoinedRoom)
      signalR.unsubscribeFrom('joinRoomFailed', onJoinRoomFailure)
    }
  }, [roomId])

  useEffect(() => {
    if (room?.id !== roomId) {
      console.log('you are attempting to join room ' + roomId)
      signalR.joinRoom(roomId)
    }
  }, [room])

  return room ? <RoomContextProvider room={room} /> : <div>joining room...</div>
}
