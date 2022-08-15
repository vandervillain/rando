import React, { useState, useEffect, useCallback } from 'react'
import { getTurnConfig } from '../helpers/development'

export type RtcSubscriptions = {
  onOffer: (peerId: string, offer: RTCSessionDescriptionInit) => void
  onAnswer: (peerId: string, answer: RTCSessionDescriptionInit) => void
  onCandidate: (id: string, candidate: RTCIceCandidate) => void
}

interface IRTCRelay {
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
// microphone outgoing post stream
let localStream: MediaStream

const useWebRTC = (relay: IRTCRelay, onTrack: (id: string, stream: MediaStream) => void) => {
  const [rtcConfig, setRTCConfig] = useState<RTCConfiguration>()

  const setLocalStream = useCallback((stream: MediaStream) => {
    localStream = stream
    return
    const tracks = localStream.getTracks()
    for (const c in connections) {
      const senders = connections[c].getSenders()
      for (const s of senders) {
        console.debug(`settings stream for sender ${s.track?.label}`)
        s.setStreams(localStream)
        s.replaceTrack(tracks[0])
      }
    }
  }, [])

  const createConnection = useCallback((id: string) => {
    console.debug(`createConnection to peer '${id}'`)

    destroyConnection(id)

    const conn = new PeerConnection(id, rtcConfig)

    conn.ontrack = ({ streams: [stream] }) => {
      console.debug(`pc.ontrack stream ${stream.id}`)
      onTrack(id, stream)
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

    if (localStream) {
      console.log('adding local track to outgoing stream')
      const tracks = localStream.getAudioTracks()
      conn.addTrack(tracks[0], localStream)
    }

    connections[id] = conn
    return conn
  }, [])

  const createOffer = useCallback(async (peerId: string) => {
    const peerConnection = createConnection(peerId)
    // send the new peer an offer to connect
    console.log(`create offer`)
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    return offer
  }, [])

  const receivedOffer = useCallback(async (peerId: string, offer: RTCSessionDescriptionInit) => {
    console.log(`received offer from ${peerId}`)
    const peerConnection = createConnection(peerId)
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      await relay.sendAnswer(peerId, answer)
    }
  }, [])

  const receivedAnswer = useCallback(async (peerId: string, answer: RTCSessionDescriptionInit) => {
    console.log(`received answer from ${peerId}`)
    if (!connections[peerId]) {
      console.error(`connection for peer '${peerId}' not found`)
      return
    }

    await connections[peerId].setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const receivedCandidate = useCallback(async (peerId: string, candidate: RTCIceCandidate) => {
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
    createOffer,
    receivedOffer,
    receivedAnswer,
    receivedCandidate,
    addTrackToRTCConnection,
    destroyConnection,
    destroy,
  }
}

export default useWebRTC
