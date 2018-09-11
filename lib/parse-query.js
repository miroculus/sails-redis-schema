const { getIndexKey } = require('./key-getters')

const isObject = (val) => typeof val === 'object' && val !== null

const isValidType = (model, attr, value) => {
  const definition = model.definition[attr]

  if (!definition) {
    throw new Error(`Invalid attribute ${attr}.`)
  }

  if (definition.type !== 'number' && definition.type !== 'string') {
    throw new Error('Model attributes can only be of type "number" or "string"')
  }

  // eslint-disable-next-line valid-typeof
  return typeof value === definition.type
}

/**
 * Return an array of ids for the given query object
 */
module.exports = async (manager, model, indexes, query) => {
  const { primaryKey, tableName } = model

  const queryKeys = Object.keys(query)

  if (queryKeys.length === 0) {
    throw new Error('You must provide at least one attribute to filter results.')
  }

  if (queryKeys.length > 1) {
    throw new Error('Cannot find a record on redis using multiple attributes.')
  }

  const attr = queryKeys[0]
  const value = query[attr]

  if (attr !== primaryKey && !indexes.includes(attr)) {
    throw new Error(`The attribute ${attr} is not indexed, you can't find records using this attribute.`)
  }

  if (isObject(value) && value.hasOwnProperty('in')) {
    const values = value.in

    if (attr === primaryKey) return values

    if (!values.every((val) => isValidType(model, attr, val))) {
      throw new Error(`Invalid type value on '${values}' for attribute query '${attr}'`)
    }

    console.log('---->', values)

    const indexKeys = values.map((val) => getIndexKey(tableName, attr, val))

    return manager.sunion(...indexKeys)
  }

  if (!isValidType(model, attr, value)) {
    throw new Error(`Invalid type value '${value}' for attribute query '${attr}'`)
  }

  if (attr === primaryKey) return [value]

  return manager.smembers(getIndexKey(tableName, attr, value))
}
