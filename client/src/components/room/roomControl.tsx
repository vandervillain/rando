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
  const { room, currUserPeer } = useRoomContext()

  const className = () => {
    const classes = ['room']
    if (currUserPeer?.inCall) classes.push('in-call')
    return classes.join(' ')
  }

  return (
    <div className={className()}>
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
