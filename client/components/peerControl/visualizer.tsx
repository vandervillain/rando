import { createRef, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { useStreamContext } from '../../contexts/streamManager'
import { streamSelect } from '../../data/atoms'

type VisualizerProps = {
  peerId: string
}

const Visualizer = ({peerId}: VisualizerProps) => {
  const stream = useRecoilValue(streamSelect(peerId))
  const [p, setP] = useState<number>(0)
  const streamMgr = useStreamContext()
  const visualizerRef = createRef<HTMLCanvasElement>()

  useEffect(() => {
    if (stream)
      streamMgr.connectVisualizer(peerId, (p) => setP(p))

    return () => {
      streamMgr.disconnectVisualizer(peerId)
    }
  }, [stream])

  useEffect(() => {
    if (visualizerRef.current) {
      const canvas = visualizerRef.current
      const canvasCtx = canvas.getContext('2d')

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
  })

  return (
    <div className='visualizer'>
      <canvas ref={visualizerRef} width={300} height={10}></canvas>
      <style jsx>{`
      canvas {
        display: block;
      }
      `}</style>
    </div>
  )
}

export default Visualizer
