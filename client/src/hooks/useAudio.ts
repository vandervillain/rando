import React from 'react'
import { SoundType, SoundOptions } from '../assets/sounds'

const useAudio = () => {
  const play = (sound: SoundType) => {
    console.debug(`playing ${sound}`)
    const myAudio = new Audio(SoundOptions[sound])
    myAudio.play().catch(e => {})
  }

  return {
    playEnter: () => play('enter'),
    playLeave: () => play('leave'),
    playOn: () => play('on'),
    playOff: () => play('off'),
    playCustom: (sound: SoundType) => play(sound),
  }
}

export default useAudio
