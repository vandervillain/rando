import React from 'react'
import { useStreamContext } from '../../providers/streamProvider'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import { useSessionContext } from '../../providers/sessionProvider'
import { useRoomContext } from '../../providers/roomProvider'

type CallControlProps = {
  joinCall: () => void
  leaveCall: () => void
}

const CallControl = ({ joinCall, leaveCall }: CallControlProps) => {
  const { user } = useSessionContext()
  const { currUserPeer } = useRoomContext()
  const { streams, muteUnmute } = useStreamContext()
  
  if (!user || !currUserPeer) return null
  
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
    </div>
  )
}

export default CallControl
