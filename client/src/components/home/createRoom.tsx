import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import { useSignalRContext } from '../../providers/signalRProvider'

const CreateRoom = () => {
  console.debug('<CreateRoom />')

  const navigate = useNavigate()
  const signalr = useSignalRContext()
  const [error, setError] = useState<string | null>(null)
  const roomnameRef = React.createRef<HTMLInputElement>()

  const submit = async () => {
    const value = roomnameRef.current?.value
    if (!value) setError('must enter a room name!')
    else if (signalr) {
      const roomId = await signalr.createRoom(value)
      console.log(`route to /r/${roomId}`)
      navigate(`/r/${roomId}`)
    }
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <div className='create-room'>
      <h2>create a room</h2>
      <div className='input'>
        <input
          ref={roomnameRef}
          onSubmit={submit}
          className={error ? 'error' : ''}
          type='text'
          placeholder='enter room name'
          onKeyDown={keyDown}
          maxLength={64}
        />
        <Glyph
          className='submit'
          options={{
            type: GlyphType.Submit,
            size: 32,
            color: Colors.Gray,
            viewBox: '4 4 24 24',
          }}
          onHoverOptions={{ color: Colors.Light }}
          onClick={submit}
        />
      </div>
      <div className='error-msg'>{error}</div>
    </div>
  )
}

export default CreateRoom
