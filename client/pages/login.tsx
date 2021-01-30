import { useRouter } from 'next/router'
import React from 'react'
import Layout from '../components/layout'
import LoginControl from '../components/loginControl'

const Login = () => {
  const router = useRouter()

  return (
    <Layout>
      <LoginControl redirect={(router.query.redirect as string)}></LoginControl>
    </Layout>
  )
}

export default Login
