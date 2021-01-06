import React, { FunctionComponent, useEffect, useState } from 'react'
import { parentPort } from 'worker_threads'

type RTCConnectionManagerContext = {
  addConnection: (id: string) => PeerConnection | null
  removeConnection: (id: string) => void
  getConnection: (id: string) => PeerConnection | undefined
  streamMic: () => void
  stopMic: () => void
  toggleMuteMic: () => void
  toggleMutePeer: (id: string) => void
  reset: () => void
}

export const RTCConnectionContext = React.createContext<RTCConnectionManagerContext>({
  addConnection: (id: string) => null,
  removeConnection: (id: string) => {},
  getConnection: (id: string) => undefined,
  streamMic: () => {},
  stopMic: () => {},
  toggleMuteMic: () => {},
  toggleMutePeer: (id: string) => {},
  reset: () => {},
})

export const useRtcConnections = () => React.useContext(RTCConnectionContext)

type RTCConnectionManagerProps = {}

interface PeerConnection {
  peerId: string,
  conn: RTCPeerConnection
  audioRef: React.RefObject<HTMLAudioElement> | null
  muted: boolean
}

let rtcPeerConnections: PeerConnection[] = []
let localStream: MediaStream

export const RTCConnectionManager: FunctionComponent<RTCConnectionManagerProps> = ({ children }) => {
  const localAudioRef = React.createRef<HTMLAudioElement>()

  const getRtcPeerConnection = (id: string) => rtcPeerConnections.find(p => p.peerId === id)

  const addRtcPeerConnection = (id: string) => {
    destroyRtcPeerConnection(id)

    const conn = new RTCPeerConnection()

    // Now add your local media stream tracks to the connection
    localStream.getTracks().forEach((track: MediaStreamTrack) => {
      conn.addTrack(track)
    })

    const newConn: PeerConnection = {
      peerId: id,
      conn,
      audioRef: null,
      muted: false
    }
    rtcPeerConnections.push(newConn)
    return newConn
  }

  const destroyRtcPeerConnection = (id: string) => {
    const peer = getRtcPeerConnection(id)
    if (peer) {
      peer.conn.close()
      rtcPeerConnections = rtcPeerConnections.filter(p => p.peerId !== id)
    }
  }

  const streamMic = async () => {
    localStream = await window.navigator.mediaDevices.getUserMedia({ video: false, audio: true })

    const localAudio = localAudioRef.current
    if (localAudio) localAudio.srcObject = localStream
  }

  const stopMic = () => {
    localStream.getTracks().forEach(track => {
      track.stop()
    })
    const localVideo = localAudioRef.current
    if (localVideo) localVideo.srcObject = null
  }

  const toggleMuteMic = () => {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled
  }

  const toggleMutePeer = (id: string) => {
    const peer = getRtcPeerConnection(id)
    // if (peer && peer.audioRef?.current)
    //   peer.audioRef.current.muted = !peer.audioRef.current.muted
  }

  const reset = () => {
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
        streamMic,
        stopMic,
        toggleMuteMic,
        toggleMutePeer,
        reset,
      }}
    >
      {children}
      {/* {rtcPeerConnections.map(p => (
        <audio key={p.peerId} ref={p.audioRef} muted={p.muted} autoPlay className='remote-audio'></audio>
      ))} */}
      <audio ref={localAudioRef} autoPlay className='local-audio'></audio>
      <style jsx>
        {`
          .local-video {
            border: 1px solid #cddfe7;
            width: 100%;
            height: 100%;
            box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.2);
          }
        `}
      </style>
    </RTCConnectionContext.Provider>
  )
}
