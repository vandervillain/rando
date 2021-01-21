import React, { FunctionComponent, useState } from 'react'
import Login from '../components/login'
import { useDataContext } from './dataManager'

type AuthContext = {
  getUser: () => User | null
}

export const AuthManagerContext = React.createContext<AuthContext>({
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

  const getUser = () => {
    if (authState.user) return authState.user
    else return data.getUserData().user
  }

  const setUser = (user: User) => {
    data.saveUser(user)
    setAuthState({ user: user })
  }

  const randId = () => '_' + Math.random().toString(36).substr(2, 9)

  const loginUser = (username: string) => {
    const user: User = {
      id: randId(),
      name: username,
    }
    setUser(user)
  }

  return (
    <AuthManagerContext.Provider
      value={{
        getUser,
      }}
    >
      <>
        {children}
        {!getUser() && <Login login={loginUser} />}
      </>
    </AuthManagerContext.Provider>
  )
}
