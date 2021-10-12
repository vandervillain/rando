import React, { FunctionComponent, useEffect, useState } from 'react'
import { useRecoilState } from 'recoil'
import LoginControl from '../components/loginControl'
import { userState } from '../data/atoms'
import { SignalRWrapper } from '../data/signalr'

type SessionContext = {
  login: (name: string) => void
  signalr: SignalRWrapper | null
}

const AuthManagerContext = React.createContext<SessionContext>({
  login: (name: string) => {},
  signalr: null,
})

export const useSessionContext = () => React.useContext(AuthManagerContext)

let signalr: SignalRWrapper = new SignalRWrapper()
export const SessionManager: FunctionComponent = ({ children }) => {
  const [userData, setUserData] = useRecoilState(userState)
  const [socketReady, setSocketReady] = useState(signalr?.connected)

  console.log('sessionManager reload')
  console.log(`socketReady: ${socketReady}`)
  console.log(`user: ${userData.user?.id}, ${userData.user?.name}`)

  const login = async (name: string) => {
    console.log(`logging in as ${name}`)
    var user = await signalr.login(name)
    setUserData({ ...userData, user })
  }

  useEffect(() => {
    if (userData.user && userData.user.id && userData.user.name)
      signalr.connect(userData.user.id, ready => {
        if (ready && userData.user?.name)
          signalr.setUserName(userData.user.name)
        setSocketReady(ready)
      })
  }, [userData.user?.id])

  return (
    <AuthManagerContext.Provider
      value={{
        login,
        signalr,
      }}
    >
      {socketReady && !userData && <LoginControl />}
      {socketReady && userData && children}
    </AuthManagerContext.Provider>
  )
}
