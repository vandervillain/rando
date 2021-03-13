import React from 'react'
import { useRecoilValue } from 'recoil'
import { useRoomContext } from '../../contexts/roomManager'
import { roomSelect } from '../../data/atoms'
import CallControl from './callControl'
import PeerList from '../peerList'

const RoomControl = () => {
  const room = useRecoilValue(roomSelect)
  const roomMgr = useRoomContext()

  return (
    <div className='room'>
      {room && (
        <>
          <h2>{room.name}</h2>
          <PeerList peers={room.peers} />
          <CallControl
            joinCall={roomMgr.joinCall}
            leaveCall={roomMgr.leaveCall}
          />
        </>
      )}
    </div>
  )
}

export default RoomControl
