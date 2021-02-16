import { useRecoilValue } from 'recoil'
import { userSelect } from '../data/atoms'
import { RoomPeer } from '../data/types'
import PeerControl from './peerControl'

type PeerListProps = {
  peers: RoomPeer[]
}

const PeerList = ({ peers }: PeerListProps) => {
  const user = useRecoilValue(userSelect)
  const sorted = [...peers].sort((a, b) => {
    if (a.id === user?.id) return -1
    else if (b.id === user?.id) return 1 
    else return a.order > b.order ? 1 : -1
  })

  return (
    <div className='peer-list'>
      {sorted.map(p => {
        return <PeerControl key={p.id} peerId={p.id} />
      })}
    </div>
  )
}

export default PeerList
