import { useRouter } from 'next/router'
import React from 'react'
import Layout from '../../components/layout'
import { RoomManager } from '../../contexts/roomManager'
import { SocketManager } from '../../contexts/socketManager'

const RoomPage = () => {
  const router = useRouter()
  const { roomId } = router.query
  const roomName = roomId as string

  return roomName ? (
    <Layout>
      <SocketManager>
        <RoomManager roomId={roomName} />
      </SocketManager>
    </Layout>
  ) : null
}

export default RoomPage
