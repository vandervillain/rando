import React from 'react'
import { useRoomContext } from '../../contexts/roomContext'
import { useSessionContext } from '../../contexts/sessionManager'
import Dragbar from './dragbar'
import Visualizer from './visualizer'

type DecibelControlProps = {
  peerId: string
  threshold: number
  gain: number
  setThreshold: (p: number) => void
  setGain: (p: number) => void
}

const DecibelControl = ({
  peerId,
  threshold,
  gain,
  setThreshold,
  setGain,
}: DecibelControlProps) => {
  const { user } = useSessionContext()
  const { currUserPeer } = useRoomContext()

  return (
    <div className='decibel-control'>
      {currUserPeer?.inCall && (
        <>
          <Visualizer peerId={peerId} />
          {peerId === user?.id && (
            <Dragbar className='threshold' value={threshold} onChange={p => setThreshold(p)} />
          )}
          <br />
          <Dragbar className='gain' value={gain} onChange={p => setGain(p)} />
        </>
      )}
    </div>
  )
}
export default DecibelControl
