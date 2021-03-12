import React, { useState } from 'react'
import { useAuthContext } from '../contexts/authManager'
import { Glyph, GlyphType } from './glyph'
import Colors from '../helpers/colors'

const LoginControl = () => {
  const [error, setError] = useState<boolean>(false)
  const usernameRef = React.createRef<HTMLInputElement>()
  const auth = useAuthContext()

  const submit = () => {
    const value = usernameRef.current?.value
    if (!value) setError(true)
    else auth.login(value)
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='login'>
      <input ref={usernameRef} onSubmit={submit} className={getClass()} type='text' placeholder='enter user name' onKeyDown={keyDown} />
      <Glyph type={GlyphType.Submit} size={32} color={Colors.Gray} onClick={submit} />
      <style jsx>{`
        .login > * {
          float: left;
        }
        .login input[type=text] {
          height: 32px;
          margin-right: 5px;
          border: none;
          outline: none;
          border-radius: 3px;
        }
        input.error {
          border-box: 0 0 2px 2px red;
        }
      `}</style>
    </div>
  )
}

export default LoginControl
