import { Server } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { ActiveRoom, ActiveUser } from './types'

let io: SocketIOServer
let activeUsers: ActiveUser[] = []
let activeRooms: ActiveRoom[] = []

// every minute check to see if there are expired rooms to remove
setInterval(() => {
  const now = new Date().getTime()
  activeRooms = activeRooms.filter(r => r.destroyBy === undefined || r.destroyBy > now)
}, 60 * 1000)

const randId = () => '_' + Math.random().toString(36).substr(2, 9)

/** for now use this instead of looking up/verifying/retrieving room id  */
const toRoomId = (roomId: string) => roomId + '-room'

const getRoomPeerCount = async (roomId: string) => (io ? (await io.in(roomId).allSockets()).size : 0)

export const initializeSocketServer = (httpServer: Server) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_SERVER,
    },
  })

  io.on('connection', (socket: Socket) => {
    console.log(`connection ${socket.id}`)
    console.log(`ip address ${socket.handshake.address}`)
    // const existingUser = activeUsers.find(u => u.ipAddress === socket.handshake.address)
    // if (existingUser) {
    //   console.log(`user ${existingUser.id} will be disconnected because new socket connection has same IP`)
    //   const existingSocket = io.sockets.sockets.get(existingUser.socketId)
    //   existingSocket?.emit('duplicate-ip-error')
    //   if (existingSocket) existingSocket.disconnect()
    // }
    const userName = (socket.handshake.query as any).userName ?? null
    activeUsers.push({
      id: randId(),
      socketId: socket.id,
      ipAddress: socket.handshake.address,
      name: userName,
      room: null,
      inCall: false,
    })

    bindSocket(socket)
  })
}

export const getActiveUsers = () => activeUsers
export const getActiveRooms = () => activeRooms

const bindSocket = (socket: Socket) => {
  const currUser = () => activeUsers.find(u => u.socketId == socket.id)
  const setRoom = async (roomId: string | null) => {
    const activeUser = currUser()
    if (activeUser) {
      if (activeUser.room) {
        socket.leave(activeUser.room.id)

        // if no more users in room, set to destroy in 5 min
        const oldRoom = activeRooms.find(r => r.id === activeUser.room!.id)
        if (oldRoom) {
          const count = await getRoomPeerCount(oldRoom.id)
          if (count === 0) oldRoom.destroyBy = new Date().getTime() + 60 * 1000
        }
        activeUser.room = null
      }

      if (roomId) {
        const room = activeRooms.find(r => r.id === roomId)
        if (room) {
          room.destroyBy = undefined
          await socket.join(roomId)
          activeUser.room = room
          return activeUser.room
        } else console.error(`room ${roomId} not found`)
      }
    } else console.error('user not found')
    return null
  }
  const leaveRoom = async () => {
    const activeUser = currUser()
    if (activeUser && activeUser.room) {
      const roomId = activeUser.room.id
      console.log(`${activeUser.name} leaving room ${roomId}`)

      // let others in room know that peer left room
      socket.in(roomId).broadcast.emit('peer-left-room', activeUser)
      setRoom(null)
      activeUser.inCall = false
    }
  }

  socket.on('login', async (userName: string) => {
    const user = currUser()
    if (user) user.name = userName
    socket.emit('logged-in', user)
  })

  socket.on('set-username', async (userName: string) => {
    const user = currUser()
    if (user) {
      user.name = userName
      if (user.room) {
        socket.to(user.room.id).broadcast.emit('peer-changed-name', user.id, userName)
      }
    }
  })

  socket.on('create-room', async (roomName: string) => {
    console.log('create-room')
    //if (!activeRooms.some(r => r.createdBy === socket.id)) {
    const room = {
      id: randId(),
      name: roomName,
      createdBy: socket.id,
    }
    activeRooms.push(room)
    socket.emit('created-room', room.id)
    //}
  })

  socket.on('join-room', async (roomId: string) => {
    console.log('join-room')

    // if user is in a room, let peers know they are leaving
    leaveRoom()

    let activeUser = activeUsers.find(u => u.socketId === socket.id)
    if (activeUser) {
      await setRoom(roomId)
      if (activeUser.room) {
        console.log(`${activeUser.name} joined room ${activeUser.room.id}`)

        // let others in this room know that this peer has joined
        socket.to(activeUser.room.id).broadcast.emit('peer-joined-room', activeUser)

        // let this peer know which peers are already in this room/in call
        const peers = activeUsers.filter(u => u.room && u.room.id == activeUser!.room!.id && u.id !== activeUser?.id) //await getPeers(roomName)
        socket.emit('joined-room', activeUser, peers)
        return
      }
    }
    console.error('user failed to join room')
    socket.emit('join-room-failed')
  })

  socket.on('leave-room', () => {
    console.log('leave-room')
    leaveRoom()
  })

  socket.on('join-call', async () => {
    console.log('join-call')
    const activeUser = currUser()

    if (activeUser && activeUser.room) {
      console.log(`user ${activeUser.name} joining call in ${activeUser.room.id}`)
      activeUser.inCall = true
      // let others in room know that a peer is joining the call
      socket.in(activeUser.room.id).broadcast.emit('peer-joining-call', activeUser)
    } else console.error('user not found or room is null')
  })

  socket.on('leave-call', async () => {
    console.log('leave-call')
    const activeUser = currUser()
    if (activeUser && activeUser.room && activeUser.inCall) {
      console.log(`user ${activeUser.name} is leaving call in ${activeUser.room.id}`)
      // let others in room know that peer left call
      socket.in(activeUser.room.id).broadcast.emit('peer-left-call', activeUser)
      activeUser.inCall = false
    } else console.error('user not found or room null or not in call')
  })

  // when a client is notified that a new peer is joining the call,
  // they will send an offer to that peer and expect an answer in return
  socket.on('offer', (userId: string, offer: RTCSessionDescriptionInit) => {
    console.log('offer')
    // client wants to send an offer to a peer
    const activeUser = currUser()
    if (!activeUser || !activeUser.room || !activeUser.inCall) console.error('user not found or room null or not in call')
    else {
      const targetUser = activeUsers.find(u => u.id == userId && u.room && u.room.id === activeUser.room!.id && u.inCall)
      if (!targetUser) console.error('target user not found')
      else {
        console.log(`user ${activeUser.name} is sending an offer to ${targetUser.name}`)
        socket.to(targetUser.socketId).emit('offer', activeUser, offer)
      }
    }
  })

  socket.on('answer', (userId: string, offer: RTCSessionDescriptionInit) => {
    console.log('answer')
    // client wants to send an answer to a peer
    const activeUser = currUser()
    if (!activeUser || !activeUser.room || !activeUser.inCall) console.error('user not found or room null or not in call')
    else {
      const targetUser = activeUsers.find(u => u.id == userId && u.room && u.room.id === activeUser.room!.id && u.inCall)
      if (!targetUser) console.error('target user not found')
      else {
        console.log(`user ${activeUser.name} is sending an answer to ${targetUser.name}`)
        socket.to(targetUser.socketId).emit('answer', activeUser, offer)
      }
    }
  })

  socket.on('candidate', (id: string, candidate: RTCIceCandidate) => {
    console.log('candidate')
    const activeUser = currUser()
    if (!activeUser || !activeUser.room || !activeUser.inCall) console.error('user not found or room null or not in call')
    else {
      const targetUser = activeUsers.find(u => u.id == id && u.room && u.room.id === activeUser.room!.id && u.inCall)
      if (!targetUser) console.error('target user not found')
      else {
        console.log(`user ${activeUser.name} is sending a candidate to ${targetUser.name}`)
        socket.to(targetUser.socketId).emit('candidate', activeUser.id, candidate)
      }
    }
  })

  socket.on('disconnecting', () => {
    console.log('disconnecting')
    leaveRoom()
  })

  socket.on('disconnect', () => {
    console.log('disconnect ' + socket.id)
    const activeUser = currUser()
    if (activeUser) activeUsers = activeUsers.filter(u => u.id !== activeUser.id)
  })

  if (currUser()?.name !== '')
    socket.emit('logged-in', currUser())
}
