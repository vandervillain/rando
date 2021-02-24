import React from 'react'
import { useRecoilValue } from 'recoil'
import { roomPeerSelect, userSelect } from '../data/atoms'
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

const DecibelControl = ({ peerId, inCall, threshold, gain, setThreshold, setGain }: DecibelControlProps) => {
  const user = useRecoilValue(userSelect)
  const currPeer = useRecoilValue(roomPeerSelect(user?.id))!
  
  return (
    <div className='decibel-control'>
      {inCall && currPeer.inCall && (
        <>
          <Visualizer peerId={peerId} />
          {peerId === user?.id && <Dragbar className='threshold' initialValue={threshold} onChange={p => setThreshold(p)} />}
          <Dragbar className='gain' initialValue={gain} onChange={p => setGain(p)} />
        </>
      )}
      <style jsx>{`
      .decibel-control {
        width: 300px;
      }
      `}</style>
    </div>
  )
}
export default DecibelControl
