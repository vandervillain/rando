import React, { FunctionComponent, useEffect } from 'react'
import { useRecoilState } from 'recoil'
import { io, Socket } from 'socket.io-client'
import { userState } from '../data/atoms'
import { SignalRWrapper } from '../data/signalr'
import { User } from '../data/types'

type SessionContext = {
  login: (name: string) => void
  signalr: SignalRWrapper | null
  //socket: Socket | null
}

const AuthManagerContext = React.createContext<SessionContext>({
  login: (name: string) => {},
  signalr: null,
  //socket: null,
})

export const useSessionContext = () => React.useContext(AuthManagerContext)

//let socket: Socket | null = null
let signalr: SignalRWrapper | null
export const SessionManager: FunctionComponent = ({ children }) => {
  const [userData, setUserData] = useRecoilState(userState)

  const login = async (name: string) => {
    if (!signalr) return null
    console.log(`logging in as ${name}`)
    return await signalr.login(name)
  }

  useEffect(() => {
    if (!signalr) {
      signalr = new SignalRWrapper()
      signalr.connect().then(() => {
        console.log('signalr connected')
        signalr?.bindSessionEvents({
          onLoggedIn: user => setUserData({ ...userData, user }),
        })
      })
    }
  }, [])

  return (
    <AuthManagerContext.Provider
      value={{
        login,
        signalr,
      }}
    >
      {children}
    </AuthManagerContext.Provider>
  )
}
