import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomProvider } from '../../providers/roomProvider'
import { useSignalRContext } from '../../providers/signalRProvider'
import { Room } from '../../data/types'

type RoomManagerProps = {
  roomId: string
}

const RoomManager = ({ roomId }: RoomManagerProps) => {
  const navigate = useNavigate()
  const signalR = useSignalRContext()
  const [room, setRoom] = useState<Room>()

  const onJoinedRoom = useCallback((room: Room) => {
    console.log(`you joined room ${room.id}`)
    setRoom(room)
  }, [])

  useEffect(() => {
    signalR.subscribeTo('joinedRoom', onJoinedRoom)
    return () => {
      signalR.unsubscribeFrom('joinedRoom', onJoinedRoom)
    }
  }, [roomId])

  useEffect(() => {
    if (room?.id !== roomId) {
      console.log('you are attempting to join room ' + roomId)
      signalR.joinRoom(roomId).then(success => {
        if (!success) navigate('/404')
      })
    }
  }, [room])

  return room ? <RoomProvider room={room} /> : <div>joining room...</div>
}
export default RoomManager