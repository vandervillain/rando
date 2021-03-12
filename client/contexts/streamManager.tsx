import React, { FunctionComponent, useEffect } from 'react'
import { useRecoilState } from 'recoil'
import { AnalyserFormat, LocalPeerStream, PeerStream, PeerStreamModel } from '../data/stream'
import { micTestState, streamState, userState } from '../data/atoms'
import { UserSettings } from '../data/types'
import { isDev } from '../helpers/development'

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
})

export const useStreamContext = () => React.useContext(StreamContext)

type StreamManagerProps = {}

export interface AudioSource {
  audioCtx: AudioContext
  source: MediaElementAudioSourceNode
}

let peerStreams: PeerStream[] = []
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
  const getStreamByIndex = (i: number) => peerStreams.find(p => p.index === i)
  const addStream = <T extends PeerStream>(stream: T, mediaStream: MediaStream, opts?: UserSettings) => {
    stream.setStream(mediaStream, opts ?? { threshold: 0.5, gain: 0.5 })
    
    // assign an audio ref index
    for (let i = 0; i < audioRefs.length; i++) {
      if (!peerStreams.some(p => p.index === i)) {
        stream.index = i
        break;
      }
    }

    if (stream.index === undefined) throw Error('should be room for another stream, but there isnt')
    console.log(`peer ${stream.id} set to audioRef ${stream.index}`)

    stream.connect(audioRefs[stream.index])
    peerStreams.push(stream)
    updateStreamState()
  }
  const addRemoteStream = (id: string, mediaStream: MediaStream) => addStream(new PeerStream(id), mediaStream)
  const addLocalStream = (id: string, mediaStream: MediaStream, opts: UserSettings) => addStream(new LocalPeerStream(id), mediaStream, opts)

  const removeStream = (id: string) => {
    const stream = getStream(id)
    if (stream) {
      stream.disconnect()
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
    console.log('attempting to get microphone stream')
    const stream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
    })
    console.log('obtained local stream from mic')
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
      else return !peerStream.isEnabled()
    }
    return true
  }

  const updateStreamState = () => {
    setStreams(peerStreams.map((s, i) => new PeerStreamModel(s)))
  }

  useEffect(() => {
    let destroyAny = peerStreams.some(p => p.destroy)
    if (destroyAny) {
      peerStreams.forEach(p => {
        if (p.destroy) {
          audioRefs[p.index!].current!.srcObject = null
        }
      })
      peerStreams = peerStreams.filter(p => !p.destroy)
      console.log('peerStreams indexes:')
      peerStreams.sort(p => p.index!).forEach(p => {
        console.log(`${p.index}: ${p.id}`)
      })
      updateStreamState()
    }
  })

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
      }}
    >
      {audioRefs.map((r, i) => (
        <audio key={i} ref={r} autoPlay hidden={!process.env.NEXT_PUBLIC_DEBUG_AUDIO} controls muted={shouldAudioBeMuted(i)}></audio>
      ))}
      {children}
    </StreamContext.Provider>
  )
}
