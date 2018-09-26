const shortid = require('shortid')
const intersection = require('lodash.intersection')
const { getIndexKey, getRecordKey } = require('./key-getters')
const parseQuery = require('./parse-query')
const deleteKeys = require('./delete-keys')
const {
  validateType,
  serializeRecord,
  unserializeRecord
} = require('./serializer')

module.exports = class RedisSchema {
  constructor (schema, connection) {
    this.conn = connection
    this.schema = schema
    this.attrKeys = Object.keys(this.schema.definition)

    const indexes = []

    Object.values(schema.definition).forEach((attr) => {
      // do not validate/index plural associations types
      if (attr.collection) return

      if (attr.allowNull) {
        throw new Error('sails-redis-schema adapter is not compatible with "allowNull: true" option.')
      }

      validateType(attr.type)

      // Index attributes that have { meta: { index: true } },
      // or associated values
      if (
        (attr.meta && attr.meta.index === true) ||
        attr.model
      ) {
        indexes.push(attr.columnName)
      }
    })

    this.indexes = indexes
  }

  recordKey (recordId) {
    return getRecordKey(this.schema.tableName, recordId)
  }

  indexKey (attrName, attrValue) {
    return getIndexKey(this.schema.tableName, attrName, attrValue)
  }

  async fetchIds (where) {
    return parseQuery(
      this.conn,
      this.schema,
      this.indexes,
      where
    )
  }

  async findByIds (ids, select = this.attrKeys) {
    if (!Array.isArray(ids)) {
      throw new Error('Invalid query value given.')
    }

    if (ids.length === 0) return []

    const keys = ids.map((id) => this.recordKey(id))
    const { primaryKey } = this.schema

    const results = await this.conn
      .pipeline(keys.map((k) => ['hmget', k, primaryKey, ...select]))
      .exec()

    const records = []

    results.forEach(([, values]) => {
      const [primaryKey, ...vals] = values

      // item not found
      if (primaryKey === null) return

      // Array to object
      const result = vals.reduce((result, value, index) => {
        result[select[index]] = value
        return result
      }, {})

      // parse result
      const record = unserializeRecord(this.schema.definition, result)

      records.push(record)
    })

    return records
  }

  async count (ids) {
    const keys = Array.isArray(ids)
      ? ids.map((id) => this.recordKey(id))
      : this.recordKey(ids)

    return this.conn.exists(...keys)
  }

  async create (attributes) {
    const attrs = { ...attributes }
    const { primaryKey } = this.schema

    // Check given id uniqueness
    if (attrs[primaryKey]) {
      const id = attrs[primaryKey]
      const count = await this.count(id)

      if (count > 0) {
        const err = new Error(`Already exists a record with "${primaryKey}"="${id}" on ${this.schema.tableName}`)
        err.code = 'E_UNIQUE'
        throw err
      }
    } else {
      // If no id is given, create one using `shortid`
      attrs[primaryKey] = shortid.generate()
    }

    const id = attrs[primaryKey]
    const record = serializeRecord(this.schema.definition, attrs)

    const cmd = this.conn.multi()

    // Create record on redis
    cmd.hmset(this.recordKey(id), record)

    // Create the necessary indexes
    this.indexes.forEach((attrName) => {
      if (!record.hasOwnProperty(attrName)) return
      const key = this.indexKey(attrName, record[attrName])
      cmd.sadd(key, id)
    })

    await cmd.exec()

    return unserializeRecord(this.schema.definition, record)
  }

  async updateByIds (ids, valuesToSet) {
    const { primaryKey } = this.schema

    if (valuesToSet.hasOwnProperty(primaryKey)) {
      throw new Error(`The primary key "${primaryKey}" cannot be cahnged.`)
    }

    const records = await this.findByIds(ids)

    if (records.length === 0) return

    const attrs = serializeRecord(this.schema.definition, valuesToSet)
    const changes = Object.entries(attrs)

    const keysTodelete = []
    Object.entries(valuesToSet).forEach(([attrName, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === ''
      ) keysTodelete.push(attrName)
    })

    const indexesDeletions = intersection(this.indexes, keysTodelete)

    const pipeline = this.conn.pipeline()

    const transactions = records.map((doc) => {
      const id = doc[primaryKey]
      const record = serializeRecord(this.schema.definition, doc)

      const cmd = pipeline.multi()

      // Update attributes
      if (changes.length > 0) {
        cmd.hmset(this.recordKey(id), attrs)
      }

      // Delete fields
      if (keysTodelete.length > 0) {
        cmd.hdel(this.recordKey(id), ...keysTodelete)
      }

      // Delete indexes of deleted keys
      indexesDeletions.forEach((attrName) => {
        const attrValue = record[attrName]
        cmd.srem(this.indexKey(attrName, attrValue), id)
      })

      // Update indexes of changed values
      changes.forEach(([attrName, newValue]) => {
        const oldValue = record[attrName]
        if (oldValue === newValue) return

        // Only delete index if it was already created
        if (record.hasOwnProperty(attrName)) {
          cmd.srem(this.indexKey(attrName, oldValue), id)
        }

        // Create the new index
        cmd.sadd(this.indexKey(attrName, newValue), id)
      })

      return cmd.exec()
    })

    pipeline.exec()

    await Promise.all(transactions)
  }

  async destroyByIds (ids) {
    const { primaryKey } = this.schema

    const records = await this.findByIds(ids)

    const pipeline = this.conn.pipeline()

    const transactions = records.map((doc) => {
      const record = serializeRecord(this.schema.definition, doc)
      const cmd = this.conn.multi()
      const id = record[primaryKey]

      cmd.del(this.recordKey(id))

      this.indexes.forEach((attrName) => {
        if (!record.hasOwnProperty(attrName)) return
        const key = this.indexKey(attrName, record[attrName])
        cmd.srem(key, id)
      })

      return cmd.exec()
    })

    pipeline.exec()

    await Promise.all(transactions)

    return records
  }

  async find (criteria) {
    const { where, select } = criteria
    const ids = await this.fetchIds(where)
    return this.findByIds(ids, select)
  }

  async drop () {
    return Promise.all([
      deleteKeys(this.conn, this.recordKey()),
      deleteKeys(this.conn, this.indexKey())
    ])
  }
}
