import React, { useState } from 'react'
import { useNavigate } from "react-router-dom";
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import { useSignalRContext } from '../../providers/signalRProvider'

const CreateRoom = () => {
  const navigate = useNavigate()
  const signalr = useSignalRContext()
  const [error, setError] = useState<string | null>(null)
  const roomnameRef = React.createRef<HTMLInputElement>()

  console.debug('<CreateRoom />')

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

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='create-room'>
      <h2>create a room</h2>
      <div className='input'>
        <input ref={roomnameRef} onSubmit={submit} className={getClass()} type='text' placeholder='enter room name' onKeyDown={keyDown} maxLength={200} />
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
      <div style={{ color: Colors.Red }}>{error}</div>
      <style>{`
        .create-room .input > * {
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
