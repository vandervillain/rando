import React from 'react'
import CreateRoom from './createRoom'
import { SignalRProvider } from '../../providers/signalRProvider'

export default function HomePage() {  
  return (
    <SignalRProvider>
      <CreateRoom />
    </SignalRProvider>
  )
}
