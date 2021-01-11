import React, { useEffect } from 'react'
import { useRtcConnections } from '../contexts/rtcConnectionManager'
import { useWebsocket } from '../contexts/socketManager'
import PeerList from './peerList'

type RoomProps = {
  roomId: string
}

const Room = ({ roomId }: RoomProps) => {
  const ws = useWebsocket()
  const rtc = useRtcConnections()

  useEffect(() => {
    if (roomId && roomId != ws.room.name) ws.joinRoom(roomId as string)
  }, [roomId])

  return (
    <div className='room'>
      {roomId && (
        <>
          <h2>{roomId}</h2>
          <PeerList peers={ws.room.peers} toggleMute={rtc.toggleMutePeer} />
          {!ws.room.self.inCall && <button onClick={ws.makeCall}>Join</button>}
          {ws.room.self.inCall && (
            <div className='room-controls'>
              <button onClick={ws.leaveCall}>Leave</button>
              <button onClick={rtc.toggleMuteMic}>Mute</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Room
