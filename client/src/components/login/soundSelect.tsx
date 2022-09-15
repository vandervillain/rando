import React, { useEffect } from 'react'
import { SoundType } from '../../assets/sounds'
import useAudio from '../../hooks/useAudio'

type SoundSelectProps = {
  filter: SoundType[] | undefined
  selectSound: (src: any) => void
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

export default ({ filter, selectSound }: SoundSelectProps) => {
  const audio = useAudio(() => ({ gain: 1, muted: false }))

  const playSound = (sound: SoundType) => {
    audio.playCustom('', sound)
  }

  useEffect(() => {
    if (filter) playSound(filter[0])
  }, [filter])

  return (
    <select
      placeholder='entrance'
      defaultValue={(filter ?? EntranceSounds)[0]}
      onChange={e => {
        playSound(e.currentTarget.value as SoundType)
        selectSound
      }}
    >
      {(filter ?? EntranceSounds).map(s => (
        <option key={s} value={s}>
          {s === 'on' ? 'default entrance sound' : s}
        </option>
      ))}
    </select>
  )
}
