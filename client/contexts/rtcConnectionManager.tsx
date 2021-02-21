import React, { FunctionComponent, useEffect, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { userSelect } from '../data/atoms'
import { LocalPeerStream } from '../data/stream'
import { useStreamContext } from './streamManager'

type RTCConnectionManagerContext = {
  addConnection: (id: string, onIceCanidate: (id: string, c: RTCIceCandidate) => void) => PeerConnection | null
  removeConnection: (id: string) => void
  getConnection: (id: string) => PeerConnection | undefined
  addIceCandidate: (id: string, c: RTCIceCandidate) => void
  destroy: () => void
}

const RTCConnectionContext = React.createContext<RTCConnectionManagerContext>({
  addConnection: (id: string, onIceCanidate: (id: string, c: RTCIceCandidate) => void) => null,
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

const rtcPeerConnections: PeerConnection[] = []
export const RTCConnectionManager: FunctionComponent<RTCConnectionManagerProps> = ({ children }) => {
  const user = useRecoilValue(userSelect)
  const { getStream, addRemoteStream } = useStreamContext()
  const [, update] = useState<{}>({})

  const getRtcPeerConnection = (id: string) => rtcPeerConnections.find(p => p.peerId === id)

  const addRtcPeerConnection = (id: string, onIceCandidate: (id: string, c: RTCIceCandidate) => void) => {
    destroyRtcPeerConnection(id)

    if (!user) return null

    const pc: PeerConnection = {
      peerId: id,
      conn: new RTCPeerConnection(),
      audioRef: null,
      muted: false,
      tracksToAdd: [],
    }

    ;(pc.conn as any).notifyWs = onIceCandidate

    pc.conn.ontrack = ({ streams: [stream] }) => {
      console.log('pc.ontrack')
      pc.tracksToAdd.push(stream)
      update({})
    }

    // Listen for local ICE candidates on the local RTCPeerConnection
    pc.conn.onicecandidate = ({ candidate }) => {
      if (candidate) onIceCandidate(id, candidate)
    }

    pc.conn.onnegotiationneeded = e => {
      //console.log('onnegotiationneeded')
    }
    pc.conn.ondatachannel = e => {
      //console.log('ondatachannel')
    }
    pc.conn.oniceconnectionstatechange = e => {
      if (pc.conn.connectionState === 'connected') {
        console.log(`pc.connectionState === 'connected'`)
        // Peers connected!
      }
    }
    pc.conn.onicegatheringstatechange = e => {
      //console.log('onicegatheringstatechange')
    }
    pc.conn.onsignalingstatechange = e => {
      //console.log('onsignalingstatechange')
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
      peer.conn.close()
      const i = rtcPeerConnections.findIndex(p => p.peerId === id)
      if (i !== -1) rtcPeerConnections.splice(i, 1)
    }
  }

  const addIceCandidate = (id: string, candidate: RTCIceCandidate) => {
    const pc = getRtcPeerConnection(id)
    pc?.conn.addIceCandidate(candidate)
  }

  const destroy = () => {
    for (let key in rtcPeerConnections) {
      destroyRtcPeerConnection(key)
    }
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
