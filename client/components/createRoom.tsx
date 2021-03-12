import { useRouter } from 'next/router'
import React, { useState } from 'react'

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
      <button onClick={submit}>Start</button>
      <style jsx>{`
        input.error {
          border-box: 0 0 2px 2px red;
        }
      `}</style>
    </div>
  )
}

export default CreateRoom
