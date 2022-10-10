import React from 'react'
import { Link } from 'react-router-dom'

export default function ForcedOut() {
  return (
    <div className='error-page'>
      <h2>Byeee</h2>
      <p>If we can't live together, we're going to die alone.</p>
      <a
        onClick={() => {
          window.location.href = '/'
        }}
      >
        Don't tell me what I can't do!
      </a>
    </div>
  )
}
