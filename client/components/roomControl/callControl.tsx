import { useStreamContext } from '../../contexts/streamManager'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import { useSessionContext } from '../../contexts/sessionManager'
import { useRoomContext } from '../../contexts/roomManager'

type CallControlProps = {
  joinCall: () => void
  leaveCall: () => void
}

const CallControl = ({ joinCall, leaveCall }: CallControlProps) => {
  const { user } = useSessionContext()
  const { room, currUserPeer } = useRoomContext()
  if (!user || !room || !currUserPeer) return null
  
  const { streams, muteUnmute } = useStreamContext()
  const stream = streams.find(s => s.id === user.id)
  return (
    <div className='call-control'>
      <div className='call-controls'>
        {!currUserPeer.inCall && (
          <Glyph
            className='join-call'
            options={{
              type: GlyphType.Call,
              size: 64,
              color: Colors.Gray,
            }}
            onHoverOptions={{ type: GlyphType.CallOut, color: Colors.Green }}
            onClick={joinCall}
          />
        )}
        {currUserPeer.inCall && (
          <Glyph
            className='leave-call'
            options={{
              type: GlyphType.Call,
              size: 64,
              color: Colors.Green,
            }}
            onHoverOptions={{
              type: GlyphType.CallIn,
            }}
            onClick={leaveCall}
          />
        )}
      </div>
      <div className='mic-controls'>
        {!currUserPeer.inCall && (
          <Glyph
            options={{
              type: GlyphType.Mic,
              size: 64,
              color: Colors.Dark,
            }}
          />
        )}
        {currUserPeer.inCall && stream?.muted && (
          <Glyph
            className='unmute'
            options={{
              type: GlyphType.Mute,
              size: 64,
              color: Colors.Gray,
            }}
            onHoverOptions={{
              color: Colors.Green,
            }}
            onClick={() => muteUnmute(user.id, false)}
          />
        )}
        {currUserPeer.inCall && !stream?.muted && (
          <Glyph
            className='mute'
            options={{
              type: GlyphType.Mic,
              size: 64,
              color: Colors.Green,
            }}
            onHoverOptions={{
              type: GlyphType.Mute
            }}
            onClick={() => muteUnmute(user.id, true)}
          />
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
