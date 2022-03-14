import React, { FunctionComponent, useEffect, useMemo, useState } from 'react'
import { UserSettings } from '../data/types'

type UserSettingsContext = {
  settings: UserSettings
  setUserGain: (gain: number) => void
  setUserThreshold: (threshold: number) => void
}

const Context = React.createContext<UserSettingsContext | undefined>(undefined)

export const useSettingsContext = (): UserSettingsContext => {
  const context = React.useContext(Context)
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a UserSettingsContext')
  }
  return context
}

const localStorageKey = 'rando.settings'
export const UserSettingsProvider: FunctionComponent = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>({
    threshold: 0.25,
    gain: 0.25,
  })

  const setUserGain = (gain: number) => setSettings(prev => ({ ...prev, gain }))
  const setUserThreshold = (threshold: number) => setSettings(prev => ({ ...prev, threshold }))

  // on start, try fetching cached settings from localStorage
  useEffect(() => {
    const cachedUserSettings = localStorage[localStorageKey]
    if (cachedUserSettings) {
      const userSettings = JSON.parse(cachedUserSettings) as UserSettings
      if (userSettings) {
        setSettings(userSettings)
      } else localStorage.removeItem(localStorageKey)
    }
  }, [])

  // on settings update, save in localstorage
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(settings))
  }, [settings])

  const sessionContext = useMemo(
    (): UserSettingsContext => ({
      settings,
      setUserGain,
      setUserThreshold,
    }),
    [settings]
  )

  return <Context.Provider value={sessionContext}>{children}</Context.Provider>
}
