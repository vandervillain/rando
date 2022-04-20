import * as signalR from '@microsoft/signalr'
import { Room, RoomPeer, User } from './types'

export class SignalRWrapper {
  url = process.env.SIGNALR_SERVER_URL!
  connection: signalR.HubConnection | null = null
  connected: boolean = false

  private buildConnection(userId: string) {
    return new signalR.HubConnectionBuilder()
      .withAutomaticReconnect()
      .withUrl(this.url, {
        headers: {
          'x-ms-signalr-user-id': userId,
        },
      })
      .build()
  }

  login = async (name: string): Promise<User> => {
    const r = await fetch(`${this.url}/Login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: Math.random().toString(36).substr(2, 9),
        name
      })
    })
    return await r.json()
  }

  connect = (userId: string, setSocketReady: (r: boolean) => void): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!this.connection) {
        try {
          this.connection = this.buildConnection(userId)

          this.connection.onclose(() => {
            console.log('signalr connection closed')
            this.connected = false
            setSocketReady(false)
          })

          this.connection.onreconnecting(() => {
            console.log('signalr reconnecting')
          })

          this.connection.onreconnected(() => {
            console.log('signalr reconnected')
            this.connected = true
            setSocketReady(true)
          })

          this.connection
            .start()
            .then(() => {
              this.connected = true
              setSocketReady(true)
              console.info('signalr connection started at ' + this.url)
              resolve()
            })
            .catch(e => {
              console.error(e)
              console.error(`websocket connection failed to start at ${this.url}, retrying in 30 seconds`)
              this.connection?.stop()
              this.connected = false
              setSocketReady(false)
              this.connection = null
              setTimeout(() => this.connect(userId, setSocketReady), 30 * 1000)
            })
        } catch (e) {
          this.connected = false
          setSocketReady(false)
          console.error(e)
          reject()
        }
      }
    })

  async createRoom(roomName: string) {
    if (!this.connection) return
    console.log(`createRoom(${roomName})`)
    console.log(this.connection)
    return await this.connection.invoke('createRoom', roomName)
  }

  unbindRoomEvents() {
    if (!this.connection) return

    this.connection.off('joinedRoom')
    this.connection.off('joinRoomFailed')
    this.connection.off('peerJoiningCall')
    this.connection.off('offer')
    this.connection.off('answer')
    this.connection.off('candidate')
    this.connection.off('peerJoinedRoom')
    this.connection.off('peerLeftRoom')
    this.connection.off('peerLeftCall')
    this.connection.off('peerChangedName')
  }

  bindRoomEvents(e: IRoomEventHandlers) {
    if (!this.connection) return
    this.unbindRoomEvents()

    this.connection.on('joinedRoom', e.onJoinedRoom)
    this.connection.on('joinRoomFailed', e.onJoinRoomFailure)
    this.connection.on('peerJoiningCall', e.onPeerJoiningCall)
    this.connection.on('offer', e.onOffer)
    this.connection.on('answer', e.onAnswer)
    this.connection.on('candidate', e.onCandidate)
    this.connection.on('peerJoinedRoom', e.onPeerJoinedRoom)
    this.connection.on('peerLeftRoom', e.onPeerLeftRoom)
    this.connection.on('peerLeftCall', e.onPeerLeftCall)
    this.connection.on('peerChangedName', e.onPeerChangedName)
  }

  async setUserName(userName: string) {
    console.log(`set username to ${userName}`)
    if (this.connection) await this.connection.send('setUserName', userName)
  }

  async sendOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    console.log(`sending offer to ${peerId}`)
    if (this.connection) await this.connection.send('offer', peerId, offer)
  }

  async sendAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    console.log(`sending answer to ${peerId}`)
    if (this.connection) await this.connection.send('answer', peerId, answer)
  }

  async sendCandidate(peerId: string, candidate: RTCIceCandidate) {
    console.log(`sending candidate to ${peerId}`)
    if (this.connection) await this.connection.send('candidate', peerId, candidate)
  }

  async joinRoom(roomId: string) {
    console.log(`joining room ${roomId}`)
    if (this.connection) await this.connection.invoke('joinRoom', roomId)
  }

  async joinCall() {
    console.log(`joining call`)
    if (this.connection) await this.connection.invoke('joinCall')
  }

  async leaveCall() {
    console.log(`leaving call`)
    if (this.connection) await this.connection.invoke('leaveCall')
  }
}

export interface ISessionEventHandlers {
  onConnected: (user: User) => void
}

export interface IRoomEventHandlers {
  onJoinedRoom: (user: RoomPeer, room: Room, peers: RoomPeer[]) => void
  onJoinRoomFailure: () => void
  onPeerJoinedRoom: (peer: RoomPeer) => void
  onPeerJoiningCall: (peer: RoomPeer) => Promise<void>
  onPeerLeftRoom: (peer: RoomPeer) => void
  onPeerLeftCall: (peer: RoomPeer) => void
  onPeerChangedName: (peer: RoomPeer) => void
  onOffer: (peer: RoomPeer, offer: RTCSessionDescriptionInit) => Promise<void>
  onAnswer: (peer: RoomPeer, answer: RTCSessionDescriptionInit) => Promise<void>
  onCandidate: (id: string, candidate: RTCIceCandidate) => void
}
