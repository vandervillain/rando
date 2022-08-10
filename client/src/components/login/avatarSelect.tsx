import React from 'react'
import avatars from '../../assets/images/avatars'

type AvatarSelectProps = {
  selectAvatar: (src: any) => void
}

export default ({selectAvatar}: AvatarSelectProps) => (
  <div className='avatar-select'>
    {avatars.map((a: any) => (
      <img
        key={a}
        className='avatar'
        src={a}
        width={100}
        onClick={() => {
          selectAvatar(a)
        }}
      />
    ))}
  </div>
)
