import React, { FunctionComponent } from 'react'
import { SessionProvider } from '../contexts/sessionManager'
import { RTCConnectionManager } from '../contexts/rtcConnectionManager'
import { StreamProvider } from '../contexts/streamManager'
import Colors from '../helpers/colors'
import { SignalRProvider } from '../contexts/signalRManager'
import { UserSettingsProvider } from '../contexts/userSettingsManager'

const Layout: FunctionComponent = ({ children }) => {
  return (
    <div className='container'>
      <main>
        <SignalRProvider>
          <SessionProvider>
            <UserSettingsProvider>
              <StreamProvider>
                <RTCConnectionManager>{children}</RTCConnectionManager>
              </StreamProvider>
            </UserSettingsProvider>
          </SessionProvider>
        </SignalRProvider>
      </main>
      <footer></footer>

      <style>{`
        .container {
          background-color: black;
          color: white;
          min-height: 100vh;
          padding: 0 0.5rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 5rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        footer {
          width: 100%;
          height: 100px;
          border: none;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        footer img {
          margin-left: 0.5rem;
        }

        footer a {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          max-width: 800px;
          margin-top: 3rem;
        }

        @media (max-width: 600px) {
          .grid {
            width: 100%;
            flex-direction: column;
          }
        }
      `}</style>

      <style>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu,
            Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        h2 {
          text-align: center;
        }

        a {
          color: ${Colors.Green};
          text-decoration: none;
        }
      `}</style>
    </div>
  )
}
export default Layout
