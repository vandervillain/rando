import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import LoginControl from '../components/loginControl'
import { User, UserData, UserSettings } from '../data/types'

type SessionContext = {
  user: User | null
  settings: UserSettings
  login: (name: string) => void
  setUserGain: (gain: number) => void
  setUserThreshold: (threshold: number) => void
}

const url = process.env.NEXT_PUBLIC_SERVER

const Context = React.createContext<SessionContext | undefined>(undefined)

export const useSessionContext = (): SessionContext => {
  const context = React.useContext(Context)
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionContext')
  }
  return context
}

export const SessionProvider: FunctionComponent = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    threshold: 0.25,
    gain: 0.25,
  })

  const login = useCallback(async (name: string) => {
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
    setUser({
      id: loggedInUser.id,
      name: loggedInUser.name
    })
  }, [user, settings])

  const setUserGain = (gain: number) => setSettings(prev => ({...prev, gain}))
  const setUserThreshold = (threshold: number) => setSettings(prev => ({...prev, threshold}))

  // on start, try fetching cached user from localStorage
  useEffect(() => {
    const cachedUserData = localStorage['userData']
    if (cachedUserData) {
      const userData = JSON.parse(cachedUserData) as UserData
      if (userData && userData.user && userData.settings) {
        setUser(userData.user)
        setSettings(userData.settings)
      }
      else localStorage.removeItem('userData')
    }
  }, [])

  // on user/settings update, save in localstorage
  useEffect(() => {
    const userData: UserData = {
      user,
      settings
    }
    localStorage.setItem('userData', JSON.stringify(userData))
  }, [user, settings])

  const sessionContext = useMemo(
    (): SessionContext => ({
      user,
      settings,
      login,
      setUserGain,
      setUserThreshold
    }),
    [login, user, settings]
  )

  return (
    <Context.Provider value={sessionContext}>{user ? children : <LoginControl />}</Context.Provider>
  )
}
