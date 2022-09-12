import React from 'react'
import { SoundType, SoundOptions } from '../assets/sounds'

const useAudio = (
  getUserSettings: (id: string) => { gain: number; muted: boolean }
) => {
  const play = (id: string, sound: SoundType) => {
    const { gain, muted } = getUserSettings(id)
    if (muted) return
    const myAudio = new Audio(SoundOptions[sound])
    myAudio.volume = gain
    myAudio.play().catch(e => {})
  }

  return {
    playEnter: (id: string) => play(id, 'enter'),
    playLeave: (id: string) => play(id, 'leave'),
    playOn: (id: string, sound?: SoundType) => play(id, sound ?? 'on'),
    playOff: (id: string) => play(id, 'off'),
    playCustom: (id: string, sound: SoundType) => play(id, sound),
  }
}

export default useAudio
