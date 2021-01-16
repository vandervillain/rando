import React, { FunctionComponent, useEffect } from 'react'
import { AnalyserFormat, PeerStream } from '../data/stream'

type StreamManagerContext = {
  getStream: (id: string) => PeerStream | undefined
  addStream: (id: string, mediaStream: MediaStream) => PeerStream
  toggleStream: (id: string) => void
  stopStream: (id: string) => void
  connectVisualizer: (id: string, callback: (p: number) => void) => void
  disconnectVisualizer: (id: string) => void
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => void
  disconnectIsStreamingVolume: (id: string) => void
  streamMic: (id: string) => void
  stopMic: (id: string) => void
}

export const StreamContext = React.createContext<StreamManagerContext>({
  getStream: (id: string) => undefined,
  addStream: (id: string, mediaStream: MediaStream) => new PeerStream('', new MediaStream()),
  toggleStream: (id: string) => {},
  stopStream: (id: string) => {},
  connectVisualizer: (id: string, callback: (p: number) => void) => {},
  disconnectVisualizer: (id: string) => {},
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => {},
  disconnectIsStreamingVolume: (id: string) => {},
  streamMic: (id: string) => {},
  stopMic: (id: string) => {},
})

export const useStream = () => React.useContext(StreamContext)

type StreamManagerProps = {}

let streams: PeerStream[] = []
export const StreamManager: FunctionComponent<StreamManagerProps> = ({ children }) => {
  const outgoingAudioRef = React.createRef<HTMLAudioElement>()
  const incomingAudioRef = React.createRef<HTMLAudioElement>()

  const getStream = (id: string) => streams.find((s) => s.id === id)
  const addStream = (id: string, mediaStream: MediaStream) => {
    const stream = new PeerStream(id, mediaStream)
    streams.push(stream)
    return stream
  }
  const toggleStream = (id: string) => (getStream(id)?.isEnabled() ? getStream(id)?.mute() : getStream(id)?.unmute())
  const stopStream = (id: string) => {
    const stream = getStream(id)
    stream?.stop()
    stream?.disconnect()
    return stream
  }
  const connectVisualizer = (id: string, callback: (p: number) => void) => {
    getStream(id)?.subscribeToAnalyser(AnalyserFormat.Percent, callback)
  }
  const disconnectVisualizer = (id: string) => {
    getStream(id)?.unsubscribeFromAnalyser()
  }
  const connectIsStreamingVolume = (id: string, callback: (output: boolean) => void) => {
    getStream(id)?.subscribeToThresholdAnalyser(AnalyserFormat.Percent, (p) => callback(p > 0))
  }
  const disconnectIsStreamingVolume = (id: string) => {
    getStream(id)?.unsubscribeFromThresholdAnalyser()
  }

  const streamMic = async (id: string) => {
    const localStream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })

    const peerStream = addStream(id, localStream)
    peerStream.connect(outgoingAudioRef)
  }

  const stopMic = (id: string) => {
    stopStream(id)
    if (outgoingAudioRef.current) outgoingAudioRef.current.srcObject = null
  }


  useEffect(() => {
    return () => {
      console.log('streamManager unmounted')
    }
  }, [])

  return (
    <StreamContext.Provider
      value={{
        getStream,
        addStream,
        toggleStream,
        stopStream,
        connectVisualizer,
        disconnectVisualizer,
        connectIsStreamingVolume,
        disconnectIsStreamingVolume,
        streamMic,
        stopMic,
      }}
    >
      {children}
      <audio ref={outgoingAudioRef} hidden autoPlay muted controls></audio>
      <audio ref={incomingAudioRef} hidden autoPlay controls></audio>
    </StreamContext.Provider>
  )
}
