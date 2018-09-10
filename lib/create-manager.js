const Redis = require('ioredis')

module.exports = (options) => new Promise((resolve, reject) => {
  const manager = options.url
    ? new Redis(options.url, options)
    : new Redis(options)

  const readyEvent = options.enableReadyCheck === false
    ? 'connect'
    : 'ready'

  const onReady = () => {
    manager.removeListener('error', onError)
    resolve(manager)
  }

  const onError = (err) => {
    manager.removeListener(readyEvent, onReady)
    reject(err)
  }

  manager.once(readyEvent, onReady)
  manager.once('error', onError)
})
