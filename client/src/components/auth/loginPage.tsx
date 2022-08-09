import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionContext } from '../../providers/sessionProvider'
import LoginControl from './loginControl'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSessionContext()

  const from = (location.state as any)?.from?.pathname || '/'

  const signIn = async (username: string, avatar?: string, sound?: string) => {
    await session.login(username, avatar, sound)
    navigate(from, { replace: true })
  }

  return <LoginControl signIn={signIn} />
}
export default LoginPage
