const mapObj = require('map-obj')
const { parseValue } = require('./attributes')

module.exports = (attributes, result) => mapObj(result, (key, value) => {
  const def = attributes[key]
  return [key, parseValue(def.type, value, def.required === true)]
})
