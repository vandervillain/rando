import React from 'react'
import { useStreamContext } from '../../contexts/streamManager'
import { Glyph, GlyphType } from '../glyph'
import Colors from '../../helpers/colors'
import { useEffect } from 'react'

type MicControlProps = {
  peerId: string
  isCurrUser: boolean
  muted: boolean | undefined
}

const MicControl = ({ peerId, isCurrUser, muted }: MicControlProps) => {
  const { testingMic, setTestingMic } = useStreamContext()
  const { muteUnmute } = useStreamContext()

  const renderMute = () => {
    if (isCurrUser || muted === undefined) return null
    if (muted)
      return (
        <Glyph
          className='unmute'
          options={{
            type: GlyphType.Deafen,
            size: 32,
            color: Colors.Gray,
            style: { display: 'block' },
          }}
          onHoverOptions={{
            color: Colors.Green,
          }}
          onClick={() => muteUnmute(peerId, false)}
        />
      )
    else
      return (
        <Glyph
          className='mute'
          options={{
            type: GlyphType.Volume,
            size: 32,
            color: Colors.Green,
            style: { display: 'block' },
          }}
          onHoverOptions={{
            type: GlyphType.Deafen,
          }}
          onClick={() => muteUnmute(peerId, true)}
        />
      )
  }

  const renderTest = () => {
    if (!isCurrUser) return null
    if (testingMic)
      return (
        <Glyph
          className='stop-test'
          options={{
            type: GlyphType.Headphones,
            size: 32,
            color: Colors.Orange,
            style: { display: 'block' },
          }}
          onClick={() => setTestingMic(false)}
        />
      )
    else
      return (
        <Glyph
          className='test'
          options={{
            type: GlyphType.Headphones,
            size: 32,
            color: Colors.Gray,
            style: { display: 'block' },
          }}
          onHoverOptions={{
            color: Colors.Orange,
          }}
          onClick={() => setTestingMic(true)}
        />
      )
  }

  return (
    <div className='mic-control'>
      {renderMute()}
      {renderTest()}
    </div>
  )
}

export default MicControl
