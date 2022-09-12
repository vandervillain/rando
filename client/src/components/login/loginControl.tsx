import React, { useState } from 'react'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import Avatar from '../../assets/images/avatar.png'
import { AvatarSelect } from '.'
import useAudio from '../../hooks/useAudio'
import { SoundType } from '../../assets/sounds'

type LoginControlProps = {
  signIn: (username: string, avatar?: string, sound?: string) => void
}

export const EntranceSounds = [
  'on',
  'enter',
  'akm',
  'pistol',
  'pistol2',
  'shotgun',
  'goat',
  'hyena',
  'meow',
  'moo',
  'quack',
  'turkey',
  'woof',
] as const

const LoginControl = ({ signIn }: LoginControlProps) => {
  const [avatar, setAvatar] = useState<any>()
  const [sound, setSound] = useState<string>('on')
  const [selectingAvatar, setSelectingAvatar] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)
  const usernameRef = React.createRef<HTMLInputElement>()

  const audio = useAudio(() => ({ gain: 1, muted: false }))

  const submit = async () => {
    const value = usernameRef.current?.value
    if (!value) setError(true)
    else await signIn(value, avatar, sound)
  }

  const playSound = (sound: SoundType) => {
    audio.playCustom('', sound)
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const getClass = () => (error ? 'error' : '')

  return (
    <div className='login'>
      <h2>who are you?</h2>
      <div className='input'>
        <img
          className='avatar'
          src={avatar ? avatar : Avatar}
          width='100px'
          height='100px'
          onClick={() => {
            setSelectingAvatar(!selectingAvatar)
          }}
        />
        <div className='inputs'>
          <div className='line'>
            <input
              ref={usernameRef}
              onSubmit={submit}
              className={getClass()}
              type='text'
              placeholder='enter user name'
              onKeyDown={keyDown}
              maxLength={32}
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
          <div className='line'>
            <select
              placeholder='entrance'
              defaultValue={sound}
              onChange={e => {
                playSound(e.currentTarget.value as SoundType)
                setSound(e.currentTarget.value)
              }}
            >
              {EntranceSounds.map(s => (
                <option key={s} value={s}>
                  {s === 'on' ? 'default entrance sound' : s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {selectingAvatar && (
        <AvatarSelect
          selectAvatar={a => {
            setAvatar(a)
            setSelectingAvatar(false)
          }}
        />
      )}
    </div>
  )
}

export default LoginControl
