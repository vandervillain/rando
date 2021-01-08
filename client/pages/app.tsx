import React from 'react'
import PeerList from '../components/peerList'
import Room from '../components/room'
import RoomList from '../components/roomList'
import { useRtcConnections } from '../contexts/rtcConnectionManager'
import { useWebsocket } from '../contexts/socketManager'

export interface Peer {
  id: string
  inCall: boolean
}

export const App = () => {
  const ws = useWebsocket()
  const rtc = useRtcConnections()

  return (
    <>
      <RoomList currRoom={ws.room.name} joinRoom={ws.joinRoom} />
      <Room name={ws.room.name} inCall={ws.room.self.inCall} makeCall={ws.makeCall} leaveCall={ws.leaveCall} >
        <PeerList peers={ws.room.peers} toggleMute={rtc.toggleMutePeer} />
      </Room>
      <style jsx>
        {`
          #local-video {
            border: 1px solid #cddfe7;
            width: 100%;
            height: 100%;
            box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
    </>
  )
}
