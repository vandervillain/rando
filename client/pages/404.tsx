import React from 'react'
import Layout from '../components/layout'
import Link from 'next/link'

export default function Custom404() {
  return (
    <Layout>
      <h2>404</h2>
      Where's the party, pal?
      <Link href='/'>
        <a>go home</a>
      </Link>
    </Layout>
  )
}
