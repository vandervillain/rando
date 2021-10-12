import React from 'react'
import { useRecoilState } from "recoil"
import { userState } from '../data/atoms'
import { UserData } from '../data/types'

export const Header = () => {
  const [userData] = useRecoilState<UserData>(userState)
  return (
    <div className={'header'}>
      {userData?.user?.name}
    </div>
  )
}