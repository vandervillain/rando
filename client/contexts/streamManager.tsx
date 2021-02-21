import React, { FunctionComponent } from 'react'
import { useRecoilState } from 'recoil'
import { AnalyserFormat, LocalPeerStream, PeerStream, PeerStreamModel } from '../data/stream'
import { micTestState, streamState, userState } from '../data/atoms'
import { UserSettings } from '../data/types'

type StreamManagerContext = {
  getStream: (id: string) => PeerStream | undefined
  addRemoteStream: (id: string, mediaStream: MediaStream) => void
  removeStream: (id: string) => void
  muteUnmute: (id: string, mute: boolean) => void
  connectVisualizer: (id: string, callback: (p: number) => void) => void
  disconnectVisualizer: (id: string) => void
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => void
  disconnectIsStreamingVolume: (id: string) => void
  streamMic: (id: string) => void
  setStreamThreshold: (id: string, p: number) => void
  setStreamGain: (id: string, p: number) => void
  stopMic: (id: string) => void
}

const StreamContext = React.createContext<StreamManagerContext>({
  getStream: (id: string) => undefined,
  addRemoteStream: (id: string, mediaStream: MediaStream) => {},
  removeStream: (id: string) => {},
  muteUnmute: (id: string, mute: boolean) => {},
  connectVisualizer: (id: string, callback: (p: number) => void) => {},
  disconnectVisualizer: (id: string) => {},
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => {},
  disconnectIsStreamingVolume: (id: string) => {},
  streamMic: (id: string) => {},
  setStreamThreshold: (id: string, p: number) => {},
  setStreamGain: (id: string, p: number) => {},
  stopMic: (id: string) => {},
})

export const useStreamContext = () => React.useContext(StreamContext)

type StreamManagerProps = {}

export interface AudioSource {
  audioCtx: AudioContext
  source: MediaElementAudioSourceNode
}

const peerStreams: PeerStream[] = []

export const StreamManager: FunctionComponent<StreamManagerProps> = ({ children }) => {
  const [userData] = useRecoilState(userState)
  const [streams, setStreams] = useRecoilState(streamState)
  const [testingMic] = useRecoilState(micTestState)
  const audioRefs = [
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
  ]

  const getStream = (id: string) => peerStreams.find(s => s.id === id)
  const getStreamByIndex = (i: number) => (peerStreams.length > i ? peerStreams[i] : null)
  const addStream = <T extends PeerStream>(stream: T, mediaStream: MediaStream, opts?: UserSettings) => {
    stream.setStream(mediaStream, opts ?? { threshold: 0.5, gain: 0.5 })
    stream.connect(audioRefs[peerStreams.length])
    peerStreams.push(stream)
    updateStreamState()
  }
  const addRemoteStream = (id: string, mediaStream: MediaStream) => addStream(new PeerStream(id), mediaStream)
  const addLocalStream = (id: string, mediaStream: MediaStream, opts: UserSettings) => addStream(new LocalPeerStream(id), mediaStream, opts)

  const removeStream = (id: string) => {
    const i = peerStreams.findIndex(s => s.id === id)
    if (i !== -1) {
      peerStreams[i].disconnect()
      peerStreams.splice(i, 1)
      audioRefs.splice(i, 1)
      audioRefs.push(React.createRef<HTMLAudioElement>())
      updateStreamState()
    }
  }

  const connectVisualizer = (id: string, callback: (p: number) => void) => {
    const stream = getStream(id)
    stream?.subscribeToPreAnalyser(AnalyserFormat.Percent, callback)
  }
  const disconnectVisualizer = (id: string) => {
    const stream = getStream(id)
    stream?.unsubscribeFromPreAnalyser()
  }
  const connectIsStreamingVolume = (id: string, callback: (output: boolean) => void) => {
    const stream = getStream(id)
    stream?.subscribeToPostAnalyser(AnalyserFormat.Percent, p => callback(p > 0))
  }
  const disconnectIsStreamingVolume = (id: string) => {
    const stream = getStream(id)
    stream?.unsubscribeFromPostAnalyser()
  }

  const streamMic = async (id: string) => {
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })
    addLocalStream(id, stream, userData.settings)
    updateStreamState()
  }

  const setStreamThreshold = (id: string, p: number) => {
    const stream = getStream(id)
    if (stream) {
      stream?.setThreshold(p)
    }
    updateStreamState()
  }

  const setStreamGain = (id: string, p: number) => {
    const stream = getStream(id)
    if (stream) {
      stream?.setGain(p)
    }
    updateStreamState()
  }

  const stopMic = (id: string) => {
    removeStream(id)
    updateStreamState()
    //if (audioRef.current) audioRef.current.srcObject = null
  }

  const muteUnmute = (id: string, mute: boolean) => {
    const stream = getStream(id)
    stream?.toggleStream(!mute)

    updateStreamState()
  }
  const shouldAudioBeMuted = (index: number) => {
    const peerStream = getStreamByIndex(index)
    if (peerStream) {
      const currUser = peerStream.id === userData.user?.id
      if (currUser) return !testingMic
      else return streams.length > index ? streams[index].muted : true
    }
    return true
  }

  const updateStreamState = () => {
    setStreams(
      peerStreams.map((s, i) => new PeerStreamModel(s))
    )
  }

  return (
    <StreamContext.Provider
      value={{
        getStream,
        addRemoteStream,
        removeStream,
        muteUnmute,
        connectVisualizer,
        disconnectVisualizer,
        connectIsStreamingVolume,
        disconnectIsStreamingVolume,
        streamMic,
        setStreamThreshold,
        setStreamGain,
        stopMic,
      }}
    >
      {audioRefs.map((r, i) => (
        <audio key={i} ref={r} autoPlay controls muted={shouldAudioBeMuted(i)}></audio>
      ))}
      {children}
    </StreamContext.Provider>
  )
}
