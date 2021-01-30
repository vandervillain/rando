import React, { CSSProperties, useEffect } from 'react'
import { RoomPeer, useRoomContext } from '../contexts/roomManager'
import { useStream } from '../contexts/streamManager'
import DecibelControl from './decibelControl'

type PeerControlProps = {
  peer: RoomPeer
  isCurrUser: boolean
}

const PeerControl = ({ peer, isCurrUser }: PeerControlProps) => {
  const streamMgr = useStream()
  const roomMgr = useRoomContext()

  const peerStyle = () => {
    const properties = {} as CSSProperties
    properties.fontWeight = peer.inCall ? 'bold' : 'normal'
    properties.boxShadow = peer.inCall ? '0 0 3px 3px #999' : ''
    return properties
  }

  const avatarStyle = () => {
    const style: CSSProperties = {}
    if (peer.isOutputting) style.boxShadow = '0 0 5px 5px #4caf50'
    return style
  }

  const renderMute = (id: string) =>
    peer.isMuted ? (
      <button onClick={() => roomMgr.setIsMuted(peer.id, false)}>unmute</button>
    ) : (
      <button onClick={() => roomMgr.setIsMuted(peer.id, true)}>mute</button>
    )

  useEffect(() => {
    if (peer.inCall) streamMgr.connectIsStreamingVolume(peer.id, o => roomMgr.userOutputUpdate(peer.id, o))

    return () => {
      if (!peer.inCall) streamMgr.disconnectIsStreamingVolume(peer.id)
    }
  }, [peer.inCall])

  return (
    <div className='peer-control' key={peer.id} style={peerStyle()}>
      <img className='avatar' src='/images/avatar.png' alt={peer.id} width='100px' height='100px' style={avatarStyle()} />
      <div className='username'>{roomMgr.getPeerById(peer.id)?.name}</div>
      {peer.inCall && <DecibelControl peerId={peer.id} inCall={peer.inCall} />}
      <div className='controls'>{renderMute(peer.id)}</div>
      {!isCurrUser && (
        <audio autoPlay hidden></audio>
      )}
      <style jsx>{`
        .peer-control {
          display: grid;
          grid-template-areas:
            'avatar username username username'
            'avatar decibels decibels controls';
          grid-gap: 10px;
          background-color: #444;
          padding: 10px;
          margin: 10px;
          border-radius: 60px 60px 60px 60px;
        }
        .grid-container > * {
          background-color: rgba(255, 255, 255, 0.8);
          text-align: center;
          padding: 20px 0;
          font-size: 30px;
        }
        img.avatar {
          border-radius: 50%;
          grid-area: avatar;
        }
        .username {
          grid-area: username;
        }
        .decibels {
          grid-area: threshold;
        }
        .controls {
          grid-area: controls;
        }
      `}</style>
    </div>
  )
}
export default PeerControl
