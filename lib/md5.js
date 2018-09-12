const crypto = require('crypto')
const { validateValue } = require('./attributes')

module.exports = (str = null) => {
  validateValue(str)
  return crypto.createHash('md5')
    .update(JSON.stringify(str))
    .digest('hex')
}
