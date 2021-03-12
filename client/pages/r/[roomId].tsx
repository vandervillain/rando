import { useRouter } from 'next/router'
import React from 'react'
import Layout from '../../components/layout'
import { RoomManager } from '../../contexts/roomManager'

const RoomPage = () => {
  const router = useRouter()
  const { roomId } = router.query
  const roomName = roomId as string

  return roomName ? (
    <Layout>
      <RoomManager roomId={roomName} />      
    </Layout>
  ) : null
}

export default RoomPage
