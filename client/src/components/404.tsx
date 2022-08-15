import React from 'react'
import { Link } from 'react-router-dom'

export default function Custom404() {
  return (
    <div className='custom404'>
      <h2>404</h2>
      <p>Where's the party, pal?</p>
      <Link to='..'>go home</Link>
    </div>
  )
}
