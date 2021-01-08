import { CSSProperties } from "react"
import { Peer } from "../pages/app"

type PeerListProps = {
  peers: Peer[]
  toggleMute: (id: string) => void
}

const getBold: any = (inCall: boolean) => {
  if (inCall) return {
    fontWeight: 'bold'
  } as CSSProperties
  else return null
}

const PeerList = ({ peers, toggleMute }: PeerListProps) => {

  const renderMute = (id: string) => (
    <button onClick={() => toggleMute(id)}>mute</button>
  )
  
  return (
    <div className="peer-list">
      {peers &&
        peers.map((p) => {
          return (
            <div key={p.id} style={getBold(p.inCall)}>
              {p.id}
              {renderMute(p.id)}
            </div>
          )
        })}
    </div>
  )
}

export default PeerList
