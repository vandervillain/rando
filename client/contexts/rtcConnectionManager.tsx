import React, { FunctionComponent, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { userSelect } from '../data/atoms'
import { LocalPeerStream } from '../data/stream'
import { useStreamContext } from './streamManager'

type RTCConnectionManagerContext = {
  addConnection: (id: string, sendIceCandidate: (id: string, c: RTCIceCandidate) => void) => PeerConnection | null
  removeConnection: (id: string) => void
  getConnection: (id: string) => PeerConnection | undefined
  addIceCandidate: (id: string, c: RTCIceCandidate) => void
  destroy: () => void
}

const RTCConnectionContext = React.createContext<RTCConnectionManagerContext>({
  addConnection: (id: string, sendIceCandidate: (id: string, c: RTCIceCandidate) => void) => null,
  removeConnection: (id: string) => {},
  getConnection: (id: string) => undefined,
  addIceCandidate: (id: string, c: RTCIceCandidate) => {},
  destroy: () => {},
})

export const useRtcConnections = () => React.useContext(RTCConnectionContext)

type RTCConnectionManagerProps = {}

interface PeerConnection {
  peerId: string
  conn: RTCPeerConnection
  audioRef: React.RefObject<HTMLAudioElement> | null
  canvasRef?: React.RefObject<HTMLCanvasElement>
  muted: boolean
  tracksToAdd: MediaStream[]
}

const rtcConfig = process.env.TURN_SERVER_URI
  ? { iceServers: [{ urls: process.env.TURN_SERVER_URI, username: process.env.TURN_SERVER_USER, credential: process.env.TURN_SERVER_PASS }] }
  : undefined

let rtcPeerConnections: PeerConnection[] = []
export const RTCConnectionManager: FunctionComponent<RTCConnectionManagerProps> = ({ children }) => {
  const user = useRecoilValue(userSelect)
  const { getStream, addRemoteStream, removeStream } = useStreamContext()
  const [, update] = useState<{}>({})

  const getRtcPeerConnection = (id: string) => rtcPeerConnections.find(p => p.peerId === id)

  const addRtcPeerConnection = (id: string, sendIceCandidate: (id: string, c: RTCIceCandidate) => void) => {
    destroyRtcPeerConnection(id)

    if (!user) return null

    const pc: PeerConnection = {
      peerId: id,
      conn: new RTCPeerConnection(),
      audioRef: null,
      muted: false,
      tracksToAdd: [],
    }

    pc.conn.ontrack = ({ streams: [stream] }) => {
      console.log('pc.ontrack')
      pc.tracksToAdd.push(stream)
      update({})
    }

    // Listen for local ICE candidates on the local RTCPeerConnection
    pc.conn.onicecandidate = ({ candidate }) => {
      console.log(`onicecandidate`)
      if (candidate)
        sendIceCandidate(id, candidate)
    }

    pc.conn.onnegotiationneeded = e => {
      console.log('onnegotiationneeded')
    }
    pc.conn.ondatachannel = e => {
      console.log('ondatachannel')
    }
    pc.conn.oniceconnectionstatechange = e => {
      console.log(`oniceconnectionstatechange`)
      if (pc.conn.connectionState === 'connected') {
        console.log(`pc.connectionState === 'connected'`)
        // Peers connected!
      }
    }
    pc.conn.onicegatheringstatechange = e => {
      console.log('onicegatheringstatechange')
    }
    pc.conn.onsignalingstatechange = e => {
      console.log('onsignalingstatechange')
    }

    // add local stream to connection
    const outgoingStream = getStream(user.id) as LocalPeerStream
    if (outgoingStream?.postStream) {
      const tracks = outgoingStream.postStream.getAudioTracks()
      console.log('adding local track to outgoing stream')
      pc.conn.addTrack(tracks[0], outgoingStream.postStream)
    }

    rtcPeerConnections.push(pc)

    return pc
  }

  const destroyRtcPeerConnection = (id: string) => {
    const peer = getRtcPeerConnection(id)
    if (peer) {
      removeStream(id)
      peer.conn.close()
      rtcPeerConnections = rtcPeerConnections.filter(pc => pc.peerId != id)
    }
  }

  const addIceCandidate = (id: string, candidate: RTCIceCandidate) => {
    console.log('addIceCandidate')
    const pc = getRtcPeerConnection(id)
    pc?.conn.addIceCandidate(candidate)
  }

  const destroy = () => {
    for (let conn of rtcPeerConnections) destroyRtcPeerConnection(conn.peerId)
  }

  useEffect(() => {
    if (!user) return

    rtcPeerConnections
      .filter(pc => pc.tracksToAdd.length > 0)
      .forEach(pc => {
        while (pc.tracksToAdd.length > 0) {
          addRemoteStream(pc.peerId, pc.tracksToAdd.shift()!)
        }
      })
  })

  return (
    <RTCConnectionContext.Provider
      value={{
        addConnection: addRtcPeerConnection,
        removeConnection: destroyRtcPeerConnection,
        getConnection: getRtcPeerConnection,
        addIceCandidate,
        destroy,
      }}
    >
      {children}
    </RTCConnectionContext.Provider>
  )
}
