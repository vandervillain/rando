import { SoundType } from "../../assets/sounds";

export type CustomProfile = { avatars: string[]; sounds: SoundType[] }
export const Custom: Record<string, CustomProfile> = {
  ronin: {
    avatars: ['Custom_Ronin_01.png', 'Custom_Ronin_02.png', 'Custom_Ronin_03.png'],
    sounds: ['yooo'],
  },
}
