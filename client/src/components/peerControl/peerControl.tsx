import React, { CSSProperties, useEffect, useState } from 'react'
import { useStreamContext } from '../../contexts/streamManager'
import DecibelControl from './decibelControl'
import { isTest } from '../../helpers/development'
import MicControl from './micControl'
import { useSessionContext } from '../../contexts/sessionManager'
import { useRoomContext } from '../../contexts/roomManager'
import Avatar from '../../assets/images/avatar.png'

type PeerControlProps = {
  peerId: string
}

const PeerControl = ({ peerId }: PeerControlProps) => {
  const { user } = useSessionContext()
  const { streams } = useStreamContext()
  const { room, currUserPeer } = useRoomContext()
  const { connectIsStreamingVolume, disconnectIsStreamingVolume, setStreamThreshold, setStreamGain } = useStreamContext()
  const [outputting, setOutputting] = useState<boolean>(false)

  const isCurrUser = peerId === user?.id
  const stream = streams.find(s => s.id === peerId)
  const peer = room?.peers.find(p => p.id === peerId)

  if (!user || !room || !currUserPeer || !peer) return null

  const className = () => currUserPeer.inCall ? 'peer-control in-call' : 'peer-control'
  const peerDisplayName = () => (
    <>
      {peer.name} {isTest && <>({peer.id})</>}
    </>
  )
  const peerStyle = () => {
    const properties = {} as CSSProperties
    properties.fontWeight = peer.inCall ? 'bold' : 'normal'
    properties.boxShadow = peer.inCall ? '0 0 3px 3px #999' : 'none'
    return properties
  }

  const avatarStyle = () => {
    const style: CSSProperties = {}
    style.boxShadow = outputting ? '0 0 5px 5px #4caf50' : 'none'
    return style
  }

  useEffect(() => {
    if (peer.inCall && currUserPeer.inCall && stream) {
      connectIsStreamingVolume(peer.id, setOutputting)
    }
    return () => {
      disconnectIsStreamingVolume(peer.id)
      setOutputting(false)
    }
  }, [peer.inCall, stream])

  console.debug('<PeerControl />')
  return (
    <div className={className()} data-name={peer.name} data-incall={peer.inCall} key={peer.id} style={peerStyle()}>
      <img className='avatar' src={Avatar} alt={peer.id} width='100px' height='100px' style={avatarStyle()} />
      <div className='username'>{peerDisplayName()}</div>
      <div className='decibels'>
        <DecibelControl
          peerId={peer.id}
          inCall={peer.inCall}
          threshold={stream?.threshold ?? 0}
          setThreshold={p => setStreamThreshold(peer.id, p)}
          gain={stream?.gain ?? 0}
          setGain={p => setStreamGain(peer.id, p)}
        />
      </div>
      <div className='controls'>
        <MicControl peerId={peer.id} peerInCall={peer.inCall} isCurrUser={isCurrUser} muted={stream?.muted} />
      </div>
      <style>{`
        .peer-control {
          min-width: 300px;
          display: grid;
          grid-template-areas:
            'avatar username username'
            'avatar decibels controls';
          grid-template-rows: .35fr 1fr;
          grid-template-columns: 100px auto auto;
          grid-gap: 10px;
          background-color: #444;
          padding: 10px;
          margin: 10px;
          border-radius: 60px 60px 60px 60px;
          transition: min-width 0.3s;
        }

        .peer-control.in-call {
          min-width: 450px;
        }

        img.avatar {
          border-radius: 50%;
          grid-area: avatar;
        }
        .username {
          grid-area: username;
          line-height: 14px;
          padding-right: 30px;
        }
        .decibels {
          grid-area: decibels;
          padding: 8px 0;
        }
        .controls {
          grid-area: controls;
        }
      `}</style>
    </div>
  )
}
export default PeerControl
