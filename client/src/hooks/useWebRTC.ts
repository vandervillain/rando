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
  const rtcConfig = getTurnConfig()

  const setLocalStream = (stream: MediaStream) => {
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
  }

  const createConnection = (peerId: string) => {
    console.debug(`createConnection to peer '${peerId}'`)

    destroyConnection(peerId)

    const conn = new PeerConnection(peerId, rtcConfig)

    conn.ontrack = ({ streams: [stream] }) => {
      console.log(`pc.ontrack stream ${stream.id}`)
      onTrack(peerId, stream)
    }
    conn.onicecandidate = async ({ candidate }) => {
      console.debug(`onicecandidate ${candidate?.address}`)
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

    console.log('adding local track to outgoing stream')
    const tracks = localStream.getAudioTracks()
    conn.addTrack(tracks[0], localStream)

    connections[peerId] = conn
    return conn
  }

  const offer = async (peerId: string) => {
    console.debug(`send offer to ${peerId}`)
    // create an RTCPeerConnection with the local stream
    createConnection(peerId)
    // send the new peer an offer to connect
    const offer = await connections[peerId].createOffer()
    // set the description of peer's end of the call
    console.debug(`setting local description to ${JSON.stringify(offer)}`)
    await connections[peerId].setLocalDescription(offer)
    // send offer to peer
    await relay.sendOffer(peerId, offer)
  }

  const onOffer = async (peerId: string, offer: RTCSessionDescriptionInit) => {
    console.debug(`received offer from ${peerId}: ${JSON.stringify(offer)}`)
    // create an RTCPeerConnection with the local stream
    createConnection(peerId)
    // create an RTCSessionDescription using the received offer
    const session = new RTCSessionDescription(offer)
    // setRemoteDescription to tell WebRTC about peer's configuration
    console.debug(`setting remote description to ${JSON.stringify(session)}`)
    await connections[peerId].setRemoteDescription(session)
    // create an answer to the peer's offer
    const answer = await connections[peerId].createAnswer()
    // configure peer's end of the connection by matching the generated answer
    console.debug(`setting local description to ${JSON.stringify(answer)}`)
    await connections[peerId].setLocalDescription(answer)
    // send answer to peer
    await relay.sendAnswer(peerId, answer)
  }

  const onAnswer = async (peerId: string, answer: RTCSessionDescriptionInit) => {
    console.debug(`received answer from ${peerId}: ${JSON.stringify(answer)}`)
    // create an RTCSessionDescription using the received answer
    const description = new RTCSessionDescription(answer)
    // let local user's WebRTC layer know how peer's end of the connection is configured
    console.debug(`setting remote description to ${JSON.stringify(description)}`)
    await connections[peerId].setRemoteDescription(description)
  }

  const onCandidate = async (peerId: string, candidate: RTCIceCandidate) => {
    console.debug(`received ice candidate from ${peerId}: ${JSON.stringify(candidate)}`)
    await connections[peerId].addIceCandidate(candidate)
  }

  const destroyConnection = (id: string) => {
    if (!connections[id]) return
    console.debug(`destroyConnection '${id}'`)
    connections[id].close()
    delete connections[id]
    console.log(`existing rtc connection ${id} closed`)
  }

  const destroy = () => {
    console.debug('destroying webrtc')
    for (const r in connections) destroyConnection(r)
  }

  useEffect(() => {
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
    destroyConnection,
    destroy,
  }
}

export default useWebRTC
