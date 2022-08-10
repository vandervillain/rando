import React from 'react'
import { SoundType, SoundOptions } from '../assets/sounds'
import { RoomPeer } from '../data/types'
import { useSettingsContext } from '../providers/userSettingsProvider'

const useAudio = (peers: RoomPeer[]) => {
  const settings = useSettingsContext()
  
  const play = (id: string, sound: SoundType) => {
    const {gain, muted} = settings.getUserSettings(id)
    if (muted) return
    const myAudio = new Audio(SoundOptions[sound])
    myAudio.volume = gain
    myAudio.play().catch(e => {})
  }

  return {
    playEnter: (id: string) => play(id, 'enter'),
    playLeave: (id: string) => play(id, 'leave'),
    playOn: (id: string) => play(id, peers.find(p => p.id === id)?.sound as SoundType ?? 'on'),
    playOff: (id: string) => play(id, 'off'),
    playCustom: (id: string, sound: SoundType) => play(id, sound),
  }
}

export default useAudio
