import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import { useSessionContext } from '../../contexts/sessionManager'

const CreateRoom = () => {
  const router = useRouter()
  const { socket } = useSessionContext()
  const [error, setError] = useState<string | null>(null)
  const roomnameRef = React.createRef<HTMLInputElement>()

  const unbindSocket = () => {
    if (!socket) return
    socket.off('created-room')
  }

  const bindSocket = () => {
    if (!socket) return
    socket.on('created-room', (roomId: string, err?: string) => {
      if (!err) router.push('/r/' + roomId)
    })
  }

  const submit = () => {
    const value = roomnameRef.current?.value
    if (!value) setError('')
    else if (socket) {
      socket.emit('create-room', value)
    }
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const getClass = () => (error ? 'error' : '')

  useEffect(() => {
    unbindSocket()
    bindSocket()

    return () => {
      unbindSocket()
    }
  }, [socket])

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
      <style jsx>{`
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
