import { useRecoilValue } from "recoil"
import { useStreamContext } from "../contexts/streamManager"
import { roomPeerSelect, streamSelect, userSelect } from "../data/atoms"

type CallControlProps = {
  joinCall: () => void
  leaveCall: () => void
}

const CallControl = ({ joinCall, leaveCall }: CallControlProps) => {
  const user = useRecoilValue(userSelect)
  if (!user) return null

  const peer = useRecoilValue(roomPeerSelect(user.id))
  const stream = useRecoilValue(streamSelect(user.id))
  const {muteUnmute} = useStreamContext()

  return (
    <div className='call-control'>
      {!peer?.inCall && <button className="join-call" onClick={joinCall}>Join</button>}
      {peer?.inCall && (
        <>
          <button className="leave-call" onClick={leaveCall}>Leave</button>
          {stream?.muted && <button className='unmute' onClick={() => muteUnmute(user.id, false)}>Unmute</button>}
          {!stream?.muted && <button className='mute' onClick={() => muteUnmute(user.id, true)}>Mute</button>}
        </>
      )}
    </div>
  )
}

export default CallControl
