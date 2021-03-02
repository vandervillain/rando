const { createServer } = require('https')
const path = require ('path')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const options = () => {
  let httpsOptions = {}
  try {
    httpsOptions = {
      key: fs.readFileSync(path.join(__dirname, '/ssl/privkey.pem')),
      cert: fs.readFileSync(path.join(__dirname, '/ssl/cert.pem'))
    }
  }
  catch (e) {
    console.error(e)
  }
  return httpsOptions
}
// const httpsOptions = {
//   key: fs.readFileSync(path.join(__dirname, '/ssl/privkey.pem')),
//   cert: fs.readFileSync(path.join(__dirname, '/ssl/cert.pem'))
// }
app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
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
