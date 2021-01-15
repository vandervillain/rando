import { Peer } from '../contexts/socketManager'
import PeerControl from './peerControl'

type PeerListProps = {
  peers: Peer[]
}

const PeerList = ({ peers }: PeerListProps) => {

  return (
    <div className='peer-list'>
      {peers &&
        peers.filter(p => p.id).map((p) => {
          return (
            <PeerControl key={p.id} peerId={p.id} inCall={p.inCall} isOutputting={p.isOutputting} />
          )
        })}
    </div>
  )
}

export default PeerList
