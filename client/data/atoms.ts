import { atom, DefaultValue, selector, selectorFamily } from 'recoil'
import { PeerStreamModel } from './stream'
import { UserData, Room } from './types'

const localStorageEffect = (key: string) => ({ setSelf, onSet }: any) => {
  if (typeof window !== 'undefined') {
    const savedValue = localStorage.getItem(key)
    if (savedValue != null) {
      setSelf(JSON.parse(savedValue))
    }
  }

  onSet((newValue: any) => {
    if (typeof window !== 'undefined') {
      if (newValue instanceof DefaultValue) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, JSON.stringify(newValue))
      }
    }
  })
}

export const userState = atom<UserData>({
  key: 'userState',
  default: {
    user: null,
    settings: {
      threshold: 0.25,
      gain: 0.25,
    },
  },
  effects_UNSTABLE: [localStorageEffect('user')],
})

export const roomState = atom<Room | null>({
  key: 'roomState',
  default: null,
})

export const streamState = atom<PeerStreamModel[]>({
  key: 'streamState',
  default: [],
})

export const micTestState = atom<boolean>({
  key: 'micTestState',
  default: false
})

export const userSelect = selector({
  key: 'userSelect',
  get: ({ get }) => {
    const userS = get(userState)
    return userS?.user
  },
})

export const userSettingsSelect = selector({
  key: 'userSettingsSelect',
  get: ({ get }) => {
    const userS = get(userState)
    return userS?.settings
  },
})

export const streamSelect = selectorFamily({
  key: 'streamSelect',
  get: (id: string) => ({ get }) => {
    const streamS = get(streamState)
    return streamS.find(s => s.id === id) ?? null
  },
})

export const roomSelect = selector({
  key: 'roomSelect',
  get: ({ get }) => {
    return get(roomState)
  },
})

export const roomPeerSelect = selectorFamily({
  key: 'roomPeerSelect',
  get: (id: string | undefined) => ({ get }) => {
    if (id === undefined) return null
    const roomS = get(roomState)
    return roomS?.peers.find(p => p.id === id) ?? null
  },
})