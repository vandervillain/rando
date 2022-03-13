import React from 'react'
import { useSessionContext } from '../contexts/sessionManager'

export const Header = () => {
  const {user} = useSessionContext()
  return (
    <div className={'header'}>
      {user?.name}
    </div>
  )
}