const crypto = require('crypto')

const isValidValue = (val) => {
  if (val === null) return true
  const type = typeof val
  if (type === 'number') return Number.isFinite(val)
  return type === 'string'
}

module.exports = (str = null) => {
  if (!isValidValue(str)) throw new Error('Invalid value.')
  return crypto.createHash('md5')
    .update(JSON.stringify(str))
    .digest('hex')
}
