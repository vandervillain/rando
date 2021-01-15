import React, { useEffect } from 'react'
import { useWebsocket } from '../contexts/socketManager'
import { useStream } from '../contexts/streamManager'
import PeerList from './peerList'

type RoomProps = {
  roomId: string
}

const Room = ({ roomId }: RoomProps) => {
  const streamMgr = useStream()
  const ws = useWebsocket()

  useEffect(() => {
    if (roomId && roomId != ws.room.name) ws.joinRoom(roomId as string)
  }, [roomId])

  return (
    <div className='room'>
      {roomId && (
        <>
          <h2>{roomId}</h2>
          <PeerList peers={[ws.room.self, ...ws.room.peers]} />
          {!ws.room.self.inCall && <button onClick={ws.makeCall}>Join</button>}
          {ws.room.self.inCall && (
            <div className='room-controls'>
              <button onClick={ws.leaveCall}>Leave</button>
              <button onClick={() => streamMgr.toggleStream(ws.room.self.id)}>Mute</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Room
