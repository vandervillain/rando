import React, { CSSProperties, useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { micTestState, roomPeerSelect, streamSelect, userSelect } from '../data/atoms'
import { useStreamContext } from '../contexts/streamManager'
import DecibelControl from './decibelControl'

type PeerControlProps = {
  peerId: string
}

const PeerControl = ({ peerId }: PeerControlProps) => {
  const user = useRecoilValue(userSelect)
  const isCurrUser = peerId === user?.id
  const stream = useRecoilValue(streamSelect(peerId))
  const currPeer = useRecoilValue(roomPeerSelect(user?.id))!
  const peer = useRecoilValue(roomPeerSelect(peerId))!
  const { connectIsStreamingVolume, disconnectIsStreamingVolume, setStreamThreshold, setStreamGain, muteUnmute } = useStreamContext()
  const [testingMic, setTestingMic] = useRecoilState(micTestState)
  const [outputting, setOutputting] = useState<boolean>(false)

  const peerStyle = () => {
    const properties = {} as CSSProperties
    properties.fontWeight = peer.inCall ? 'bold' : 'normal'
    properties.boxShadow = peer.inCall ? '0 0 3px 3px #999' : ''
    return properties
  }

  const avatarStyle = () => {
    const style: CSSProperties = {}
    if (outputting) style.boxShadow = '0 0 5px 5px #4caf50'
    return style
  }

  const renderMute = (id: string) => {
    if (isCurrUser || !stream) return null
    else if (stream.muted)
      return (
        <button style={{ display: 'block' }} onClick={() => muteUnmute(peer.id, false)}>
          unmute
        </button>
      )
    else
      return (
        <button style={{ display: 'block' }} onClick={() => muteUnmute(peer.id, true)}>
          mute
        </button>
      )
  }

  const renderTest = (id: string) => {
    if (isCurrUser) {
      if (testingMic)
        return (
          <button style={{ display: 'block' }} onClick={() => setTestingMic(false)}>
            stop test
          </button>
        )
      else
        return (
          <button style={{ display: 'block' }} onClick={() => setTestingMic(true)}>
            test
          </button>
        )
    } else return null
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
    <div className='peer-control' key={peer.id} style={peerStyle()}>
      <img className='avatar' src='/images/avatar.png' alt={peer.id} width='100px' height='100px' style={avatarStyle()} />
      <div className='username'>
        {peer.name} ({peer.id})
      </div>
      <DecibelControl
        peerId={peer.id}
        inCall={peer.inCall}
        threshold={stream?.threshold ?? 0}
        setThreshold={p => setStreamThreshold(peer.id, p)}
        gain={stream?.gain ?? 0}
        setGain={p => setStreamGain(peer.id, p)}
      />
      <div className='controls'>
        {peer.inCall && renderMute(peer.id)}
        {isCurrUser && peer.inCall && renderTest(peer.id)}
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
