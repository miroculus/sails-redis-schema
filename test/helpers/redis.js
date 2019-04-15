const md5 = require('../../lib/md5')
const UserSchema = require('../models/User')
const { serializeValue } = require('../../lib/serializer')

exports.indexExists = async (Schema, manager, key, value, id) => {
  const { type, required, columnName } = Schema.attributes[key]
  const val = md5(serializeValue(type, value, required))
  const result = await manager.sismember(`${Schema.identity}.index:${columnName || key}:${val}`, id)
  return result === 1
}

exports.userIndexExists = (manager, doc, key) => {
  const id = doc[UserSchema.primaryKey]
  const value = doc[key]
  return exports.indexExists(UserSchema, manager, key, value, id)
}

exports.checkIndexes = async (Schema, manager, doc) => {
  const id = doc[Schema.primaryKey]
  const keys = Object.keys(Schema.attributes)
    .filter((key) => !!Schema.attributes[key].type)

  await Promise.all(keys.map(async (key) => {
    const attr = Schema.attributes[key]
    const shouldIndex = !!(attr.meta && attr.meta.index)

    const value = doc[key]

    if (value === undefined) return

    const indexed = await exports.indexExists(Schema, manager, key, value, id)

    if (indexed === shouldIndex) return

    if (shouldIndex) {
      throw new Error(`Missing index for model "${Schema.identity}" on key "${key}" with value "${value}"`)
    } else if (indexed !== shouldIndex) {
      throw new Error(`Index should not exist for model "${Schema.identity}" on key "${key}"`)
    }
  }))
}

exports.checkUserIndexes = (manager, doc) =>
  exports.checkIndexes(UserSchema, manager, doc)
