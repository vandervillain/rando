import express, { Application } from 'express'
import { createServer, Server as HTTPServer } from 'http'
import { config } from 'dotenv'
import { initializeSocketServer, getActiveUsers, getActiveRooms } from './socket'

const startServer = (callback: (port: number) => void) => {
  // load env variables
  config()

  const app: Application = express()
  const httpServer: HTTPServer = createServer(app)
  const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000

  app.get('/users', (req, res) => {
    if (req.query.pass === process.env.ADMIN_PASSWORD)
      res.json(getActiveUsers())
    else {
      res.status(404).send("Sorry, can't find that.")
    }
  })

  app.get('/rooms', (req, res) => {
    if (req.query.pass === process.env.ADMIN_PASSWORD)
      res.json(getActiveRooms())
    else {
      res.status(404).send("Sorry, can't find that.")
    }
  })

  httpServer.listen(DEFAULT_PORT, () => callback(DEFAULT_PORT))

  initializeSocketServer(httpServer)
}

startServer((port: number) => {
  console.log(`Server is listening on http://localhost:${port}`)
})
