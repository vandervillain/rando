import React from 'react'
import { useParams } from 'react-router-dom'
import { RoomManager } from '.'
import { SignalRProvider } from '../../providers/signalRProvider'
import { StreamProvider } from '../../providers/streamProvider'
import { UserSettingsProvider } from '../../providers/userSettingsProvider'

const RoomPage = () => {
  const { id } = useParams()
  return id ? (
    <SignalRProvider>
      <UserSettingsProvider>
        <StreamProvider>
          <RoomManager roomId={id} />
        </StreamProvider>
      </UserSettingsProvider>
    </SignalRProvider>
  ) : null
}

export default RoomPage
