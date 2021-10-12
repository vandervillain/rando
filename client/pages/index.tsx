import React from 'react'
import CreateRoom from '../components/roomControl/createRoom'
import Layout from '../components/layout'
import { Header } from '../components/header'

export default function Home() {  
  return (
    <Layout>
      <Header />
      <CreateRoom />
    </Layout>
  )
}
