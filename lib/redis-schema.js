const shortid = require('shortid')
const { getIndexKey, getRecordKey } = require('./key-getters')
const parseQuery = require('./parse-query')
const parseResult = require('./parse-result')
const deleteKeys = require('./delete-keys')

module.exports = class RedisSchema {
  constructor (schema, connection) {
    this.conn = connection
    this.schema = schema
    this.attrKeys = Object.keys(this.schema.definition)

    const indexes = []

    // Index attributes that have { meta: { index: true } }
    Object.values(schema.definition).forEach((attr) => {
      if (!attr.meta || attr.meta.index !== true) return

      if (attr.type !== 'number' && attr.type !== 'string') {
        throw new Error('Only attributes with type "number" or "string" can be indexed.')
      }

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

  async count (recordId) {
    const keys = Array.isArray(recordId)
      ? recordId.map((id) => this.recordKey(id))
      : this.recordKey(recordId)

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

    // Create a redis transaction pipeline
    const cmd = this.conn.multi()

    // Create record on redis
    cmd.hmset(this.recordKey(id), attrs)

    // Create the necessary indexes
    this.indexes.forEach((attrName) => {
      const key = this.indexKey(attrName, attrs[attrName])
      cmd.sadd(key, id)
    })

    // Execute transaction
    await cmd.exec()

    return attrs
  }

  async fetchIds (where) {
    return parseQuery(this.conn, this.schema, this.indexes, where)
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

      const result = vals.reduce((result, value, index) => {
        result[select[index]] = value
        return result
      }, {})

      records.push(parseResult(this.schema.definition, result))
    })

    return records
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
