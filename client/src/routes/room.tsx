import React from 'react'
import { useParams } from 'react-router-dom'
import { Header } from '../components/header'
import Layout from '../components/layout'
import { RoomManager } from '../components/roomManager'

const RoomPage = () => {
  const { id } = useParams()
  return id ? (
    <Layout>
      <Header />
      <RoomManager roomId={id} />
    </Layout>
  ) : null
}

export default RoomPage
