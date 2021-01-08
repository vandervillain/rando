import express, { Application } from 'express'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createServer, Server as HTTPServer } from 'http'

const Server = (callback: (port: number) => void) => {
  const app: Application = express()
  const httpServer: HTTPServer = createServer(app)
  const io: SocketIOServer = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  })
  const DEFAULT_PORT = 5000
  const toRoomId = (roomId: string) => roomId + '-room'
  const toInCallId = (roomId: string) => roomId + '-room-incall'

  const handleSocketConnection = (): void => {
    io.on('connection', (socket: Socket) => {
      console.log(`connection ${socket.id}`)

      const getRoom = () => [...socket.in(socket.id).rooms.values()].find((r) => r.endsWith('-room'))
      const getCallRoom = () => [...socket.in(socket.id).rooms.values()].find((r) => r.endsWith('-incall'))
      const setRoom = async (roomName: string | null) => {
        const currRoom = getRoom()
        if (currRoom) socket.leave(currRoom)

        if (roomName) {
          const roomId = toRoomId(roomName)
          await socket.join(roomId)
          return roomId
        } else return null
      }
      const setCallRoom = async (roomName: string | null) => {
        const currCall = getCallRoom()
        if (currCall) await socket.leave(currCall)

        if (roomName) {
          const callRoomId = toInCallId(roomName)
          await socket.join(callRoomId)
          return callRoomId
        } else return null
      }
      const getRoomPeers = async (roomId: string) => [...(await io.in(roomId).allSockets()).values()]
      const otherRoomPeers = async (roomId: string) => (await getRoomPeers(roomId)).filter((p) => p !== socket.id)
      const getPeers = async (roomName: string) => {
        const peers = await otherRoomPeers(toRoomId(roomName) )
        const inCallPeers = await otherRoomPeers(toInCallId(roomName))
        return peers.length
          ? peers.map((id) => ({
              id,
              inCall: inCallPeers.indexOf(id) !== -1,
            }))
          : []
      }

      const leaveRoom = () => {
        const currRoomId = getRoom()
        if (currRoomId) {
          console.log(`${socket.id} leaving room ${currRoomId}`)
          // let others in room know that peer left room
          socket.in(currRoomId).broadcast.emit('peer-left-room', socket.id)
          setCallRoom(null)
          setRoom(null)
        }
      }

      socket.on('join-room', async (roomName: string) => {
        // if user is in a room, let peers know they are leaving
        leaveRoom()

        const room = await setRoom(roomName)
        console.log(`${socket.id} joined room ${room}`)

        // let others in this room know that this peer has joined
        socket.to(room!).broadcast.emit('peer-joined-room', socket.id)

        // let this peer know which peers are already in this room/in call
        const peers = await getPeers(roomName)
        socket.emit('joined-room', roomName, peers)
      })

      socket.on('leave-room', leaveRoom)

      socket.on('join-call', async (roomName: string) => {
        const roomId = getRoom()
        const callRoomId = await setCallRoom(roomName)

        console.log(`user ${socket.id} joining call in ${roomId} (room ${callRoomId})`)

        // let others in room know that a peer is joining the call
        socket.in(roomId!).broadcast.emit('peer-joining-call', socket.id)
      })

      socket.on('leave-call', async () => {
        const roomId = getRoom()
        const currCallRoomId = getCallRoom()
        if (roomId && currCallRoomId) {
          console.log(`user ${socket.id} is leaving call in ${roomId} (room ${currCallRoomId})`)
          // let others in room know that peer left call
          socket.in(roomId).broadcast.emit('peer-left-call', socket.id)
          setCallRoom(null)
        }
      })

      // when a client is notified that a new peer is joining the call,
      // they will send an offer to that peer and expect an answer in return
      socket.on('offer', (peerId: string, offer: RTCSessionDescriptionInit) => {
        // client wants to send an offer to a peer
        console.log(`user ${socket.id} is sending an offer to ${peerId}`)
        socket.to(peerId).emit('offer', socket.id, offer)
      })

      socket.on('answer', (peerId: string, offer: RTCSessionDescriptionInit) => {
        // client wants to send an answer to a peer
        console.log(`user ${socket.id} is sending an answer to ${peerId}`)
        socket.to(peerId).emit('answer', socket.id, offer)
      })

      socket.on('candidate', (peerId: string, candidate: RTCIceCandidate) => {
        console.log(`user ${socket.id} is sending a candidate to ${peerId}`)
        socket.to(peerId).emit('candidate', socket.id, candidate)
      })

      socket.on('disconnecting', () => {
        console.log('disconnecting ' + socket.id)
        socket.rooms.forEach((roomId) => {
          socket.in(roomId).emit('peer-left-room', socket.id)
        })
      })

      socket.on('disconnect', () => {
        console.log('disconnect ' + socket.id)
      })
    })
  }

  handleSocketConnection()

  httpServer.listen(DEFAULT_PORT, () => callback(DEFAULT_PORT))
}

export default Server
