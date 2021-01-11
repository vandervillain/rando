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

export const RTCConnectionManager: FunctionComponent<RTCConnectionManagerProps> = ({ children }) => {
  const outgoingAudioRef = React.createRef<HTMLAudioElement>()
  const incomingAudioRef = React.createRef<HTMLAudioElement>()
  const analyserRef = React.createRef<HTMLCanvasElement>()

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

  const streamMic = async () => {
    outgoingStream = await window.navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
    if (outgoingAudioRef.current) outgoingAudioRef.current.srcObject = outgoingStream

    const audioCtx = new AudioContext()

    // const analyser1 = new AnalyserNode(audioCtx, {
    //   fftSize: 2048,
    //   maxDecibels: -25,
    //   minDecibels: -60,
    //   smoothingTimeConstant: 0.5,
    // })
    const analyser = new AnalyserNode(audioCtx, {
      fftSize: 2048,
      maxDecibels: -25,
      minDecibels: -45,
      smoothingTimeConstant: 0.5,
    })

    const gainNode = new GainNode(audioCtx, {
      gain: 1,
    })

    audioCtx.createMediaStreamSource(outgoingStream).connect(analyser).connect(gainNode).connect(audioCtx.destination)

    dynamicThreshold(analyser, gainNode)
    visualize(analyser, analyserRef.current!)
  }

  let lastPassthrough = new Date().getTime()
  const dynamicThreshold = (analyser: AnalyserNode, gainNode: GainNode) => {
    let bufferLength = analyser.frequencyBinCount
    let dataArray = new Uint8Array(bufferLength)

    const check = () => {
      requestAnimationFrame(check)
      analyser.getByteFrequencyData(dataArray)
      let sum = 0
      for (var i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }

      // sum > 0 if analyser detects anything above minDecibels
      // if we detect a high enough decibel level to allow passthrough, then we should
      // allow mic to passthrough until level drops (and stays) below threshold for a
      // brief amount of time
      let letPass = sum > 0
      if (letPass) {
        // allow above threshold through at any time
        lastPassthrough = new Date().getTime()
      } else if (lastPassthrough && new Date().getTime() - lastPassthrough > 500) {
        letPass = false
      } else letPass = true

      gainNode.gain.value = letPass ? 1 : 0
    }
    check()
  }

  const visualize = (analyser: AnalyserNode, canvas: HTMLCanvasElement) => {
    const w = canvas.width
    const h = canvas.height

    const canvasCtx = canvas.getContext('2d')!
    analyser.fftSize = 256
    var bufferLengthAlt = analyser.frequencyBinCount
    console.log(bufferLengthAlt)
    var dataArrayAlt = new Uint8Array(bufferLengthAlt)

    canvasCtx.clearRect(0, 0, w, h)

    var draw = function () {
      requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArrayAlt)

      canvasCtx.fillStyle = 'rgb(0, 0, 0)'
      canvasCtx.fillRect(0, 0, w, h)

      var barWidth = (w / bufferLengthAlt) * 2.5
      var barHeight
      var x = 0

      for (var i = 0; i < bufferLengthAlt; i++) {
        barHeight = dataArrayAlt[i]

        canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)'
        canvasCtx.fillRect(x, h - barHeight / 2, barWidth, barHeight / 2)

        x += barWidth + 1
      }
    }

    draw()
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
      <canvas ref={analyserRef} width={300} height={100}></canvas>
      <audio ref={outgoingAudioRef} autoPlay muted controls></audio>
      <audio ref={incomingAudioRef} autoPlay controls></audio>
    </RTCConnectionContext.Provider>
  )
}
