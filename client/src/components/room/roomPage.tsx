import React from 'react'
import { useParams } from 'react-router-dom'
import { RoomProvider } from '../../providers/roomProvider'
import { SignalRProvider } from '../../providers/signalRProvider'
import { StreamProvider } from '../../providers/streamProvider'
import { UserSettingsProvider } from '../../providers/userSettingsProvider'
import './room.css'

const RoomPage = () => {
  const { id } = useParams()
  return id ? (
    <SignalRProvider>
      <UserSettingsProvider>
        <StreamProvider>
          <RoomProvider joinRoomId={id} />
        </StreamProvider>
      </UserSettingsProvider>
    </SignalRProvider>
  ) : null
}

export default RoomPage
