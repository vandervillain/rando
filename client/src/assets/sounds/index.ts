import on from './on.wav'
import off from './off.wav'
import enter from './enter.wav'
import leave from './leave.wav'
import shotgun from './shotgun.wav'
import akm from './akm.wav'
import pistol from './pistol.wav'
import pistol2 from './pistol2.wav'
import caw from './caw.wav'
import bison from './bison.wav'
import moo from './moo.wav'
import flyby from './flyby.wav'
import goat from './goat.wav'
import hyena from './hyena.wav'
import quack from './quack.wav'
import meow from './meow.wav'
import turkey from './turkey.wav'
import woof from './woof.wav'
import yooo from './yooo.wav'

export const SoundArray = [
  'akm',
  'bison',
  'caw',
  'enter',
  'flyby',
  'goat',
  'hyena',
  'leave',
  'meow',
  'moo',
  'off',
  'on',
  'pistol',
  'pistol2',
  'quack',
  'shotgun',
  'turkey',
  'woof',
  'yooo'
] as const
export type SoundType = typeof SoundArray[number]
export const SoundOptions: Record<SoundType, any> = {
    'enter': enter,
    'leave': leave,
    'off': off,
    'on': on,
    'shotgun': shotgun,
    'akm': akm,
    'pistol': pistol,
    'pistol2': pistol2,
    'flyby': flyby,
    'bison': bison,
    'caw': caw,
    'goat': goat,
    'hyena': hyena,
    'meow': meow,
    'moo': moo,
    'quack': quack,
    'turkey': turkey,
    'woof': woof,
    'yooo': yooo
}

// const importAll = (r: __WebpackModuleApi.RequireContext) => r.keys().map(r)
// export const sounds = importAll(require.context('./', false, /\.(mp3|wav)$/))
