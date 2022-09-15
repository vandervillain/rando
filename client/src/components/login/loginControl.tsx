import React, { useEffect, useState } from 'react'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import Avatar from '../../assets/images/avatar.png'
import { AvatarSelect } from '.'
import { Custom, CustomProfile } from './custom'
import SoundSelect from './soundSelect'
import avatars from '../../assets/images/avatars'

type LoginControlProps = {
  signIn: (username: string, avatar?: string, sound?: string) => void
}

const LoginControl = ({ signIn }: LoginControlProps) => {
  const [avatar, setAvatar] = useState<any>()
  const [sound, setSound] = useState<string>('on')
  const [selectingAvatar, setSelectingAvatar] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)
  const [customProfile, setCustomProfile] = useState<CustomProfile>()
  const usernameRef = React.createRef<HTMLInputElement>()

  const submit = async () => {
    const value = usernameRef.current?.value
    if (!value) setError(true)
    else await signIn(value, avatar, sound)
  }

  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  const getClass = () => (error ? 'error' : '')

  useEffect(() => {
    if (customProfile) {
      setAvatar(avatars[customProfile.avatars[0]])
      setSound(customProfile.sounds[0])
      setSelectingAvatar(true)
    } else if (!customProfile) setAvatar(undefined)
  }, [customProfile])

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
              onInput={e => {
                const value = (e.currentTarget as HTMLInputElement)?.value
                if (value && Custom[value.toLocaleLowerCase()])
                  setCustomProfile(Custom[value.toLocaleLowerCase()])
                else setCustomProfile(undefined)
              }}
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
            <SoundSelect
              filter={customProfile?.sounds}
              selectSound={s => {
                setSound(s)
              }}
            />
          </div>
        </div>
      </div>
      {selectingAvatar && (
        <AvatarSelect
          avatars={avatars}
          filter={customProfile?.avatars}
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
