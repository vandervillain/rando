import React, { FunctionComponent } from 'react'
import { useRecoilState } from 'recoil'
import { userState } from '../data/atoms'
import { User } from '../data/types'

type AuthContext = {
  login: (name: string) => void
}

const AuthManagerContext = React.createContext<AuthContext>({
  login: (name: string) => {}
})

export const useAuthContext = () => React.useContext(AuthManagerContext)

export const AuthManager: FunctionComponent = ({ children }) => {
  const [userData, setUserData] = useRecoilState(userState)

  const login = (name: string) => {
    const user: User = {
      id: randId(),
      name: name,
    }
    setUserData({...userData, user})
  }

  const randId = () => '_' + Math.random().toString(36).substr(2, 9)


  return (
    <AuthManagerContext.Provider
      value={{
        login
      }}
    >
      {children}
    </AuthManagerContext.Provider>
  )
}
