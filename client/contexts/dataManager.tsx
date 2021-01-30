import React, { FunctionComponent } from 'react'
import { User } from './authManager'

type DataContext = {
  getUserData: () => UserData
  saveUser: (user: User) => void
  saveThreshold: (t: number) => void
  saveGain: (g: number) => void
}

export type UserData = {
  user: User | null
  settings: {
    threshold: number
    gain: number
  }
}

const defaultUserData = () => ({
  user: null,
  settings: {
    threshold: 0.25,
    gain: 0.25,
  },
})

const DataManagerContext = React.createContext<DataContext>({
  getUserData: () => defaultUserData(),
  saveUser: (user: User) => {},
  saveThreshold: (t: number) => {},
  saveGain: (g: number) => {},
})

export const useDataContext = () => React.useContext(DataManagerContext)

let userData: UserData
export const DataManager: FunctionComponent = ({ children }) => {
  const datakey = 'userData'

  const getUserData = () => {
    if (userData) return userData
    if (typeof window !== 'undefined') {
      const cachedUser = localStorage.getItem(datakey)
      if (cachedUser) {
        userData = JSON.parse(cachedUser) as UserData
      }
    }
    if (!userData) userData = defaultUserData()
    return userData
  }

  const saveUser = (user: User) => {
    const data = getUserData()
    data.user = user
    localStorage.setItem(datakey, JSON.stringify(data))
    userData = data
  }

  const saveThreshold = (t: number) => {
    const data = getUserData()
    data.settings.threshold = t
    localStorage.setItem(datakey, JSON.stringify(data))
    userData = data
  }

  const saveGain = (g: number) => {
    const data = getUserData()
    data.settings.gain = g
    localStorage.setItem(datakey, JSON.stringify(data))
    userData = data
  }

  return (
    <DataManagerContext.Provider
      value={{
        getUserData,
        saveUser,
        saveThreshold,
        saveGain,
      }}
    >
      {children}
    </DataManagerContext.Provider>
  )
}
