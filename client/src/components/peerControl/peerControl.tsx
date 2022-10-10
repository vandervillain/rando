import React, { CSSProperties, useEffect, useState } from 'react'
import { useStreamContext } from '../../providers/streamProvider'
import DecibelControl from './decibelControl'
import { isTest } from '../../helpers/development'
import MicControl from './micControl'
import { useSessionContext } from '../../providers/sessionProvider'
import { useRoomContext } from '../../providers/roomProvider'
import defaultAvatar from '../../assets/images/avatar.png'
import './peerControl.css'

type PeerControlProps = {
  peerId: string
}

const PeerControl = ({ peerId }: PeerControlProps) => {
  const { user } = useSessionContext()
  const { streams } = useStreamContext()
  const { room, peers, currUserPeer } = useRoomContext()
  const {
    connectIsStreamingVolume,
    disconnectIsStreamingVolume,
    setStreamThreshold,
    setStreamGain,
  } = useStreamContext()
  const [outputting, setOutputting] = useState<boolean>(false)

  const isCurrUser = peerId === user?.id
  const stream = streams.find(s => s.id === peerId)
  const peer = peers.find(p => p.id === peerId)

  const className = () => {
    let classes = ['peer-control']
    if (peer?.inCall) classes.push('in-call')
    if (isCurrUser) classes.push('current-user')
    return classes.join(' ')
  }

  const peerDisplayName = () => (
    <>
      {peer?.name} {isTest && <>({peer?.id})</>}
    </>
  )

  const avatarStyle = () => {
    const style: CSSProperties = {}
    style.boxShadow = outputting ? '0 0 5px 5px #4caf50' : 'none'
    return style
  }

  useEffect(() => {
    if (peer?.inCall && currUserPeer?.inCall && stream) {
      connectIsStreamingVolume(peer.id, setOutputting)
    }
    return () => {
      if (!peer) return
      disconnectIsStreamingVolume(peer.id)
      setOutputting(false)
    }
  }, [peer, stream])

  if (!user || !room || !currUserPeer || !peer) return null

  return (
    <div className={className()} data-name={peer.name} data-incall={peer.inCall} key={peer.id}>
      <img
        className='avatar'
        src={peer.avatar ? peer.avatar : defaultAvatar}
        alt={peer.id}
        width='100px'
        height='100px'
        style={avatarStyle()}
      />
      <div className='username'>{peerDisplayName()}</div>
      {peer.inCall && (
        <>
          <div className='decibels'>
            <DecibelControl
              peerId={peer.id}
              threshold={stream?.threshold ?? 0}
              setThreshold={p => setStreamThreshold(peer.id, p)}
              gain={stream?.gain ?? 0}
              setGain={p => setStreamGain(peer.id, p)}
            />
          </div>
          <div className='controls'>
            <MicControl peerId={peer.id} isCurrUser={isCurrUser} muted={stream?.muted} />
          </div>
        </>
      )}
    </div>
  )
}
export default PeerControl
