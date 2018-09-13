const crypto = require('crypto')
const stringify = require('fast-json-stable-stringify')

module.exports = (str = null) => crypto.createHash('md5')
  .update(stringify(str))
  .digest('hex')
