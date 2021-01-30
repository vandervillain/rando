import { RoomPeer } from '../contexts/roomManager'

type CallControlProps = {
  currUser: RoomPeer
  joinCall: () => void
  leaveCall: () => void
  setMute: (mute: boolean) => void
}

const CallControl = ({ currUser, joinCall, leaveCall, setMute }: CallControlProps) => {
  return (
    <div className='callControl'>
      {!currUser.inCall && <button onClick={joinCall}>Join</button>}
      {currUser.inCall && (
        <>
          <button onClick={leaveCall}>Leave</button>
          {currUser.isMuted && <button onClick={() => setMute(false)}>Unmute</button>}
          {!currUser.isMuted && <button onClick={() => setMute(true)}>Mute</button>}
        </>
      )}
    </div>
  )
}

export default CallControl
