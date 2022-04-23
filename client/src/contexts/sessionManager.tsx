import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import LoginControl from '../components/loginControl'
import { User } from '../data/types'
import { useSignalRContext } from './signalRManager'

type SessionContext = {
  user: User | null
  login: (name: string) => void
}

const url = process.env.SIGNALR_SERVER_URL

const Context = React.createContext<SessionContext | undefined>(undefined)

export const useSessionContext = (): SessionContext => {
  const context = React.useContext(Context)
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionContext')
  }
  return context
}

const localStorageKey = 'rando.user'

export const SessionProvider: FunctionComponent = ({ children }) => {
  console.debug('<SessionProvider />')

  const signalr = useSignalRContext()
  const [user, setUser] = useState<User | null>(null)

  const login = useCallback(
    async (name: string) => {
      if (user) return

      console.log(`logging in as ${name}`)
      const r = await fetch(`${url}/Login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: Math.random().toString(36).substr(2, 9),
          name,
        }),
      })
      const loggedInUser: User = await r.json()
      await signalr.connect(loggedInUser)

      setUser({
        id: loggedInUser.id,
        name: loggedInUser.name,
      })
    },
    [user]
  )

  // on start, try fetching cached user from localStorage
  useEffect(() => {
    console.debug('fetching user from localstorage')
    const cachedUserData = localStorage[localStorageKey]
    if (cachedUserData) {
      const userData = JSON.parse(cachedUserData) as User
      if (userData) {
        console.debug(`fetched user ${userData.id} from localstorage`)
        setUser(userData)
        if (!signalr.connected) signalr.connect(userData)
      } else localStorage.removeItem(localStorageKey)
    }
  }, [])

  // on user update, save in localstorage
  useEffect(() => {
    if (user) {
      console.debug(`saving user ${user?.id} to localstorage`)
      localStorage.setItem(localStorageKey, JSON.stringify(user))
    }
  }, [user])

  const sessionContext = useMemo(
    (): SessionContext => ({
      user,
      login,
    }),
    [login, user]
  )

  return (
    <Context.Provider value={sessionContext}>{user ? children : <LoginControl />}</Context.Provider>
  )
}
