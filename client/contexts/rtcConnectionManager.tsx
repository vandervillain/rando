import React, { FunctionComponent, useEffect } from 'react'

type RTCConnectionManagerContext = {
  addConnection: (id: string, onIceCanidate: (id: string, c: RTCIceCandidate) => void) => PeerConnection | null
  removeConnection: (id: string) => void
  getConnection: (id: string) => PeerConnection | undefined
  addIceCandidate: (id: string, c: RTCIceCandidate) => void
  streamMic: () => void
  stopMic: () => void
  toggleMuteMic: () => void
  toggleMutePeer: (id: string) => void
  destroy: () => void
}

export const RTCConnectionContext = React.createContext<RTCConnectionManagerContext>({
  addConnection: (id: string, onIceCanidate: (id: string, c: RTCIceCandidate) => void) => null,
  removeConnection: (id: string) => {},
  getConnection: (id: string) => undefined,
  addIceCandidate: (id: string, c: RTCIceCandidate) => {},
  streamMic: () => {},
  stopMic: () => {},
  toggleMuteMic: () => {},
  toggleMutePeer: (id: string) => {},
  destroy: () => {},
})

export const useRtcConnections = () => React.useContext(RTCConnectionContext)

type RTCConnectionManagerProps = {}

interface PeerConnection {
  peerId: string
  conn: RTCPeerConnection
  audioRef: React.RefObject<HTMLAudioElement> | null
  muted: boolean
}

let rtcPeerConnections: PeerConnection[] = []
let outgoingStream: MediaStream
let incomingStream: MediaStream

export const RTCConnectionManager: FunctionComponent<RTCConnectionManagerProps> = ({ children }) => {
  const outgoingAudioRef = React.createRef<HTMLAudioElement>()
  const incomingAudioRef = React.createRef<HTMLAudioElement>()

  const getRtcPeerConnection = (id: string) => rtcPeerConnections.find((p) => p.peerId === id)

  const addRtcPeerConnection = (id: string, onIceCandidate: (id: string, c: RTCIceCandidate) => void) => {
    destroyRtcPeerConnection(id)

    const pc = new RTCPeerConnection()
    ;(pc as any).peerId = id
    ;(pc as any).notifyWs = onIceCandidate

    // Now add your local media stream tracks to the connection
    outgoingStream.getTracks().forEach((track: MediaStreamTrack) => {
      pc.addTrack(track, outgoingStream)
    })

    pc.ontrack = ({ streams: [stream] }) => {
      if (incomingAudioRef.current) incomingAudioRef.current.srcObject = stream
    }

    // Listen for local ICE candidates on the local RTCPeerConnection
    pc.onicecandidate = ({candidate}) => {
      if (candidate) onIceCandidate(id, candidate)
    }

    pc.onnegotiationneeded = (e) => {
      console.log('onnegotiationneeded')
    }
    pc.ondatachannel = (e) => {
      console.log('ondatachannel')
    }
    pc.oniceconnectionstatechange = (e) => {
      if (pc.connectionState === 'connected') {
        // Peers connected!
      }
    }
    pc.onicegatheringstatechange = (e) => {
      console.log('onicegatheringstatechange')
    }
    pc.onsignalingstatechange = (e) => {
      console.log('onsignalingstatechange')
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

  const streamMic = async () => {
    outgoingStream = await window.navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    if (outgoingAudioRef.current) outgoingAudioRef.current.srcObject = outgoingStream
  }

  const stopMic = () => {
    outgoingStream.getTracks().forEach((track) => {
      track.stop()
    })

    if (outgoingAudioRef.current) outgoingAudioRef.current.srcObject = null
  }

  const toggleMuteMic = () => {
    const tracks = outgoingStream.getAudioTracks()
    tracks[0].enabled = !tracks[0].enabled
  }

  const toggleMutePeer = (id: string) => {
    const peer = getRtcPeerConnection(id)
    if (peer) destroyRtcPeerConnection(id)
    //console.log(peer?.conn)
    // if (peer) {
    //   const senders = peer.conn.getSenders()
    // }
    // if (peer && peer.audioRef?.current)
    //   peer.audioRef.current.muted = !peer.audioRef.current.muted
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
        streamMic,
        stopMic,
        toggleMuteMic,
        toggleMutePeer,
        destroy,
      }}
    >
      {children}
      <audio ref={outgoingAudioRef} autoPlay muted controls></audio>
      <audio ref={incomingAudioRef} autoPlay controls></audio>
    </RTCConnectionContext.Provider>
  )
}
