import React, { FunctionComponent, useEffect } from 'react'
import { useAuthContext } from './authManager'
import { useStream } from './streamManager'

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
}

let rtcPeerConnections: PeerConnection[] = []

export const RTCConnectionManager: FunctionComponent<RTCConnectionManagerProps> = ({ children }) => {
  const auth = useAuthContext()
  const streamMgr = useStream()

  const getRtcPeerConnection = (id: string) => rtcPeerConnections.find((p) => p.peerId === id)

  const addRtcPeerConnection = (id: string, onIceCandidate: (id: string, c: RTCIceCandidate) => void) => {
    destroyRtcPeerConnection(id)

    const pc = new RTCPeerConnection()
    ;(pc as any).peerId = id
    ;(pc as any).notifyWs = onIceCandidate

    // Now add your local media stream tracks to the connection
    const userId = auth.getUser()!.id
    const outgoingStream = streamMgr.getStream(userId)!.stream!
    outgoingStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
      pc.addTrack(track, outgoingStream)
    })

    pc.ontrack = ({ streams: [stream] }) => {
      const peerStream = streamMgr.addStream((pc as any).peerId)!
      peerStream.connect()
      //if (incomingAudioRef.current) incomingAudioRef.current.srcObject = stream
    }

    // Listen for local ICE candidates on the local RTCPeerConnection
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) onIceCandidate(id, candidate)
    }

    pc.onnegotiationneeded = (e) => {
      //console.log('onnegotiationneeded')
    }
    pc.ondatachannel = (e) => {
      //console.log('ondatachannel')
    }
    pc.oniceconnectionstatechange = (e) => {
      if (pc.connectionState === 'connected') {
        // Peers connected!
      }
    }
    pc.onicegatheringstatechange = (e) => {
      //console.log('onicegatheringstatechange')
    }
    pc.onsignalingstatechange = (e) => {
      //console.log('onsignalingstatechange')
    }

    const newConn: PeerConnection = {
      peerId: id,
      conn: pc,
      audioRef: null,
      muted: false,
    }
    rtcPeerConnections.push(newConn)

    return newConn
  }

  const destroyRtcPeerConnection = (id: string) => {
    const peer = getRtcPeerConnection(id)
    if (peer) {
      peer.conn.close()
      rtcPeerConnections = rtcPeerConnections.filter((p) => p.peerId !== id)
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
    return () => {
      console.log('rtcConnectionManager unmounted')
    }
  }, [])

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
