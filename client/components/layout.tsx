import Head from 'next/head'
import React, { FunctionComponent } from 'react'
import { SessionManager } from '../contexts/sessionManager'
import { RTCConnectionManager } from '../contexts/rtcConnectionManager'
import { StreamManager } from '../contexts/streamManager'
import { RecoilRoot } from 'recoil'
import Colors from '../helpers/colors'

const Layout: FunctionComponent = ({ children }) => {
  return (
    <div className='container'>
      <Head>
        <title>rando</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <main>
        <RecoilRoot>
          <SessionManager>
            <StreamManager>
              <RTCConnectionManager>{children}</RTCConnectionManager>
            </StreamManager>
          </SessionManager>
        </RecoilRoot>
      </main>
      <footer>
      </footer>

      <style jsx>{`
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
          border-top: 1px solid #eaeaea;
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

      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
            sans-serif;
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
