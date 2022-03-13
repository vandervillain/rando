import React, { useState } from 'react'
import { useSessionContext } from '../contexts/sessionManager'
import { Glyph, GlyphType } from './glyph'
import Colors from '../helpers/colors'

const LoginControl = () => {
  const [error, setError] = useState<boolean>(false)
  const usernameRef = React.createRef<HTMLInputElement>()
  const { login } = useSessionContext()

  const submit = () => {
    const value = usernameRef.current?.value
    if (!value) setError(true)
    else login(value)
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='login'>
      <h2>who are you?</h2>
      <div className="input">
      <input ref={usernameRef} onSubmit={submit} className={getClass()} type='text' placeholder='enter user name' onKeyDown={keyDown} maxLength={16} />
      <Glyph
        className='submit'
        options={{
          type: GlyphType.Submit,
          size: 32,
          color: Colors.Gray,
          viewBox: '4 4 24 24'
        }}
        onHoverOptions={{ color: Colors.Light }}
        onClick={submit}
      />
      </div>
      <style jsx>{`
        .login .input > * {
          float: left;
        }
        .login input[type='text'] {
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
