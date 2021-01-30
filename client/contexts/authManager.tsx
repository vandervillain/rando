import { useRouter } from 'next/router'
import React, { FunctionComponent, useEffect, useState } from 'react'
import { useDataContext } from './dataManager'

type AuthContext = {
  login: (name: string, redirect: string) => void
  getUser: () => User | null
}

const AuthManagerContext = React.createContext<AuthContext>({
  login: (name: string, redirect: string) => {},
  getUser: () => null,
})

export const useAuthContext = () => React.useContext(AuthManagerContext)

type AuthContextState = {
  user: User | null
}

export type User = {
  id: string
  name: string
}

export const AuthManager: FunctionComponent = ({ children }) => {
  const [authState, setAuthState] = useState<AuthContextState>({ user: null })
  const data = useDataContext()
  const router = useRouter()

  const login = (name: string, redirect: string) => {
    const user: User = {
      id: randId(),
      name: name,
    }
    setUser(user)

    router.push(redirect)
  }

  const getUser = () => {
    if (authState.user) return authState.user
    else return data.getUserData().user
  }

  const setUser = (user: User) => {
    data.saveUser(user)
    setAuthState({ user: user })
  }

  const randId = () => '_' + Math.random().toString(36).substr(2, 9)

  useEffect(() => {
    if (!getUser()) {
      router.push(`/login?redirect=${router.pathname}`)
    }
  }, [authState.user])

  return (
    <AuthManagerContext.Provider
      value={{
        login,
        getUser,
      }}
    >
      {children}
    </AuthManagerContext.Provider>
  )
}
