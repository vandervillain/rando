import React, { useState, useEffect, useCallback } from 'react'
import { getTurnConfig } from '../helpers/development'

export type RtcSubscriptions = {
  onOffer: (peerId: string, offer: RTCSessionDescriptionInit) => void
  onAnswer: (peerId: string, answer: RTCSessionDescriptionInit) => void
  onCandidate: (id: string, candidate: RTCIceCandidate) => void
}

interface IRTCRelay {
  sendOffer: (peerId: string, offer: RTCSessionDescriptionInit) => Promise<void>
  sendAnswer: (peerId: string, answer: RTCSessionDescriptionInit) => Promise<void>
  sendCandidate: (peerId: string, candidate: RTCIceCandidate) => Promise<void>
}

class PeerConnection extends RTCPeerConnection {
  public peerId: string
  constructor(id: string, rtcConfig: RTCConfiguration | undefined) {
    super(rtcConfig)
    this.peerId = id
  }
}

// collection of rtc connections with peers
const connections: Record<string, PeerConnection> = {}
// microphone's outgoing post stream
let localStream: MediaStream

const useWebRTC = (relay: IRTCRelay, onTrack: (id: string, stream: MediaStream) => void) => {
  const [rtcConfig, setRTCConfig] = useState<RTCConfiguration>()

  const setLocalStream = useCallback((stream: MediaStream) => {
    localStream = stream
    // const tracks = localStream.getTracks()
    // for (const c in connections) {
    //   const senders = connections[c].getSenders()
    //   for (const s of senders) {
    //     console.debug(`settings stream for sender ${s.track?.label}`)
    //     s.setStreams(localStream)
    //     s.replaceTrack(tracks[0])
    //   }
    // }
  }, [])

  const createConnection = useCallback((peerId: string) => {
    console.debug(`createConnection to peer '${peerId}'`)

    destroyConnection(peerId)

    const conn = new PeerConnection(peerId, rtcConfig)

    conn.ontrack = ({ streams: [stream] }) => {
      console.log(`pc.ontrack stream ${stream.id}`)
      onTrack(peerId, stream)
    }

    conn.onicecandidate = async ({ candidate }) => {
      console.debug('onicecandidate')
      console.debug(candidate)
      if (candidate) await relay.sendCandidate(conn.peerId, candidate)
    }

    conn.onicecandidateerror = (e: any) => {
      console.error(`onicecandidateerror: ${e.url} ${e.errorCode} ${e.errorText}`)
    }

    conn.onnegotiationneeded = e => {
      console.debug('onnegotiationneeded')
    }
    conn.ondatachannel = e => {
      console.debug('ondatachannel')
    }
    conn.oniceconnectionstatechange = e => {
      console.debug(`oniceconnectionstatechange: ${conn.connectionState}`)
    }
    conn.onicegatheringstatechange = e => {
      console.debug(`onicegatheringstatechange: ${conn.iceGatheringState}`)
    }
    conn.onsignalingstatechange = e => {
      console.debug(`onsignalingstatechange: ${conn.signalingState}`)
    }

    connections[peerId] = conn
    return conn
  }, [])

  const addLocalStream = useCallback((peerId: string) => {
    if (!localStream) throw Error('local stream not ready')
    console.log('adding local track to outgoing stream')
    const tracks = localStream.getAudioTracks()
    connections[peerId].addTrack(tracks[0], localStream)
  }, [])

  const offer = useCallback(async (peerId: string) => {
    console.debug(`send offer to ${peerId}`)
    // 1. create an RTCPeerConnection
    createConnection(peerId)
    // 2. add the local stream's tracks
    addLocalStream(peerId)
    // 3. send the new peer an offer to connect
    const offer = await connections[peerId].createOffer()
    // 4. set the description of peer's end of the call
    await connections[peerId].setLocalDescription(offer)
    // 5. send offer to peer
    await relay.sendOffer(peerId, offer)
  }, [])

  const onOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    console.log(`received offer from ${peerId}`)
    // 1. create an RTCPeerConnection
    createConnection(peerId)
    // 2. create an RTCSessionDescription using the received offer
    const session = new RTCSessionDescription(offer)
    // 3. setRemoteDescription to tell WebRTC about peer's configuration
    await connections[peerId].setRemoteDescription(session)
    // 4. add the local stream's tracks
    addLocalStream(peerId)
    // 5. create an answer to the peer's offer
    const answer = await connections[peerId].createAnswer()
    // 6. configure peer's end of the connection by matching the generated answer
    await connections[peerId].setLocalDescription(answer)
    // 5. send answer to peer
    await relay.sendAnswer(peerId, answer)
  }, [])

  const onAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    console.log(`received answer from ${peerId}`)
    if (!connections[peerId]) {
      console.error(`connection for peer '${peerId}' not found`)
      return
    }
    // 1. create an RTCSessionDescription using the received answer
    const description = new RTCSessionDescription(answer)
    // 2. let local user's WebRTC layer know how peer's end of the connection is configured
    await connections[peerId].setRemoteDescription(description)
  }, [])

  const onCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidate) => {
    console.log(`received candidate from ${peerId}`)
    if (!connections[peerId]) {
      console.error(`connection for peer '${peerId}' not found`)
      return
    }

    await connections[peerId].addIceCandidate(candidate)
  }, [])

  /** add an audio stream to rtc connection */
  const addTrackToRTCConnection = useCallback(
    (id: string, track: MediaStreamTrack, stream: MediaStream) => {
      console.debug('addTrackToRTCConnection')
      if (!connections[id]) {
        console.warn(`rtc connection '${id}' not found`)
        return
      }

      connections[id].addTrack(track, stream)
    },
    []
  )

  const destroyConnection = useCallback((id: string) => {
    if (!connections[id]) return
    console.debug(`destroyConnection '${id}'`)
    connections[id].close()
    delete connections[id]
    console.log(`existing rtc connection ${id} closed`)
  }, [])

  const destroy = useCallback(() => {
    console.debug('destroying webrtc')
    for (const r in connections) destroyConnection(r)
  }, [])

  useEffect(() => {
    const rtcConfig = getTurnConfig()
    console.debug(`setting rtc config`)
    setRTCConfig(rtcConfig)

    return destroy
  }, [])

  useEffect(() => {
    console.debug('webRTC mount')

    return () => {
      console.debug('webRTC unmount')
    }
  })

  return {
    setLocalStream,
    offer,
    onOffer,
    onAnswer,
    onCandidate,
    addTrackToRTCConnection,
    destroyConnection,
    destroy,
  }
}

export default useWebRTC
