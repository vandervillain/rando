import React, { CSSProperties, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { roomPeerSelect, streamSelect, userSelect } from '../../data/atoms'
import { useStreamContext } from '../../contexts/streamManager'
import DecibelControl from './decibelControl'
import { isDebug } from '../../helpers/development'
import MicControl from './micControl'

type PeerControlProps = {
  peerId: string
}

const PeerControl = ({ peerId }: PeerControlProps) => {
  const user = useRecoilValue(userSelect)
  const isCurrUser = peerId === user?.id
  const stream = useRecoilValue(streamSelect(peerId))
  const currPeer = useRecoilValue(roomPeerSelect(user?.id))!
  const peer = useRecoilValue(roomPeerSelect(peerId))!
  const { connectIsStreamingVolume, disconnectIsStreamingVolume, setStreamThreshold, setStreamGain } = useStreamContext()
  const [outputting, setOutputting] = useState<boolean>(false)

  const peerDisplayName = () => (
    <>
      {peer.name} {isDebug && <>({peer.id})</>}
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
    if (peer.inCall && currPeer.inCall && stream) {
      connectIsStreamingVolume(peer.id, setOutputting)
    }
    return () => {
      disconnectIsStreamingVolume(peer.id)
      setOutputting(false)
    }
  }, [peer.inCall, stream])

  return (
    <div className='peer-control' data-name={peer.name} data-incall={peer.inCall} key={peer.id} style={peerStyle()}>
      <img className='avatar' src='/images/avatar.png' alt={peer.id} width='100px' height='100px' style={avatarStyle()} />
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
      <style jsx>{`
        .peer-control {
          min-width: 500px;
          display: grid;
          grid-template-areas:
            'avatar username username'
            'avatar decibels controls';
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
          min-width: 365px;
        }
        .decibels {
          grid-area: decibels;
        }
        .controls {
          grid-area: controls;
        }
      `}</style>
    </div>
  )
}
export default PeerControl
