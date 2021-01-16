import { createRef, useEffect, useState } from 'react'
import { useStream } from '../contexts/streamManager'
import Dragbar from './dragbar'

type DecibelControlProps = {
  peerId: string
}

type DecibelControlState = {
  gain: number
  threshold: number
}

const DecibelControl = ({ peerId }: DecibelControlProps) => {
  const [state, setState] = useState<DecibelControlState>({
    gain: 25,
    threshold: 25,
  })
  const streamMgr = useStream()
  const visualizerRef = createRef<HTMLCanvasElement>()
  let canvas: HTMLCanvasElement | null
  let canvasCtx: CanvasRenderingContext2D | null

  const visualize = (p: number) => {
    if (canvas && canvasCtx) {
      const w = canvas.width
      const h = canvas.height

      canvasCtx.fillStyle = 'rgb(0, 0, 0)'
      canvasCtx.fillRect(0, 0, w, h)

      canvasCtx.fillStyle = `rgb(50,${p * 255},50)`
      const bars = Math.ceil(p * 15)
      for (let i = 0; i < bars; i++) {
        canvasCtx.fillRect(i * 20, 0, 19, h)
      }
    }
  }

  const onChangeThreshold = (p: number) => {
    streamMgr.getStream(peerId)?.setThreshold(p / 100)
    setState((prev) => ({ ...prev, threshold: p }))
  }

  const onChangeGain = (p: number) => {
    streamMgr.getStream(peerId)?.setGain(p / 100)
    setState((prev) => ({ ...prev, gain: p }))
  }

  useEffect(() => {
    if (visualizerRef.current) {
      canvas = visualizerRef.current
      canvasCtx = canvas.getContext('2d')
    }
  })

  useEffect(() => {
    console.log('visualiser useEffect')
    streamMgr.connectVisualizer(peerId, visualize)

    return () => {
      console.log('visualiser useEffect unmounted')
      streamMgr.disconnectVisualizer(peerId)
    }
  }, [])

  return (
    <div className='decibel-control'>
      <canvas ref={visualizerRef} width={300} height={10}></canvas>
      <Dragbar className='threshold' initialValue={state.threshold} onChange={(p) => onChangeThreshold(p)} />
      <Dragbar className='gain' initialValue={state.gain} onChange={(p) => onChangeGain(p)} />
    </div>
  )
}
export default DecibelControl
