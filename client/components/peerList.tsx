import { CSSProperties } from "react"
import { Peer } from "../pages/app"

type PeerListProps = {
  peers: Peer[]
}

const getBold: any = (inCall: boolean) => {
  if (inCall) return {
    fontWeight: 'bold'
  } as CSSProperties
  else return null
}

const PeerList = ({ peers }: PeerListProps) => {

  const renderMute = () => (
    <button>mute</button>
  )
  
  return (
    <div className="peer-list">
      {peers &&
        peers.map((p) => {
          return (
            <div key={p.id} style={getBold(p.inCall)}>
              {p.id}
              {renderMute()}
            </div>
          )
        })}
    </div>
  )
}

export default PeerList
