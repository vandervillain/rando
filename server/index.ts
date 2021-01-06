import Server from './server'

Server((port: number) => {
  console.log(`Server is listening on http://localhost:${port}`)
})
