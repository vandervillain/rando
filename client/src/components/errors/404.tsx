import React from 'react'
import { Link } from 'react-router-dom'

export default function Custom404() {
  return (
    <div className='error-page'>
      <h2>404</h2>
      <p>A leader can't lead 'til he knows where he's going.</p>
      <Link to='..'>we have to go back!</Link>
    </div>
  )
}
