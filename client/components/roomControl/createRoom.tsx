import { useRouter } from 'next/router'
import React, { useState } from 'react'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'

const CreateRoom = () => {
  const router = useRouter()
  const [error, setError] = useState<boolean>(false)
  const roomnameRef = React.createRef<HTMLInputElement>()

  const submit = () => {
    const value = roomnameRef.current?.value
    if (!value) setError(true)
    else router.push('/r/' + value)
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='create-room'>
      <input ref={roomnameRef} onSubmit={submit} className={getClass()} type='text' placeholder='enter room name' onKeyDown={keyDown} />
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
      <style jsx>{`
        .create-room > * {
          float: left;
        }
        .create-room input[type='text'] {
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

export default CreateRoom
