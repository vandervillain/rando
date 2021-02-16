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
    <div className='callControl'>
      {!peer?.inCall && <button onClick={joinCall}>Join</button>}
      {peer?.inCall && (
        <>
          <button onClick={leaveCall}>Leave</button>
          {stream?.muted && <button onClick={() => muteUnmute(user.id, false)}>Unmute</button>}
          {!stream?.muted && <button onClick={() => muteUnmute(user.id, true)}>Mute</button>}
        </>
      )}
    </div>
  )
}

export default CallControl
