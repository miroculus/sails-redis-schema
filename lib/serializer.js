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
  if (val === undefined) {
    throw new Error('An "undefined" value cannot be serialized.')
  }

  if (val === 'null' || val === null) {
    if (required === false) return null
    throw new Error(`Invalid empty value, expected a ${type} type.`)
  }

  switch (type) {
    case 'string':
      return val
    case 'boolean':
    case 'number':
    case 'json':
      if (val === '') {
        if (required === false) return null
        throw new Error(`Invalid value "${val}" for type "${type}"`)
      }

      return stringify(val)
    default:
      throw new Error(`Invalid value "${val}" for type "${type}"`)
  }
}

exports.unserializeValue = (type, val, required = false) => {
  if (val === undefined) {
    throw new Error('An "undefined" value cannot be unserialized.')
  }

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
      if (required === false && val === '') return null
      if (typeof val === 'string' && val !== '') return val
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

exports.serializeRecord = (attributes, record) => {
  const result = {}
  const attrs = Object.entries(attributes)

  for (let [key, value] of Object.entries(record)) {
    const attrEntry = attrs
      .find(([name, attr]) => key === name || key === attr.columnName)

    if (!attrEntry) {
      throw new Error(`The key ${key} found on a record is not present on model definition.`)
    }

    const [attrKey, attr] = attrEntry

    // Plural association attributes doesn't have to be saved with the record
    if (attr.hasOwnProperty('collection')) continue

    const columnName = attr.hasOwnProperty('columnName') ? attr.columnName : attrKey

    const val = exports.serializeValue(attr.type, value, attr.required === true)

    if (val !== null) result[columnName] = val
  }

  return result
}

exports.unserializeRecord = (attributes, record) => {
  const result = {}
  const attrs = Object.entries(attributes)

  for (let [key, value] of Object.entries(record)) {
    const attrEntry = attrs
      .find(([name, attr]) => key === name || key === attr.columnName)

    if (!attrEntry) {
      throw new Error(`The key ${key} found on a record is not present on model definition.`)
    }

    const [attrKey, attr] = attrEntry

    // Plural association attributes doesn't have to be saved with the record
    if (attr.hasOwnProperty('collection')) continue

    const val = exports.unserializeValue(attr.type, value, attr.required === true)

    if (val !== null) result[attrKey] = val
  }

  return result
}
