const mapObj = require('map-obj')

module.exports = (attributes, result) => mapObj(result, (key, value) => {
  const def = attributes[key]

  if (def.type === 'number') {
    return [key, Number.parseInt(value)]
  }

  return [key, value]
})
