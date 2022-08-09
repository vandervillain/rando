import React from 'react'
import CallControl from './callControl'
import PeerList from './peerList'
import { useRoomContext } from '../../providers/roomProvider'

type RoomControlProps = {
  joinCall: () => void
  leaveCall: () => void
}

const RoomControl = ({ joinCall, leaveCall }: RoomControlProps) => {
  console.debug('<RoomControl />')
  const { room } = useRoomContext()
  return (
    <div className='room'>
      {room && (
        <>
          <h2>{room.name}</h2>
          <PeerList />
          <CallControl joinCall={joinCall} leaveCall={leaveCall} />
        </>
      )}
    </div>
  )
}

export default RoomControl
