import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './app.css'
import Custom404 from './components/404'
import { RequireAuth } from './components/auth'
import { SessionProvider } from './providers/sessionProvider'

const HomePage = React.lazy(() => import('./components/home/homePage'))
const RoomPage = React.lazy(() => import('./components/room/roomPage'))
const LoginPage = React.lazy(() => import('./components/auth/loginPage'))

export default () => {
  return (
    <div className='container'>
      <SessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path='/login' element={<LoginPage />} />
            <Route
              path='/'
              element={
                <RequireAuth>
                  <React.Suspense fallback={<>...</>}>
                    <HomePage />
                  </React.Suspense>
                </RequireAuth>
              }
            />
            <Route
              path='/r/:id'
              element={
                <RequireAuth>
                  <React.Suspense fallback={<>...</>}>
                    <RoomPage />
                  </React.Suspense>
                </RequireAuth>
              }
            />
            <Route path='*' element={<Custom404 />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </div>
  )
}
