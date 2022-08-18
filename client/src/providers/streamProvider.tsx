import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import { AnalyserFormat, PeerStream, PeerStreamModel } from '../data/stream'
import { UserSettings } from '../data/types'
import { isTest } from '../helpers/development'
import useWebRTC from '../hooks/useWebRTC'
import { useSessionContext } from './sessionProvider'
import { useSignalRContext } from './signalRProvider'
import { useSettingsContext } from './userSettingsProvider'

type StreamManagerContext = {
  streams: PeerStreamModel[]
  testingMic: boolean
  setTestingMic: (testing: boolean) => void
  requestStream: (peerId: string) => Promise<void>
  getStream: (id: string) => PeerStream | undefined
  addStream: (id: string, mediaStream: MediaStream) => void
  removeStream: (id: string) => void
  destroyStreams: () => void
  muteUnmute: (id: string, mute: boolean) => void
  connectVisualizer: (id: string, callback: (p: number) => void) => void
  disconnectVisualizer: (id: string) => void
  connectIsStreamingVolume: (id: string, callback: (output: boolean) => void) => void
  disconnectIsStreamingVolume: (id: string) => void
  streamMic: (id: string) => void
  setStreamThreshold: (id: string, p: number) => void
  setStreamGain: (id: string, p: number) => void
}

const Context = React.createContext<StreamManagerContext | undefined>(undefined)

export const useStreamContext = (): StreamManagerContext => {
  const context = React.useContext(Context)
  if (context === undefined)
    throw new Error('useStreamContext must be used within a StreamManagerContext')

  return context
}

type StreamManagerProps = {}

export interface AudioSource {
  audioCtx: AudioContext
  source: MediaElementAudioSourceNode
}

let peerStreams: PeerStream[] = []

export const StreamProvider: FunctionComponent<StreamManagerProps> = ({ children }) => {
  console.debug('<StreamProvider />')

  const { user } = useSessionContext()
  const signalR = useSignalRContext()
  const webRTC = useWebRTC(signalR, (id, stream) => {
    addStream(id, stream)
  })

  const { getUserSettings, saveUserGain, saveUserThreshold, saveUserMuted } = useSettingsContext()
  const [streams, setStreams] = useState<PeerStreamModel[]>([])
  const [testingMic, setTestingMic] = useState<boolean>(false)
  const [device, setDevice] = useState<MediaDeviceInfo>()

  const audioRefs = [
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
    React.createRef<HTMLAudioElement>(),
  ]

  const getMediaDevices = useCallback(
    async () => await navigator.mediaDevices.enumerateDevices(),
    []
  )

  const setMediaDevice = useCallback((device: MediaDeviceInfo) => {
    setDevice(device)
    obtainMicStream()
  }, [])

  const obtainMicStream = useCallback(async () => {
    console.log('attempting to get microphone stream')
    const devices = await getMediaDevices()
    const constraints: MediaStreamConstraints = {
      video: false,
      audio: device
        ? {
            deviceId: { exact: device.deviceId },
          }
        : true,
    }
    const stream = await window.navigator.mediaDevices.getUserMedia(constraints)
    console.log(`obtained local stream from mic ${device ? device.label : devices[0].label}`)
    return stream
  }, [device])

  const requestStream = useCallback(
    async (peerId: string) => {
      await webRTC.offer(peerId)
    },
    [webRTC]
  )
  const getStream = (id: string) => peerStreams.find(s => s.id === id)
  const addStream = async (id: string, mediaStream: MediaStream) => {
    console.debug(`addStream for ${id}`)
    const userSettings = getUserSettings(id)
    const stream = new PeerStream(id)
    stream.initializePreStream(mediaStream, userSettings)

    // assign an audio ref index
    for (let i = 0; i < audioRefs.length; i++) {
      if (!peerStreams.some(p => p.index === i)) {
        stream.index = i
        break
      }
    }

    if (stream.index === undefined) throw Error('should be room for another stream, but there isnt')

    const postStream = await stream.initializePostStream()
    if (id === user?.id) webRTC.setLocalStream(postStream)

    peerStreams.push(stream)
    setStreams(peerStreams.map((s, i) => new PeerStreamModel(s)))
  }
  const removeStream = (id: string) => {
    console.debug(`removeStream ${id}`)
    webRTC.destroyConnection(id)
    const stream = getStream(id)
    if (stream) {
      stream.disconnect()
      peerStreams = peerStreams.filter(p => p.id !== id)
      setStreams(peerStreams.map((s, i) => new PeerStreamModel(s)))
    }
  }
  const destroyStreams = () => {
    peerStreams.map(s => removeStream(s.id))
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

  const streamMic = async () => {
    if (!user) return
    const stream = await obtainMicStream()
    await addStream(user.id, stream)
  }

  const setStreamThreshold = (id: string, p: number) => {
    console.debug(`setStreamThreshold ${id}: ${p}`)
    getStream(id)?.setThreshold(p)
    saveUserThreshold(id, p)
    setStreams(peerStreams.map((s, i) => new PeerStreamModel(s)))
  }

  const setStreamGain = (id: string, p: number) => {
    console.debug(`setStreamGain ${id}: ${p}`)
    getStream(id)?.setGain(p)
    saveUserGain(id, p)
    setStreams(peerStreams.map((s, i) => new PeerStreamModel(s)))
  }

  const muteUnmute = (id: string, mute: boolean) => {
    console.debug(`muteUnmute ${id}: ${mute}`)
    const stream = getStream(id)
    stream?.toggleStream(!mute)
    saveUserMuted(id, mute)
    setStreams(peerStreams.map((s, i) => new PeerStreamModel(s)))
  }

  const shouldAudioBeMuted = useCallback(
    (id: string) => {
      const peerStream = getStream(id)
      if (!peerStream) return true
      const currUser = peerStream.id === user?.id
      if (currUser) return !testingMic
      return !peerStream.isEnabled()
    },
    [streams, getUserSettings, testingMic]
  )

  useEffect(() => {
    const toDestroy = peerStreams.filter(p => !streams.some(s => s.id === p.id)).map(p => p.index)

    toDestroy.forEach(index => {
      audioRefs[index!].current!.srcObject = null
    })

    console.debug('peerStreams indexes:')
    peerStreams
      .sort(p => p.index!)
      .forEach(p => {
        console.debug(`${p.index}: ${p.id}`)
      })
  }, [streams.length])

  useEffect(() => {
    if (webRTC) {
      signalR.subscribeTo('offer', webRTC.onOffer)
      signalR.subscribeTo('answer', webRTC.onAnswer)
      signalR.subscribeTo('candidate', webRTC.onCandidate)
    }
    return () => {
      if (webRTC) {
        signalR.unsubscribeFrom('offer', webRTC.onOffer)
        signalR.unsubscribeFrom('answer', webRTC.onAnswer)
        signalR.unsubscribeFrom('candidate', webRTC.onCandidate)
      }
    }
  }, [])

  useEffect(() => {
    console.debug('streamManager mount')

    return () => {
      console.debug('streamManager unmount')
    }
  })

  const audios = useMemo(() => {
    console.debug('memoizing audios')
    return streams.map((stream, i) => (
      <audio
        key={i}
        ref={ref => getStream(stream.id)?.attach(ref)}
        autoPlay
        hidden={!isTest}
        controls
        muted={shouldAudioBeMuted(stream.id)}
      ></audio>
    ))
  }, [streams, shouldAudioBeMuted])

  return (
    <Context.Provider
      value={{
        streams,
        testingMic,
        setTestingMic,
        requestStream,
        getStream,
        addStream,
        removeStream,
        destroyStreams,
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
      {audios}
      {children}
    </Context.Provider>
  )
}
