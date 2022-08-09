import React from 'react'
import { Link } from 'react-router-dom'

export default function Custom404() {
  return (
    <div className='404'>
      <h2>404</h2>
      Where's the party, pal?
      <Link to='..'>go home</Link>
    </div>
  )
}
