import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage, RoomPage, Custom404 } from './routes'
import './app.css'

export default () => {
  console.log('app render')
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/r/:id' element={<RoomPage />} />
        <Route path='*' element={<Custom404 />} />
      </Routes>
    </BrowserRouter>
  )
}
