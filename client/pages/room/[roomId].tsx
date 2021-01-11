import { useRouter } from 'next/router'
import React from 'react'
import Layout from '../../components/layout'
import Room from '../../components/room'

const RoomPage = () => {
  const router = useRouter()
  const { roomId } = router.query

  return (
    <Layout>
      <Room roomId={roomId as string} />
    </Layout>
  )
}

export default RoomPage