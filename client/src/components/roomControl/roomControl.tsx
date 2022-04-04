import React from 'react'
import { useRoomContext } from '../../contexts/roomManager'
import CallControl from './callControl'
import PeerList from '../peerList'

const RoomControl = () => {
  const {room, joinRoomCall, leaveRoomCall } = useRoomContext()

  console.debug('<RoomControl />')
  console.debug(room)
  return (
    <div className='room'>
      {room && (
        <>
          <h2>{room.name}</h2>
          <PeerList />
          <CallControl
            joinCall={joinRoomCall}
            leaveCall={leaveRoomCall}
          />
        </>
      )}
    </div>
  )
}

export default RoomControl
