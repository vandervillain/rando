import React, { CSSProperties, useEffect, useState } from 'react'
import { useAuthContext } from '../contexts/authManager'
import { useWebsocket } from '../contexts/socketManager'
import { useStream } from '../contexts/streamManager'
import DecibelControl from './decibelControl'

type PeerControlProps = {
  peerId: string
  inCall: boolean
  isOutputting: boolean
}

const PeerControl = ({ peerId, inCall, isOutputting }: PeerControlProps) => {
  const auth = useAuthContext()
  const streamMgr = useStream()
  const ws = useWebsocket()
  const renderMute = (id: string) => <button onClick={() => streamMgr.toggleStream(peerId)}>mute</button>

  const peerStyle = () => {
    const properties = {} as CSSProperties
    properties.fontWeight = inCall ? 'bold' : 'normal'
    properties.boxShadow = inCall ? '0 0 3px 3px #999' : ''
    return properties
  }

  const avatarStyle = () => {
    const style: CSSProperties = {}
    if (isOutputting) style.boxShadow = '0 0 5px 5px #4caf50'
    return style
  }

  useEffect(() => {
    console.log(`peerControl useEffect`)
    if (inCall) streamMgr.connectIsStreamingVolume(peerId, (o) => ws.changePeerOutput(peerId, o))

    return () => {
      if (!inCall) streamMgr.disconnectIsStreamingVolume(peerId)
    }
  }, [inCall])

  return (
    <div className='peer-control' key={peerId} style={peerStyle()}>
      <img className='avatar' src='/images/avatar.png' alt={peerId} width='100px' height='100px' style={avatarStyle()} />
      <div className='username'>{auth.getUser()?.name}</div>
      {inCall && (
        <DecibelControl peerId={peerId} />
      )}
      <div className='controls'>{renderMute(peerId)}</div>
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
