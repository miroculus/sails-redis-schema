const stringify = require('fast-json-stable-stringify')

const allowedTypes = [
  'boolean',
  'json',
  'number',
  'string'
]

exports.validateType = (type) => {
  if (allowedTypes.includes(type)) return true
  throw new Error(`Invalid type, only "${allowedTypes.join('", "')}" can be used.`)
}

exports.serializeValue = (type, val, required = false) => {
  if (val === null) {
    if (required === false) return 'null'
    throw new Error(`Invalid empty value, expected a ${type} type.`)
  }

  switch (type) {
    case 'string':
      return val
    case 'boolean':
    case 'number':
    case 'json':
      if (val === '') {
        if (required === false) return 'null'
        throw new Error(`Invalid value "${val}" for type "${type}"`)
      }

      return stringify(val)
    default:
      throw new Error(`Invalid value "${val}" for type "${type}"`)
  }
}

exports.unserializeValue = (type, val, required = false) => {
  if (val === 'null' || val === null) {
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
    case 'json':
      if (val === '') {
        if (required === false) return null
        throw new Error(`Invalid value "${val}" for type "${type}"`)
      }

      return JSON.parse(val)
    default:
      throw new Error(`Invalid value "${val}" for type "${type}"`)
  }
}

const mapRecord = (mapper, attributes, record) => {
  const result = {}

  for (let [key, value] of Object.entries(record)) {
    if (!attributes.hasOwnProperty(key)) {
      throw new Error(`The key ${key} found on a record is not present on model definition.`)
    }

    const attr = attributes[key]

    // Plural association attributes doesn't have to be saved with the record
    if (attr.hasOwnProperty('collection')) continue

    const val = mapper(attr.type, value, attr.required === true)

    if (val !== null || attr.allowNull === true) {
      result[key] = val
    }
  }

  return result
}

exports.serializeRecord = (attributes, record) =>
  mapRecord(exports.serializeValue, attributes, record)

exports.unserializeRecord = (attributes, record) =>
  mapRecord(exports.unserializeValue, attributes, record)
