import React, { FunctionComponent, useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import LoginControl from '../components/loginControl'
import { socketState, userState } from '../data/atoms'
import { SignalRWrapper } from '../data/signalr'

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
  const [socketReady, setSocketReady] = useState(signalr?.connected)

  console.log('sessionManager reload')
  console.log(`socketReady: ${socketReady}`)
  console.log(`userData: ${userData}`)
  
  const login = async (name: string) => {
    if (!signalr) return null
    console.log(`logging in as ${name}`)
    return await signalr.login(name)
  }

  useEffect(() => {
    if (!signalr) {
      signalr = new SignalRWrapper()
      signalr
        .connect(r => setSocketReady(r))
        .then(() => {
          console.log('signalr connected')
          signalr?.bindSessionEvents({
            onLoggedIn: user => setUserData({ ...userData, user }),
          })
        })
    }
  }, [])

  const renderChildren = () => children

  console.log(`socketReady: ${socketReady}`)
  console.log(`userData: ${userData}`)

  return (
    <AuthManagerContext.Provider
      value={{
        login,
        signalr,
      }}
    >
      {socketReady && !userData && <LoginControl />}
      {socketReady && userData && renderChildren()}
    </AuthManagerContext.Provider>
  )
}
