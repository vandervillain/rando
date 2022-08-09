import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSessionContext } from '../../providers/sessionProvider'

export default function RequireAuth({ children }: { children: JSX.Element }) {
  let { user } = useSessionContext()
  let location = useLocation()

  if (user === undefined) return <div>...</div>
  else if (user === null) return <Navigate to='/login' state={{ from: location }} replace />

  return children
}
