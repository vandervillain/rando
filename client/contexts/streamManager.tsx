import React, { FunctionComponent, useEffect } from 'react'
import { AnalyserFormat, PeerStream, StreamOptions } from '../data/stream'

type StreamManagerContext = {
  getStream: (id: string) => PeerStream | undefined
  addStream: (id: string, mediaStream: MediaStream, options: StreamOptions) => PeerStream
  toggleStream: (id: string) => void
  connectVisualizer: (id: string, callback: (p: number) => void) => void
  disconnectVisualizer: (id: string) => void
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => void
  disconnectIsStreamingVolume: (id: string) => void
  streamMic: (id: string, streamOptions: StreamOptions) => void
  stopMic: (id: string) => void
}

export const StreamContext = React.createContext<StreamManagerContext>({
  getStream: (id: string) => undefined,
  addStream: (id: string, mediaStream: MediaStream, options: StreamOptions) => new PeerStream('', new MediaStream(), options),
  toggleStream: (id: string) => {},
  connectVisualizer: (id: string, callback: (p: number) => void) => {},
  disconnectVisualizer: (id: string) => {},
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => {},
  disconnectIsStreamingVolume: (id: string) => {},
  streamMic: (id: string, streamOptions: StreamOptions) => {},
  stopMic: (id: string) => {},
})

export const useStream = () => React.useContext(StreamContext)

type StreamManagerProps = {}

let streams: PeerStream[] = []
export const StreamManager: FunctionComponent<StreamManagerProps> = ({ children }) => {
  const outgoingAudioRef = React.createRef<HTMLAudioElement>()
  const incomingAudioRef = React.createRef<HTMLAudioElement>()

  const getStream = (id: string) => streams.find((s) => s.id === id)
  const addStream = (id: string, mediaStream: MediaStream, streamOptions: StreamOptions) => {
    const stream = new PeerStream(id, mediaStream, streamOptions)
    streams.push(stream)
    return stream
  }
  const toggleStream = (id: string) => (getStream(id)?.isEnabled() ? getStream(id)?.mute() : getStream(id)?.unmute())
  const destroyStream = (id: string) => {
    const stream = getStream(id)
    stream?.stop()
    stream?.disconnect()
    streams = streams.filter(s => s.id !== id)
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

  const streamMic = async (id: string, streamOptions: StreamOptions) => {
    const localStream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })

    const peerStream = addStream(id, localStream, streamOptions)
    peerStream.connect(outgoingAudioRef)
  }

  const stopMic = (id: string) => {
    destroyStream(id)
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
