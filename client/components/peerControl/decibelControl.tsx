import React from 'react'
import { useRoomContext } from '../../contexts/roomManager'
import { useSessionContext } from '../../contexts/sessionManager'
import Dragbar from './dragbar'
import Visualizer from './visualizer'

type DecibelControlProps = {
  peerId: string
  inCall: boolean
  threshold: number
  gain: number
  setThreshold: (p: number) => void
  setGain: (p: number) => void
}

const DecibelControl = ({
  peerId,
  inCall,
  threshold,
  gain,
  setThreshold,
  setGain,
}: DecibelControlProps) => {
  const { user } = useSessionContext()
  const { currUserPeer } = useRoomContext()

  return (
    <div className='decibel-control'>
      {inCall && currUserPeer?.inCall && (
        <>
          <Visualizer peerId={peerId} />
          {peerId === user?.id && (
            <Dragbar
              className='threshold'
              initialValue={threshold}
              onChange={p => setThreshold(p)}
            />
          )}
          <br />
          <Dragbar className='gain' initialValue={gain} onChange={p => setGain(p)} />
        </>
      )}
    </div>
  )
}
export default DecibelControl
