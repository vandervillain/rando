import { RoomPeer } from '../contexts/roomManager'
import PeerControl from './peerControl'

type PeerListProps = {
  peers: RoomPeer[],
  currUserId: string
}

const PeerList = ({ peers, currUserId }: PeerListProps) => {

  return (
    <div className='peer-list'>
      {peers &&
        peers.filter(p => p.id).map((p) => {
          return (
            <PeerControl key={p.id} peer={p} isCurrUser={currUserId === p.id} />
          )
        })}
    </div>
  )
}

export default PeerList
