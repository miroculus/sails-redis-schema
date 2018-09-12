const allowedTypes = [
  'boolean',
  'number',
  'string'
]

exports.validateType = (type) => {
  if (allowedTypes.includes(type)) return true
  throw new Error(`Invalid type, only "${allowedTypes.join('", "')}" can be used.`)
}

exports.validateValue = (val, required = false) => {
  if (required === false && val === null) return true
  const type = typeof val

  exports.validateType(type)

  if (type === 'number') {
    if (Number.isFinite(val)) return true
  } else {
    return true
  }

  throw new Error(`Invalid value, only "${allowedTypes.join('", "')}" types can be used.`)
}

exports.parseValue = (type, val, required = false) => {
  if (val === 'null' || val === undefined) {
    if (required === false) return null
    throw new Error(`Invalid empty value, expected a ${type} type.`)
  }

  switch (type) {
    case 'number':
      const result = Number.parseFloat(val)
      if (Number.isNaN(result)) throw new Error(`Invalid value "${val}", expected a number.`)
      return result
    case 'boolean':
      if (val === 'true') return true
      if (val === 'false') return false
      throw new Error(`Invalid value "${val}", expected a boolean.`)
    case 'string':
      if (typeof val === 'string') return val
      throw new Error(`Invalid value "${val}", expected a string.`)
    default:
      throw new Error(`Invalid value "${val}" for type "${type}"`)
  }
}
