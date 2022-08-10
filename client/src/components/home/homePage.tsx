import React from 'react'
import CreateRoom from './createRoom'
import { SignalRProvider } from '../../providers/signalRProvider'
import './home.css'

export default function HomePage() {  
  return (
    <SignalRProvider>
      <CreateRoom />
    </SignalRProvider>
  )
}
