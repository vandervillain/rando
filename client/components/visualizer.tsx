import { createRef, useEffect } from 'react'
import { useStream } from '../contexts/streamManager'

type VisualizerProps = {
  id: string
}

const Visualizer = ({ id }: VisualizerProps) => {
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

      canvasCtx.fillStyle = 'rgb(' + p * 255 + ',50,50)'
      canvasCtx.fillRect(0, 0, p * w, h)
    }
  }

  useEffect(() => {
    if (visualizerRef.current) {
      canvas = visualizerRef.current
      canvasCtx = canvas.getContext('2d')
    }
  })

  useEffect(() => {
    console.log('visualiser useEffect')
    streamMgr.connectVisualizer(id, visualize)

    return () => {
      console.log('visualiser useEffect unmounted')
      streamMgr.disconnectVisualizer(id)
    }
  }, [])

  return (
    <div className='visualizer'>
      <canvas ref={visualizerRef} width={300} height={10}></canvas>
    </div>
  )
}
export default Visualizer
