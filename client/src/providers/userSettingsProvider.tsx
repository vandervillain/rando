import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import { UserSettings } from '../data/types'
import { useSessionContext } from './sessionProvider'

type UserSettingsContext = {
  getUserSettings: (id: string) => UserSettings
  saveUserGain: (id: string, gain: number) => void
  saveUserThreshold: (id: string, threshold: number) => void
  saveUserMuted: (id: string, muted: boolean) => void
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
let storageTimeout: NodeJS.Timeout
export const UserSettingsProvider: FunctionComponent = ({ children }) => {
  console.debug('<UserSettingsProvider />')
  const { user } = useSessionContext()
  const [settings, setSettings] = useState<UserSettings[]>(
    user
      ? [
          {
            id: user.id,
            threshold: 0.25,
            gain: 0.25,
            muted: false,
          },
        ]
      : []
  )

  const getUserSettings = useCallback(
    (id: string) => {
      let existing = settings.find(s => s.id === id)
      if (!existing) existing = getFromLocalStorage(id)
      if (!existing) {
        existing = {
          id,
          threshold: 0.25,
          gain: 0.25,
          muted: false,
        }
        const newState = [...settings, existing]
        setSettings(newState)
      }
      return existing
    },
    [settings]
  )

  const getFromLocalStorage = (id: string) => {
    const cachedUserSettings = localStorage[localStorageKey]
    if (!cachedUserSettings) return
    const userSettings = JSON.parse(cachedUserSettings) as UserSettings[]
    if (userSettings) return userSettings.find(s => s.id === id)
    else localStorage.removeItem(localStorageKey)
    return
  }

  const saveUserGain = useCallback(
    (id: string, gain: number) => {
      let update = [...settings]
      const existing = update.find(s => s.id === id)
      if (existing) existing.gain = gain
      else update.push({ id, gain, threshold: 0.25, muted: false })
      setSettings(update)
    },
    [settings]
  )

  const saveUserThreshold = useCallback(
    (id: string, threshold: number) => {
      let update = [...settings]
      const existing = update.find(s => s.id === id)
      if (existing) existing.threshold = threshold
      else update.push({ id, gain: 0.25, threshold, muted: false })
      setSettings(update)
    },
    [settings]
  )

  const saveUserMuted = useCallback(
    (id: string, muted: boolean) => {
      let update = [...settings]
      const existing = update.find(s => s.id === id)
      if (existing) existing.muted = muted
      else update.push({ id, gain: 0.25, threshold: 0.25, muted })
      setSettings(update)
    },
    [settings]
  )

  // on start, try fetching cached settings from localStorage
  useEffect(() => {
    const cachedUserSettings = localStorage[localStorageKey]
    if (cachedUserSettings) {
      const userSettings = JSON.parse(cachedUserSettings) as UserSettings[]
      if (
        !userSettings ||
        !userSettings.some ||
        userSettings.some(
          s => !s.id || s.gain === undefined || s.threshold === undefined || s.muted === undefined
        )
      )
        localStorage.removeItem(localStorageKey)
      else setSettings(userSettings)
    }
  }, [])

  // on settings update save in localstorage, use 1s timeout to prevent spam
  useEffect(() => {
    if (storageTimeout) clearTimeout(storageTimeout)
    storageTimeout = setTimeout(() => {
      localStorage.setItem(localStorageKey, JSON.stringify(settings))
    }, 1000)
  }, [settings])

  const sessionContext = useMemo(
    (): UserSettingsContext => ({
      getUserSettings,
      saveUserGain,
      saveUserThreshold,
      saveUserMuted
    }),
    [settings]
  )

  return <Context.Provider value={sessionContext}>{children}</Context.Provider>
}
