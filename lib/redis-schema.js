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

  async exists (recordId) {
    return this.conn.exists(this.recordKey(recordId))
  }

  async create (attributes) {
    const attrs = { ...attributes }
    const { primaryKey } = this.schema

    // Check given id uniqueness
    if (attrs[primaryKey]) {
      const id = attrs[primaryKey]
      const exists = await this.exists(id)

      if (exists) {
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

  async find (criteria) {
    const {
      where,
      select = this.attrKeys
    } = criteria

    const ids = await parseQuery(this.conn, this.schema, this.indexes, where)
    const keys = ids.map((id) => this.recordKey(id))

    const results = await this.conn
      .pipeline(keys.map((k) => ['hmget', k, ...select]))
      .exec()

    const records = results.map(([, values]) => {
      const result = values.reduce((result, value, index) => {
        result[select[index]] = value
        return result
      }, {})

      return parseResult(this.schema.definition, result)
    })

    return records
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
