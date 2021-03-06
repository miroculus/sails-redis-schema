const { getIndexKey } = require('./key-getters')
const { serializeValue } = require('./serializer')

const isObject = (val) => typeof val === 'object' && val !== null

/**
 * Return an array of ids for the given query object
 */
const parseQuery = async (conn, schema, indexes, query) => {
  const { primaryKey, tableName, definition } = schema

  if (!isObject(query)) {
    throw new Error(`Invalid query value '${query}'.`)
  }

  const queryKeys = Object.keys(query)

  if (queryKeys.length === 0) {
    throw new Error('You must provide at least one attribute to filter results.')
  }

  if (queryKeys.length > 1) {
    throw new Error('Cannot find a record on redis using multiple attributes.')
  }

  // Used for one-to-one .populate()
  if (query.hasOwnProperty('and')) {
    if (!Array.isArray(query.and) || query.and.length > 1) {
      throw new Error(`Invalid query '${JSON.stringify(query)}'.`)
    }

    return parseQuery(conn, schema, indexes, query.and[0])
  }

  const attr = queryKeys[0]
  const def = definition[attr]
  const value = query[attr]

  if (!def) {
    throw new Error(`Invalid query '${JSON.stringify(query)}' for finding '${tableName}'.`)
  }

  if (attr !== primaryKey && !indexes.includes(attr)) {
    throw new Error(`The attribute ${attr} is not indexed, you can't find records using this attribute.`)
  }

  if (isObject(value) && value.hasOwnProperty('in')) {
    const values = value.in

    if (attr === primaryKey) return values

    const indexKeys = values.map((val) => {
      const serialized = serializeValue(def.type, val, def.required === true)
      return getIndexKey(tableName, attr, serialized)
    })

    return conn.sunion(...indexKeys)
  }

  const serialized = serializeValue(def.type, value, def.required === true)

  if (attr === primaryKey) return [value]

  return conn.smembers(getIndexKey(tableName, attr, serialized))
}

module.exports = parseQuery
