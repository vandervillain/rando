import React, { FunctionComponent, useEffect } from 'react'
import { AnalyserFormat, PeerControlStream, PeerStream, StreamOptions } from '../data/stream'

type StreamManagerContext = {
  addStream: (id: string) => PeerStream | undefined
  getStream: (id: string) => PeerStream | undefined
  initMediaStream: (id: string, mediaStream: MediaStream, options: StreamOptions) => PeerStream | undefined
  muteUnmute: (id: string, mute: boolean) => void
  connectVisualizer: (id: string, callback: (p: number) => void) => void
  disconnectVisualizer: (id: string) => void
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => void
  disconnectIsStreamingVolume: (id: string) => void
  streamMic: (id: string, streamOptions: StreamOptions) => void
  stopMic: (id: string) => void
}

const StreamContext = React.createContext<StreamManagerContext>({
  addStream: (id: string) => undefined,
  getStream: (id: string) => undefined,
  initMediaStream: (id: string, mediaStream: MediaStream, options: StreamOptions) => undefined,
  muteUnmute: (id: string, mute: boolean) => {},
  connectVisualizer: (id: string, callback: (p: number) => void) => {},
  disconnectVisualizer: (id: string) => {},
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => {},
  disconnectIsStreamingVolume: (id: string) => {},
  streamMic: (id: string, streamOptions: StreamOptions) => {},
  stopMic: (id: string) => {},
})

export const useStream = () => React.useContext(StreamContext)

type StreamManagerProps = {}

export interface AudioSource {
  audioCtx: AudioContext
  source: MediaElementAudioSourceNode
}
let streams: PeerStream[] = []
let outgoingAudioSource: AudioSource

export const StreamManager: FunctionComponent<StreamManagerProps> = ({ children }) => {
  const outgoingAudioRef = React.createRef<HTMLAudioElement>()
  const incomingAudioRef = React.createRef<HTMLAudioElement>()

  const addStream = (id: string) => {
    const stream = new PeerStream(id)
    streams.push(stream)
    return stream
  }
  const addLocalStream = (id: string) => {
    const stream = new PeerControlStream(id)
    streams.push(stream)
    return stream
  }
  const getStream = (id: string) => streams.find(s => s.id === id)
  const initMediaStream = (id: string, mediaStream: MediaStream, options: StreamOptions) => {
    const stream = streams.find(s => s.id === id)
    stream?.initMediaStream(mediaStream, options)
    return stream
  }
  const muteUnmute = (id: string, mute: boolean) => {
    const stream = getStream(id)
    if (stream) {
      if (mute) stream.mute()
      else stream.unmute()
    }
  }
  const destroyStream = (id: string) => {
    const stream = getStream(id)
    stream?.stop()
    streams = streams.filter(s => s.id !== id)
  }
  const connectVisualizer = (id: string, callback: (p: number) => void) => {
    const stream = getStream(id) as PeerControlStream
    stream?.subscribeToAnalyser(AnalyserFormat.Percent, callback)
  }
  const disconnectVisualizer = (id: string) => {
    const stream = getStream(id) as PeerControlStream
    stream?.unsubscribeFromAnalyser()
  }
  const connectIsStreamingVolume = (id: string, callback: (output: boolean) => void) => {
    const stream = getStream(id) as PeerControlStream
    stream?.subscribeToThresholdAnalyser(AnalyserFormat.Percent, p => callback(p > 0))
  }
  const disconnectIsStreamingVolume = (id: string) => {
    const stream = getStream(id) as PeerControlStream
    stream?.unsubscribeFromThresholdAnalyser()
  }

  const streamMic = async (id: string, streamOptions: StreamOptions) => {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })
    addLocalStream(id)
    const localStream = initMediaStream(id, stream, streamOptions)
    streams.push(localStream!)
    localStream!.connect(outgoingAudioRef)
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
        addStream,
        getStream,
        initMediaStream,
        muteUnmute,
        connectVisualizer,
        disconnectVisualizer,
        connectIsStreamingVolume,
        disconnectIsStreamingVolume,
        streamMic,
        stopMic,
      }}
    >
      {children}
      <audio ref={outgoingAudioRef} autoPlay muted controls></audio>
      <audio ref={incomingAudioRef} autoPlay controls></audio>
    </StreamContext.Provider>
  )
}
