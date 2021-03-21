import React, { FunctionComponent, useEffect } from 'react'
import { useRecoilState } from 'recoil'
import { io, Socket } from 'socket.io-client'
import { userState } from '../data/atoms'
import { User } from '../data/types'

type SessionContext = {
  login: (name: string) => void
  socket: Socket | null
}

const AuthManagerContext = React.createContext<SessionContext>({
  login: (name: string) => {},
  socket: null,
})

export const useSessionContext = () => React.useContext(AuthManagerContext)

let socket: Socket | null = null
export const SessionManager: FunctionComponent = ({ children }) => {
  const [userData, setUserData] = useRecoilState(userState)

  const login = (name: string) => {
    socket?.emit('login', name)
  }

  const unbindSocket = () => {
    if (!socket) return
    socket.off('logged-in')
    socket.off('duplicate-ip-error')
  }
  const bindSocket = () => {
    if (!socket) return
    socket.on('logged-in', (user: User) => {
      setUserData({ ...userData, user })
    })
    socket.on('duplicate-ip-error', () => {
      console.log(`a user with your same ip address joined`)
    })
  }

  useEffect(() => {
    if (!socket) {
      bindSocket()
      
      const opts = userData.user?.name ? { query: 'userName=' + userData.user.name } : undefined
      socket = io(process.env.NEXT_PUBLIC_SERVER, opts)
    }
  }, [])

  useEffect(() => {
    unbindSocket()
    bindSocket()
  }, [userData])

  return (
    <AuthManagerContext.Provider
      value={{
        login,
        socket,
      }}
    >
      {children}
    </AuthManagerContext.Provider>
  )
}
