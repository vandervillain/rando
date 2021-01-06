import React, { FunctionComponent, useEffect } from 'react'
import { useRtcConnections } from '../contexts/rtcConnectionManager'

type RoomProps = {
  name: string | null
  inCall: boolean
  makeCall: () => void
  leaveCall: () => void
}

const Room: FunctionComponent<RoomProps> = ({ name, inCall, makeCall, leaveCall, children }) => {
  const rtc = useRtcConnections()

  return (
    <div className='room'>
      {name && (
        <>
          {children}
          {!inCall && <button onClick={makeCall}>Join</button>}
          {inCall && (
            <div className='room-controls'>
          <button onClick={leaveCall}>Leave</button>
          <button onClick={rtc.toggleMuteMic}>Mute</button>
          </div>
          )}
        </>
      )}
    </div>
  )
}

export default Room
