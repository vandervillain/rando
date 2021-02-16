import React from 'react'
import Dragbar from './dragbar'
import Visualizer from './visualizer'

type DecibelControlProps = {
  peerId: string
  inCall: boolean
  threshold: number,
  gain: number,
  setThreshold: (p: number) => void
  setGain: (p: number) => void
}

const DecibelControl = ({ peerId, inCall, threshold, gain, setThreshold, setGain }: DecibelControlProps) => {
  return (
    <div className='decibel-control'>
      {inCall && (
        <>
          <Visualizer peerId={peerId} />
          <Dragbar className='threshold' initialValue={threshold} onChange={p => setThreshold(p)} />
          <Dragbar className='gain' initialValue={gain} onChange={p => setGain(p)} />
        </>
      )}
    </div>
  )
}
export default DecibelControl
