import React from 'react'
import { Room, useRoomContext } from '../contexts/roomManager'
import CallControl from './callControl'
import PeerList from './peerList'

type RoomProps = {
  room: Room | null
}

const RoomControl = ({ room }: RoomProps) => {
  const roomMgr = useRoomContext()
  const currUser = roomMgr.getSelf()

  return (
    <div className='room'>
      {room && currUser && (
        <>
          <h2>{room.name}</h2>
          <PeerList peers={room.peers} currUserId={currUser.id} />
          <CallControl
            currUser={currUser}
            joinCall={roomMgr.joinCall}
            leaveCall={roomMgr.leaveCall}
            setMute={mute => roomMgr.setIsMuted(currUser.id, mute)}
          />
        </>
      )}
    </div>
  )
}

export default RoomControl
