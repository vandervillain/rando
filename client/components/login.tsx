import React, { useState } from 'react'

type LoginProps = {
  login: (username: string) => void
}

const Login = ({ login }: LoginProps) => {
  const [error, setError] = useState<boolean>(false)
  const usernameRef = React.createRef<HTMLInputElement>()

  const onClick = (e: React.MouseEvent) => {
    const value = usernameRef.current?.value
    if (!value) setError(true)
    else login(value)
  }

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='login'>
      <input ref={usernameRef} className={getClass()} type='text' placeholder='enter user name' />
      <button onClick={onClick}>Start</button>
      <style jsx>{`
        input.error {
          border-box: 0 0 2px 2px red;
        }
      `}</style>
    </div>
  )
}

export default Login
