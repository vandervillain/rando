import React, { FunctionComponent, useCallback, useEffect, useState } from 'react'
import { User } from '../data/types'

type SessionContext = {
  user: User | null | undefined
  login: (name: string, avatar?: string, sound?: string) => Promise<void>
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

  const [user, setUser] = useState<User | null | undefined>(undefined)

  const login = useCallback(
    async (name: string, avatar?: string, sound?: string) => {
      console.log(`logging in as ${name} ${avatar} ${sound}`)
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
      setUser({
        id: loggedInUser.id,
        name: loggedInUser.name,
        avatar,
        sound,
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
        console.debug(`fetched user from localstorage`)
        console.debug(userData)
        setUser(userData)
      } else localStorage.removeItem(localStorageKey)
    } else setUser(null)
  }, [])

  // on user update, save in localstorage
  useEffect(() => {
    if (user) {
      console.debug(`saving user to localstorage`)
      console.debug(user)
      localStorage.setItem(localStorageKey, JSON.stringify(user))
    }
  }, [user])

  return (
    <Context.Provider
      value={{
        user,
        login,
      }}
    >
      {children}
    </Context.Provider>
  )
}
