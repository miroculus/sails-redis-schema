const md5 = require('../../lib/md5')
const User = require('../models/User')
const { serializeValue } = require('../../lib/serializer')

exports.indexExists = async (Model, manager, key, value, id) => {
  const { type, required } = Model.attributes[key]
  const val = md5(serializeValue(type, value, required))
  const result = await manager.sismember(`${Model.identity}.index:${key}:${val}`, id)
  return result === 1
}

exports.userIndexExists = (manager, doc, key) => {
  const id = doc[User.primaryKey]
  const value = doc[key]
  return exports.indexExists(User, manager, key, value, id)
}
