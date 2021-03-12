import { useRecoilValue } from 'recoil'
import { useStreamContext } from '../contexts/streamManager'
import { roomPeerSelect, streamSelect, userSelect } from '../data/atoms'
import { Glyph, GlyphType } from './glyph'
import Colors from '../helpers/colors'

type CallControlProps = {
  joinCall: () => void
  leaveCall: () => void
}

const CallControl = ({ joinCall, leaveCall }: CallControlProps) => {
  const user = useRecoilValue(userSelect)
  if (!user) return null

  const peer = useRecoilValue(roomPeerSelect(user.id))
  const stream = useRecoilValue(streamSelect(user.id))
  const { muteUnmute } = useStreamContext()

  return (
    <div className='call-control'>
      <div className='call-controls'>
        {!peer?.inCall && <Glyph className='join-call' type={GlyphType.Call} size={64} color={Colors.Green} onClick={joinCall} />}
        {peer?.inCall && <Glyph className='leave-call' type={GlyphType.Call} size={64} color={Colors.Red} onClick={leaveCall} />}
      </div>
      <div className='mic-controls'>
        {!peer?.inCall && (
          <Glyph type={GlyphType.Mic} size={64} color={Colors.Dark} />
        )}
        {peer?.inCall && stream?.muted && (
          <Glyph className='unmute' type={GlyphType.Mute} size={64} color={Colors.Gray} onClick={() => muteUnmute(user.id, false)} />
        )}
        {peer?.inCall && !stream?.muted && (
          <Glyph className='mute' type={GlyphType.Mic} size={64} color={Colors.Green} onClick={() => muteUnmute(user.id, true)} />
        )}
      </div>
      <style jsx>{`
        .call-control {
          text-align: center;
          padding: 25px;
        }
        .call-control > * {
          display: inline-block;
          padding: 0 25px;
        }
      `}</style>
    </div>
  )
}

export default CallControl
