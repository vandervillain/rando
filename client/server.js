const dev = process.env.NODE_ENV !== 'production'
const { createServer } = dev ? require('http') : require('https')
const path = require('path')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const app = next({ dev })
const handle = app.getRequestHandler()

const getServerOptions = () => {
  try {
    const checks = [
      path.join(__dirname, 'certs/privkey.pem'),
      path.join(__dirname, '/certs/privkey.pem'),
      path.resolve(__dirname, 'certs/privkey.pem'),
      path.resolve(__dirname, '/certs/privkey.pem'),
      path.join(process.cwd(), 'certs/privkey.pem'),
      path.join(process.cwd(), '/certs/privkey.pem'),
      path.resolve(process.cwd(), 'certs/privkey.pem'),
      path.resolve(process.cwd(), '/certs/privkey.pem'),
    ]
    for (var c of checks) {
      console.log(`${c}: ${fs.existsSync(c)}`)
    }
    return dev
      ? {}
      : {
          key: fs.readFileSync(path.resolve(__dirname, 'certs/privkey.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem')),
          ca: fs.readFileSync(path.resolve(__dirname, 'certs/fullchain.pem')),
        }
  } catch (e) {
    console.error(e)
    return {}
  }
}
app.prepare().then(() => {
  const serverOptions = getServerOptions()
  createServer(serverOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    const { pathname, query } = parsedUrl
    if (pathname == '/.well-known/acme-challenge/ln3ocgHJTO9ArpgN-T4pnXx3_rnobI4FKQfh9kGWaX4') {
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('ln3ocgHJTO9ArpgN-T4pnXx3_rnobI4FKQfh9kGWaX4.pmAAB-Bu06aZDsrEaDfmvRR3aC9r3VP_pw-Jbu5zing')
    } else handle(req, res, parsedUrl)
  }).listen(3000, err => {
    if (err) throw err
    console.log('> Server started on https://localhost:3000')
  })
})
