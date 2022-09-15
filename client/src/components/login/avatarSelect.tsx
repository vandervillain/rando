import React, { useMemo } from 'react'

type AvatarSelectProps = {
  avatars: Record<string, any>
  filter: string[] | undefined
  selectAvatar: (src: any) => void
}

export default ({avatars, filter, selectAvatar }: AvatarSelectProps) => {

  const filteredAvatars = useMemo(
    () =>
      Object.keys(avatars)
        .filter((k: any) => {
          if (!filter && k.startsWith('Custom')) return false
          if (filter) return filter.some(f => f === k)
          return true
        })
        .map((k: any) => (
          <img
            key={k}
            className='avatar'
            src={avatars[k]}
            width={100}
            onClick={() => {
              selectAvatar(avatars[k])
            }}
          />
        )),
    [filter]
  )

  return <div className='avatar-select'>{filteredAvatars}</div>
}
