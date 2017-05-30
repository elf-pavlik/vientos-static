const fs = require('fs')
const http2 = require('http2')
const sslConfig = require('ssl-config')('modern')
const Path = require('path')
const Hapi = require('hapi')
const Inert = require('inert')

const PORT = process.env.PWA_PORT || 8080
const PWA_DIRNAME = process.env.PWA_DIRNAME || 'vientos-pwa'

const httpServerOptions = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH),
  ciphers: sslConfig.ciphers,
  honorCipherOrder: true,
  secureOptions: sslConfig.minimumTLSVersion
}

const server = new Hapi.Server({
  connections: {
    routes: {
      files: {
        relativeTo: Path.join(__dirname, PWA_DIRNAME)
      }
    }
  }
})

const connectionOptions = {
  port: PORT,
  routes: {
    security: {
      preload: true
    }
  }
}
if (httpServerOptions.key && httpServerOptions.cert) {
  connectionOptions.listener = http2.createServer(httpServerOptions)
}
server.connection(connectionOptions)

server.register(Inert, () => {})

server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: '.',
      redirectToSlash: true,
      index: true
    }
  }
})

server.ext('onPostHandler', function (request, reply) {
  const response = request.response
  if (response.isBoom &&
        response.output.statusCode === 404) {
    return reply.file('index.html')
  }

  return reply.continue()
})

server.start((err) => {
  if (err) {
    throw err
  }

  console.log('Server running at:', server.info.uri)
})
