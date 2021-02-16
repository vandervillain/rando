import React, { useState } from 'react'
import { useAuthContext } from '../contexts/authManager'

const LoginControl = () => {
  const [error, setError] = useState<boolean>(false)
  const usernameRef = React.createRef<HTMLInputElement>()
  const auth = useAuthContext()

  const submit = () => {
    const value = usernameRef.current?.value
    if (!value) setError(true)
    else auth.login(value)
  }

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='login'>
      <input ref={usernameRef} onSubmit={submit} className={getClass()} type='text' placeholder='enter user name' />
      <button onClick={submit}>Start</button>
      <style jsx>{`
        input.error {
          border-box: 0 0 2px 2px red;
        }
      `}</style>
    </div>
  )
}

export default LoginControl
