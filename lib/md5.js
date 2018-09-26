const crypto = require('crypto')

module.exports = (str) => {
  if (typeof str !== 'string') {
    throw new Error('Only string values can be hashed')
  }

  return crypto.createHash('md5')
    .update(str)
    .digest('hex')
}
