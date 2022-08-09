import React from 'react'
import { useMemo } from 'react'
import { useRoomContext } from '../../providers/roomProvider'
import { useSessionContext } from '../../providers/sessionProvider'
import { PeerControl } from '../peerControl'

const PeerList = () => {
  const { user } = useSessionContext()
  const { room, peers } = useRoomContext()
  const sorted = useMemo(() => {
    if (!user || !room) return []

    return [...peers].sort((a, b) => {
      if (a.id === user?.id) return -1
      else if (b.id === user?.id) return 1
      else return a.order > b.order ? 1 : -1
    })
  }, [user, peers])

  return (
    <div className='peer-list'>
      {sorted.map(p => {
        return <PeerControl key={p.id} peerId={p.id} />
      })}
    </div>
  )
}

export default PeerList
