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

    // Index attributes that have { meta: { index: true } }
    Object.values(schema.definition).forEach((attr) => {
      if (!attr.meta || attr.meta.index !== true) return
      validateType(attr.type)
      indexes.push(attr.columnName)
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
      attrs[primaryKey] = shortid.generate()
    }

    const id = attrs[primaryKey]
    const record = serializeRecord(this.schema.definition, attrs)

    // Create a redis transaction pipeline
    const cmd = this.conn.multi()

    // Create record on redis
    cmd.hmset(this.recordKey(id), record)

    // Create the necessary indexes
    this.indexes.forEach((attrName) => {
      const key = this.indexKey(attrName, record[attrName])
      cmd.sadd(key, id)
    })

    // Execute transaction
    await cmd.exec()

    return attrs
  }

  async updateByIds (ids, changes) {
    if (changes.hasOwnProperty(this.schema.primaryKey)) {
      throw new Error(`The primary key "${this.schema.primaryKey}" cannot be cahnged.`)
    }

    const attrs = serializeRecord(this.schema.definition, changes)
    const entries = Object.entries(attrs)

    const records = await this.findByIds(ids)

    const updates = new Map(entries.filter(([, value]) => value !== 'null'))
    const indexesUpdates = intersection(this.indexes, updates.keys())

    const deletions = entries
      .filter(([, value]) => value === 'null')
      .map(([attr]) => attr)
    const indexesDeletions = intersection(this.indexes, deletions)

    const pipeline = this.conn.pipeline()

    const transactions = records.map((record) => {
      const cmd = pipeline.multi()

      // Delete fields
      if (deletions.length > 0) {
        cmd.hdel(this.recordKey(record.id), ...deletions)
      }

      // Delete indexes
      indexesDeletions.forEach((attrName) => {
        const attrValue = record[attrName]
        cmd.srem(this.indexKey(attrName, attrValue), record.id)
      })

      // Update attributes
      if (updates.size > 0) {
        cmd.hmset(this.recordKey(record.id), updates)
      }

      // Update indexes
      indexesUpdates.forEach((attrName) => {
        const key = this.indexKey(attrName, updates.get(attrName))
        cmd.sadd(key, record.id)
      })

      return cmd.exec()
    })

    pipeline.exec()

    await Promise.all(transactions)
  }

  async destroyByIds (ids) {
    const cmd = this.conn.multi()

    ids.forEach((id) => {
      cmd.del(this.recordKey(id))
    })

    this.indexes.forEach((attrName) => {
      cmd.srem(this.indexKey(attrName), ...ids)
    })

    await cmd.exec()
  }

  async find (criteria) {
    const { where, select } = criteria
    const ids = await this.fetchIds(where)
    return this.findByIds(ids, select)
  }

  async drop () {
    const deleteIndexes = Promise.all(
      this.indexes.map(
        (attrName) => this.conn.del(this.indexKey(attrName))
      )
    )

    return Promise.all([
      deleteKeys(this.conn, this.recordKey()),
      deleteIndexes
    ])
  }
}
