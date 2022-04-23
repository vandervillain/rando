import React from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/layout'

export default function Custom404() {
  return (
    <Layout>
      <h2>404</h2>
      Where's the party, pal?
      <Link to="..">go home</Link>
    </Layout>
  )
}
